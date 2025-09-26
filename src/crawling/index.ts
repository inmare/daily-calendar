import * as cheerio from "cheerio";
import puppeteer from "puppeteer";
import sound from "sound-play";
import chalk from "chalk";
import path from "path";

import Database from "./database";
import { type TableInfo } from "../types/crawling";

// 디버깅 모드
const DEBUG = false;

const DB_PATH = path.join(process.cwd(), "src/data/db.json");

const DEFAULT_DOMAIN = "https://vocadb.net";
const DEFAULT_URL = new URL(DEFAULT_DOMAIN);
DEFAULT_URL.pathname = "/Search"; // 검색 페이지
DEFAULT_URL.searchParams.set("searchType", "Song"); // 곡 검색
DEFAULT_URL.searchParams.set("minScore", "130"); // 최소 점수 130
DEFAULT_URL.searchParams.set("songType", "Original"); // 오리지널 곡

const PARAM = {
  month: "dateMonth",
  year: "dateYear",
};

const SONG_API_PREFIX = "/api/songs/";
const START_YEAR = 2007; // 2007
const END_YEAR = 2025; // 2025

(async () => {
  // create lowdb instance
  const database = new Database(DB_PATH);
  await database.init();

  const debugSetting = {
    headless: false,
    slowmo: 250,
  };
  const setting = DEBUG ? debugSetting : {};
  const browser = await puppeteer.launch(setting);
  const page = await browser.newPage();

  // 연도별로 찾는 이유: vocaDB의 날짜 검색기능이 제대로 고장남!!!
  // 임시 날짜 설정
  for (let year = START_YEAR; year <= END_YEAR; year++) {
    const startUrl = new URL(DEFAULT_URL);
    startUrl.searchParams.set(PARAM.year, String(year));

    console.log("Go to year", chalk.magenta(year));
    console.log("URL:", chalk.gray(startUrl.toString()));
    await page.goto(startUrl.toString(), {
      waitUntil: "networkidle0",
      timeout: 60_000,
    });

    // 페이지를 순회하면서 데이터 가져오기
    let currentPage = 1;

    while (true) {
      // table을 기다리기
      const pageString = chalk.blue(`Processing page ${currentPage}...`);
      console.log(pageString);
      await page.waitForSelector(".table");

      const content = await page.content();
      const $ = cheerio.load(content);

      // 테이블에서 링크 파싱
      const tableInfo = parseLinkFromTable($);

      // 링크에서 데이터 가져오기 및 db에 추가
      for (const info of tableInfo) {
        try {
          const data = await database.getVocaDB(info);
          if (data) {
            database.add(data);
          }
        } catch (error) {
          console.log("Failed to get data for", info.toString());
          console.error(error);
        }
      }

      // 다음 페이지가 없으면 종료
      const isEndOfPage = checkEndOfPage($);

      if (isEndOfPage) {
        console.log("End of pages");
        break;
      }

      // 사이트의 부하를 피하기 위해서 2초동안 쉬기
      console.log(chalk.gray("Waiting for 2 seconds..."));
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 페이지 로드 대기
      const newURL = new URL(startUrl);
      newURL.searchParams.set("page", String(++currentPage));
      await page.goto(newURL.toString(), {
        waitUntil: "networkidle0",
        timeout: 60_000,
      });
    }
  }

  await browser.close();
  console.log(chalk.blue("Crawling finished!"));

  const filePath = path.join(__dirname, "Miku Ringtone.mp3");
  await sound.play(filePath, 100);
})();

function parseLinkFromTable($: cheerio.CheerioAPI): TableInfo[] {
  console.log("Parsing table...");
  const table = $(".table");
  const rows = table.find("tbody > tr");

  const links: TableInfo[] = [];

  rows.each((_index, element) => {
    const a = $(element).find("td:nth-child(2) > a");
    const rating = parseInt($(element).find("td:nth-child(3)").text().trim());
    const link = a.attr("href");
    const title = a.text().trim();
    // console.log(title, link);

    // id에서 vocadb 정보 얻기
    const id = link?.split("/").pop();
    const apiLink = `${DEFAULT_DOMAIN}${SONG_API_PREFIX}${id}`;
    const url = new URL(apiLink);
    url.searchParams.set("fields", "PVs");
    links.push({ url, rating });
  });

  return links;
}

function checkEndOfPage($: cheerio.CheerioAPI) {
  console.log("Checking if end of page...");
  // Next 버튼 찾기
  const nextButton = $(".pagination li:nth-last-child(2)");
  const isDisabled = nextButton.hasClass("disabled");
  return isDisabled;
}
