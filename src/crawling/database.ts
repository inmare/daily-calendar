import { JSONFilePreset } from "lowdb/node";
import { Low } from "lowdb";
import dayjs from "dayjs";
import chalk from "chalk";

import { TableInfo, VocaResponse, PVs } from "../types/crawling";
import { SongList, Song } from "../types/database";

export default class Database {
  private db: Low<SongList[]> | null = null;
  constructor(public dbPath: string) {}

  /**
   * db.json 초기화 (2026년 1월 1일부터 12월 31일까지의 빈 데이터 생성)
   */
  async init() {
    this.db = await JSONFilePreset<SongList[]>(this.dbPath, []);
    console.log("Database path:", chalk.gray(this.dbPath));

    if (this.db.data.length !== 0) {
      console.log(chalk.yellow("Database already initialized, skipping..."));
      return;
    }

    console.log(chalk.green("Initializing database..."));

    // db가 비어있을 때만 초기화 진행
    await this.db.update((data) => {
      const startDate = dayjs("2026-01-01");
      let currentDate = dayjs(startDate);

      // 2026년의 모든 날짜에 대해서 추가하기
      while (currentDate.year() < 2027) {
        const offsetDay = currentDate.diff(startDate, "day");
        const id = offsetDay + 1;
        const month = currentDate.month() + 1;
        const date = currentDate.date();

        const emptyList: SongList = {
          id,
          month,
          date,
          songs: [],
        };

        data.push(emptyList);

        currentDate = currentDate.add(1, "day");
      }
    });
  }

  /**
   * 데이터베이스에 곡 추가
   * @param song 추가할 곡 정보
   */
  async add(song: Song) {
    if (!this.db) throw new Error("Database not initialized");

    await this.db.update((data) => {
      // 업로드일과 일치하는 항목 찾기
      const entry = data.find((e) => {
        const publishDate = dayjs(song.publishDate);
        const month = publishDate.month() + 1;
        const date = publishDate.date();
        return e.date === date && e.month === month;
      });

      if (entry) {
        // 리스트에 겹치는 곡이 없으면 추가
        const isSongExists = entry.songs.some((s) => s.id === song.id);
        if (!isSongExists) {
          const index = entry.songs.findIndex((s) => s.rating < song.rating);
          const insertIndex = index === -1 ? entry.songs.length : index;
          entry.songs.splice(insertIndex, 0, song);
        }
      }
    });
  }

  /**
   * VocaDB에서 곡 정보를 가져오기
   * @param tableInfo VocaDB의 곡 api 링크
   * @returns
   */
  async getVocaDB(tableInfo: TableInfo): Promise<Song | null> {
    const url = tableInfo.url;
    const response = await fetch(url);
    if (response.status !== 200) {
      throw new Error(
        `Failed to fetch ${tableInfo.toString()}: ${response.status}`
      );
    }

    const json: VocaResponse = await response.json();
    const id = json.id;
    const title = json.defaultName;
    let publishDate = dayjs(json.publishDate);

    const pvs: PVs[] = json.pvs;
    if (pvs.length === 0) throw new Error("No PVs found");

    // 등록된 날짜랑 pv날짜랑 다른 오류가 있어서 둘을 비교해서 다르면 pv날짜를 우선시함
    let pvId = 0;
    pvs.forEach((pv, index) => {
      if (pv.pvType === "original") {
        const pvPublishDate = dayjs(pv.publishDate);
        const isDateSame = pvPublishDate.isSame(publishDate);
        if (!isDateSame && pvPublishDate.isBefore(publishDate)) {
          pvId = index;
          publishDate = pvPublishDate;
        }
      }
    });

    const pv = pvs[pvId];
    if (!pv) throw new Error("No PVs found");

    const publishDateString = publishDate.format("YYYY-MM-DD");
    const dateString = chalk.cyan(publishDateString);
    const idString = chalk.yellow(String(id).padStart(6, "0"));
    const rating = chalk.yellow(tableInfo.rating);
    console.log(`${dateString} ${idString} ${title} ${rating}`);
    return {
      id,
      title,
      pvUrl: pv.url,
      pvService: pv.service,
      thumbUrl: pv.thumbUrl,
      publishDate: publishDateString,
      rating: tableInfo.rating,
    };
  }
}
