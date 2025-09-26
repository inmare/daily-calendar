// 곡 타입
type Song = {
  id: number;
  title: string;
  pvUrl: string;
  pvService: string;
  thumbUrl: string;
  publishDate: string;
  rating: number;
};

// 날짜별 곡 리스트 타입
type SongList = {
  id: number;
  month: number;
  date: number;
  songs: Song[];
};

export type { Song, SongList };
