"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

import type { HomePageChartRange } from "@/lib/home-page-stats";
import { Dropdown } from "@/ui";

import styles from "./home-page-chart-range.module.scss";

type HomePageChartRangeSelectorProps = {
  "aria-label": string;
  className?: string;
  onChange: (value: HomePageChartRange) => void;
  value: HomePageChartRange;
};

export function HomePageChartRangeSelector({
  "aria-label": ariaLabel,
  className,
  onChange,
  value,
}: HomePageChartRangeSelectorProps) {
  const t = useTranslations();
  const selectorClassName = [styles["home-page-chart-range-selector"], className]
    .filter(Boolean)
    .join(" ");
  const options = useMemo(
    () => [
      { label: t("home.chart-ranges.month-daily"), value: "month-daily" },
      { label: t("home.chart-ranges.six-months-weekly"), value: "six-months-weekly" },
      { label: t("home.chart-ranges.all-time-monthly"), value: "all-time-monthly" },
    ],
    [t]
  );

  return (
    <Dropdown
      aria-label={ariaLabel}
      className={selectorClassName}
      options={options}
      value={value}
      variant="pill"
      onChange={(nextValue) => {
        if (
          nextValue === "month-daily" ||
          nextValue === "six-months-weekly" ||
          nextValue === "all-time-monthly"
        ) {
          onChange(nextValue);
        }
      }}
    />
  );
}
