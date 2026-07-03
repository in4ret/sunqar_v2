export type CommentsChartPoint = {
  comment: string;
  comment_id: string;
  content_id: string;
  id: string;
  publishedat: number;
  source: string;
  threat: number;
  toxic: number;
  username: string;
};

export type CommentsChartSourceTotal = {
  source: string;
  total: number;
};

export type CommentsChartResult = {
  isSampled: boolean;
  points: CommentsChartPoint[];
  sampleTotal: number;
  sourceTotals: CommentsChartSourceTotal[];
  total: number;
};
