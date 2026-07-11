export const OTHER_NEWS_SOURCE = "__other__";
export const UNKNOWN_NEWS_COUNTRY = "__unknown__";
export const UNKNOWN_NEWS_SOURCE = "__unknown__";

export type NewsChartAggregation = "sources" | "countries";

export type NewsChartGranularity = "day" | "week" | "month";

export type NewsChartSegment = {
  key: string;
  total: number;
};

export type NewsChartBucket = {
  bucketEnd: string;
  bucketStart: string;
  segments: NewsChartSegment[];
  total: number;
};

export type NewsChartStats = {
  aggregation: NewsChartAggregation;
  buckets: NewsChartBucket[];
  granularity: NewsChartGranularity;
  items: string[];
};
