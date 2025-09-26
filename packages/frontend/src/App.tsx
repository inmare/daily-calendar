import { useEffect, useRef, useState } from "react";
import "./scss/App.scss";
import SongData from "../../common/data/db.json";
import { type Song, type SongList } from "@daily-calendar/common";
import dayjs from "dayjs";
import clsx from "clsx";

function App() {
  const db = useRef<SongList[]>(SongData);
  const month = Array.from({ length: 12 }, (_, i) => i + 1);
  const day = Array.from({ length: 32 }, (_, i) => i); // 0~31

  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [currentMonth, setCurrentMonth] = useState(1);
  const [currentDay, setCurrentDay] = useState(0);
  const [dateString, setDateString] = useState("");

  const checkDayOverMonth = (month: number, day: number): boolean => {
    return day > dayjs(new Date(2026, month, 0)).daysInMonth();
  };

  const getFixedDay = (month: number, day: number) => {
    const isDayOverMonth = checkDayOverMonth(month, day);
    const daysInMonth = dayjs(new Date(2026, month, 0)).daysInMonth();
    const fixedDay = isDayOverMonth ? daysInMonth : day;

    return fixedDay;
  };

  const getSong = (month: number, day: number): Song[] => {
    // day가 0일 때는 전체 반환
    // day가 month에 포함이 안되는 날짜일 때는 해당 월의 마지막 날짜
    // month가 0일 때는 아무것도 반환하지 않음.
    const filteredList: Song[] = [];

    for (const songList of db.current) {
      if (day === 0) {
        if (songList.month === currentMonth) {
          for (const song of songList.songs) {
            filteredList.push(song);
          }
        }
      } else {
        if (songList.month === month && songList.date === day) {
          for (const song of songList.songs) {
            filteredList.push(song);
          }
        }
      }
    }

    return filteredList;
  };

  const makeDateString = (month: number, day: number): string => {
    const monthString = `${month}월`;
    const dayString = day === 0 ? "전체" : `${day}일`;
    return monthString + " " + dayString;
  };

  useEffect(() => {
    const initialSongs = getSong(currentMonth, currentDay);
    const initialDateString = makeDateString(currentMonth, currentDay);
    setSongs(initialSongs);
    setDateString(initialDateString);
  }, []);

  const handleMonthClick = (m: number) => {
    const fixedDay = getFixedDay(m, currentDay);
    console.log(m, fixedDay);

    const filteredList = getSong(m, fixedDay);
    setSongs(filteredList);
    setCurrentMonth(m);
    setCurrentDay(fixedDay);
    const newDateString = makeDateString(m, fixedDay);
    setDateString(newDateString);
    setCurrentSong(null);
  };

  const handleDayClick = (d: number) => {
    console.log(currentMonth, d);
    if (d > dayjs(new Date(2026, currentMonth, 0)).daysInMonth()) {
      return;
    }
    const filteredList = getSong(currentMonth, d);
    setSongs(filteredList);
    setCurrentDay(d);
    const newDateString = makeDateString(currentMonth, d);
    setDateString(newDateString);
    setCurrentSong(null);
  };

  const handleCurrentSong = (id: number) => {
    const selectedSong = songs.find((song) => song.id === id) || null;
    setCurrentSong(selectedSong);
  };

  return (
    <>
      <div className="wrapper">
        <div className="menu-wrapper">
          <div className="dropdown-wrapper">
            <p className="dropdown-label">월</p>
            <div className="dropdown">
              {month.map((m) => {
                return (
                  <div
                    className={clsx("dropdown-item", {
                      "item-clicked": m === currentMonth,
                    })}
                    key={m}
                    onClick={() => {
                      handleMonthClick(m);
                    }}
                  >
                    {m}월
                  </div>
                );
              })}
            </div>
          </div>
          <div className="dropdown-wrapper">
            <p className="dropdown-label">일</p>
            <div className="dropdown">
              {day.map((d) => {
                return (
                  <div
                    className={clsx("dropdown-item", {
                      "item-clicked": d === currentDay,
                      "item-disabled": checkDayOverMonth(currentMonth, d),
                    })}
                    key={d}
                    onClick={() => {
                      handleDayClick(d);
                    }}
                  >
                    {d === 0 ? "전체" : `${d}일`}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="date-info">
          <p className="date-string">
            <span>{dateString}</span>의 보카로 곡
          </p>
        </div>
        <div className="song-list">
          {songs.map((song: Song) => (
            <p
              key={song.id}
              className={clsx("song-title", {
                selected: currentSong && currentSong.id === song.id,
              })}
              onClick={() => handleCurrentSong(song.id)}
            >
              {song.title}
            </p>
          ))}
        </div>
        <div className="song-info-wrapper">
          <p className="song-info-label">곡 정보</p>
          <div className="song-info">
            <div
              style={{
                backgroundImage: `url(${
                  currentSong ? currentSong.thumbUrl : ""
                })`,
              }}
              className="thumbnail"
            ></div>
            <div>
              <table>
                <tbody>
                  <tr>
                    <th>제목</th>
                    <td>{currentSong ? currentSong.title : ""}</td>
                  </tr>
                  <tr>
                    <th>발매일</th>
                    <td>{currentSong ? currentSong.publishDate : ""}</td>
                  </tr>
                  <tr>
                    <th>PV</th>
                    <td>
                      <a href={currentSong ? currentSong.pvUrl : ""}>
                        {currentSong ? currentSong.pvUrl : ""}
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <th>평점</th>
                    <td>{currentSong ? currentSong.rating : ""}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
