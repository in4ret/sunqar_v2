import {
  type NewsChartAggregation,
  OTHER_NEWS_SOURCE,
  UNKNOWN_NEWS_COUNTRY,
  UNKNOWN_NEWS_SOURCE,
} from "./news-chart-shared";

const CHART_COLORS = [
  "#2f6f9f",
  "#2d7a57",
  "#c89f26",
  "#9a5f97",
  "#b25f3b",
  "#5d7ec2",
  "#7b9244",
  "#a65c76",
  "#3f8f8c",
  "#d1783f",
];

const OTHER_SOURCE_COLOR = "#8f96a3";
const UNKNOWN_ITEM_COLOR = "#708b9f";
const COUNTRY_COLOR_OVERRIDES: Record<string, string> = {
  kz: "#00afca",
  ru: "#1f5fbf",
  [UNKNOWN_NEWS_COUNTRY]: UNKNOWN_ITEM_COLOR,
};

function getStablePaletteColor(value: string) {
  let hash = 0;

  for (const character of value.trim().toLowerCase()) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return CHART_COLORS[hash % CHART_COLORS.length];
}

export function getNewsCountryColor(country: string) {
  const normalizedCountry = country.trim().toLowerCase();
  const overrideColor = COUNTRY_COLOR_OVERRIDES[normalizedCountry];

  if (overrideColor) {
    return overrideColor;
  }

  return getStablePaletteColor(normalizedCountry);
}

export function getNewsChartItemColor(item: string, aggregation: NewsChartAggregation) {
  if (aggregation === "countries") {
    return getNewsCountryColor(item);
  }

  if (item === OTHER_NEWS_SOURCE) {
    return OTHER_SOURCE_COLOR;
  }

  if (item === UNKNOWN_NEWS_SOURCE || item === UNKNOWN_NEWS_COUNTRY) {
    return UNKNOWN_ITEM_COLOR;
  }

  return getStablePaletteColor(item);
}
