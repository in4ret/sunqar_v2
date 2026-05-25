export const UNKNOWN_NEWS_COUNTRY = "__unknown__";

export type HomePageNewsCountryChartSlice = {
  country: string;
  total: number;
};

export type HomePageNewsCountryChartStats = {
  slices: HomePageNewsCountryChartSlice[];
};
