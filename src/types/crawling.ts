// PV의 응답 타입
type PVs = {
  url: string;
  pvType: string;
  pvId: string;
  publishDate: string;
  thumbUrl: string;
} & Record<string, any>;

// VocaDB의 Response 타입
type VocaResponse = {
  id: number;
  defaultName: string;
  publishDate: string;
  pvs: PVs[];
} & Record<string, any>;

type TableInfo = {
  url: URL;
  rating: number;
};

export type { PVs, VocaResponse, TableInfo };
