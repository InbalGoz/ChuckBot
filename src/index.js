import "dotenv/config";
import axios from "axios";
import * as cheerio from "cheerio";
import TelegramBot from "node-telegram-bot-api";
import { TranslationServiceClient } from "@google-cloud/translate";
import credentials from "../unique-voyage-405517-1b48d1f47f1e.json" assert { type: "json" };
import ISO6391 from "iso-639-1";

const headers = {
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Encoding": "gzip, deflate, br",
  "Accept-Language": "en-US,en;q=0.5",
  Connection: "keep-alive",
  Cookie:
    "AMCV_0D15148954E6C5100A4C98BC%40AdobeOrg=1176715910%7CMCIDTS%7C19271%7CMCMID%7C80534695734291136713728777212980602826%7CMCAAMLH-1665548058%7C7%7CMCAAMB-1665548058%7C6G1ynYcLPuiQxYZrsz_pkqfLG9yMXBpb2zX5dvJdYQJzPXImdj0y%7CMCOPTOUT-1664950458s%7CNONE%7CMCAID%7CNONE%7CMCSYNCSOP%7C411-19272%7CvVersion%7C5.4.0; s_ecid=MCMID%7C80534695734291136713728777212980602826; __cfruid=37ff2049fc4dcffaab8d008026b166001c67dd49-1664418998; AMCVS_0D15148954E6C5100A4C98BC%40AdobeOrg=1; s_cc=true; __cf_bm=NIDFoL5PTkinis50ohQiCs4q7U4SZJ8oTaTW4kHT0SE-1664943258-0-AVwtneMLLP997IAVfltTqK949EmY349o8RJT7pYSp/oF9lChUSNLohrDRIHsiEB5TwTZ9QL7e9nAH+2vmXzhTtE=; PHPSESSID=ddf49facfda7bcb4656eea122199ea0d",
  "If-Modified-Since": "Tue, 04 May 2021 05:09:49 GMT",
  "If-None-Match": 'W/"12c6a-5c17a16600f6c-gzip"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  TE: "trailers",
  "Upgrade-Insecure-Requests": "1",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:105.0) Gecko/20100101 Firefox/105.0",
};

const url = "https://parade.com/968666/parade/chuck-norris-jokes/";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || "TELEGRAM_BOT_TOKEN";
const projectId = process.env.GOOGLE_PROJECT_ID || "GOOGLE_PROJECT_ID";
const bot = new TelegramBot(TOKEN, { polling: true });

let userLanguageCode = "";

let jokes = [];

const translationClient = new TranslationServiceClient({ credentials });

const fetchJokes = async () => {
  try {
    const { data } = await axios.get(url, { headers });

    const $ = cheerio.load(data);

    const jokeElements = $("div.m-detail--body").find("ol").find("li");

    const jokes = jokeElements.map((index, element) => $(element).text()).get();
    return jokes;
  } catch (error) {
    console.error("Error:", error.message);
    return [];
  }
};

const translateText = async (joke) => {
  try {
    // Translate text using Google Cloud Translation API
    const [response] = await translationClient.translateText({
      parent: translationClient.locationPath(projectId, "global"),
      contents: [joke],
      targetLanguageCode: userLanguageCode,
    });

    // return the translated text
    const translatedText = response.translations[0].translatedText;
    return translatedText;
  } catch (error) {
    console.error("Error translating text:", error.message);
    return "Translation error";
  }
};

(async () => {
  try {
    jokes = await fetchJokes();
  } catch (error) {
    console.error("Error initializing jokes:", error.message);
  }
})();

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(
    chatId,
    "Welcome to ChuckBot, Please choose a language and write - 'set language 'language name''"
  );
});

bot.onText(/set language (.+)/i, (msg, match) => {
  const chatId = msg.chat.id;

  let userLanguageName = match[1].toLowerCase(); // Extract the language from the message and convert to lowercase

  userLanguageCode = ISO6391.getCode(userLanguageName); // Convert the language name to language code

  if (!userLanguageCode) {
    bot.sendMessage(chatId, "Please write the correct language name");
  } else {
    bot.sendMessage(chatId, "No problem. Please choose a number between 1-101");
  }
});

bot.onText(/^\d+$/, async (msg) => {
  const chatId = msg.chat.id;
  if (userLanguageCode !== "") {
    const jokeNumber = parseInt(msg.text);

    if (jokeNumber >= 1 && jokeNumber <= 101) {
      const chuckNorrisjoke = jokes[jokeNumber - 1];

      const joke = await translateText(chuckNorrisjoke);

      await bot.sendMessage(chatId, `${jokeNumber}. ${joke}`);
    } else {
      bot.sendMessage(
        chatId,
        "Invalid number. Please enter a number between 1 and 101."
      );
    }

    await bot.sendMessage(
      chatId,
      "You can start all over again by clicking on '/start', or you can choose another joke by enter a number between 1 and 101."
    );
  } else {
    bot.sendMessage(
      chatId,
      "Please choose a language first and write - 'set language 'language name''"
    );
  }
});
