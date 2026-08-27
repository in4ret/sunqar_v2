import {
  type NewsChartAggregation,
  OTHER_NEWS_SOURCE,
  UNKNOWN_NEWS_COUNTRY,
  UNKNOWN_NEWS_SOURCE,
} from "./news-chart-shared";

const CHART_COLORS = [
  "#315fe8",
  "#129074",
  "#e29d32",
  "#8a58d4",
  "#e55c62",
  "#1b88c9",
  "#2d7ef7",
  "#00a987",
  "#6c63ff",
  "#4cae4f",
  "#d94f70",
  "#3b82f6",
  "#ef7d22",
  "#9b59b6",
  "#ff6b6b",
  "#f59e0b",
  "#0ea5e9",
  "#22c55e",
  "#f43f5e",
  "#06b6d4",
  "#6366f1",
  "#14b8a6",
  "#84cc16",
  "#fb7185",
  "#f97316",
  "#38bdf8",
];

const OTHER_SOURCE_COLOR = "#9aa5b4";
const UNKNOWN_ITEM_COLOR = "#9aa5b4";
const COUNTRY_COLOR_OVERRIDES: Record<string, string> = {
  kz: "#0ea5e9",
  ru: "#315fe8",
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
