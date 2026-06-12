export const OTHER_NEWS_SOURCE = "__other__";
export const UNKNOWN_NEWS_SOURCE = "__unknown__";

export type NewsChartGranularity = "day" | "week" | "month";

export type NewsChartSourceSegment = {
  source: string;
  total: number;
};

export type NewsChartSourceBucket = {
  bucketEnd: string;
  bucketStart: string;
  segments: NewsChartSourceSegment[];
  total: number;
};

export type NewsChartSourceStats = {
  buckets: NewsChartSourceBucket[];
  granularity: NewsChartGranularity;
  sources: string[];
};
