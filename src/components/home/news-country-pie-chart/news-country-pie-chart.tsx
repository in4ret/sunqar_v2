"use client";

import { type KeyboardEvent, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import * as d3 from "d3";

import { useSize } from "@/hooks/use-size";
import {
  type HomePageNewsCountryChartSlice,
  type HomePageNewsCountryChartStats,
  UNKNOWN_NEWS_COUNTRY,
} from "@/lib/home-page-stats-shared";
import { formatCompactNumber } from "@/lib/utils";

import styles from "./news-country-pie-chart.module.scss";

type NewsCountryPieChartProps = {
  className?: string;
  data: HomePageNewsCountryChartStats;
};

type TooltipState = {
  country: string;
  total: number;
  percentage: string;
  x: number;
  y: number;
};

const SLICE_LABEL_MIN_SHARE = 0.05;
const SLICE_LABEL_EDGE_INSET = 6;
const SLICE_HOVER_OFFSET = 8;

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
const COUNTRY_COLOR_OVERRIDES: Record<string, string> = {
  [UNKNOWN_NEWS_COUNTRY]: "#64748b",
};

function getCountryColor(country: string) {
  const normalizedCountry = country.trim().toLowerCase();
  const overrideColor = COUNTRY_COLOR_OVERRIDES[normalizedCountry];

  if (overrideColor) {
    return overrideColor;
  }

  let hash = 0;

  for (const character of normalizedCountry) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return CHART_COLORS[hash % CHART_COLORS.length];
}

export function NewsCountryPieChart({
  className,
  data,
}: NewsCountryPieChartProps) {
  const t = useTranslations();
  const { ref: chartAreaRef, height: containerHeight, width: containerWidth } =
    useSize<HTMLDivElement>(100);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const chartClassName = [styles["card"], className].filter(Boolean).join(" ");
  const title = t("home.news-country-chart-title");
  const totalLabel = t("home.news-country-chart-total-label");
  const percentageLabel = t("home.news-country-chart-percentage-label");
  const emptyLabel = t("home.news-country-chart-empty");
  const totalNews = data.slices.reduce((sum, item) => sum + item.total, 0);

  function formatPercentage(value: number) {
    return new Intl.NumberFormat(undefined, {
      maximumFractionDigits: 1,
      minimumFractionDigits: 1,
      style: "percent",
    }).format(value);
  }

  function formatTooltipTotal(value: number) {
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0,
    })
      .format(value)
      .replaceAll(",", " ");
  }

  function getSlicePercentage(total: number) {
    if (totalNews <= 0) {
      return formatPercentage(0);
    }

    return formatPercentage(total / totalNews);
  }

  const chartData = useMemo(() => {
    const chartWidth = Math.max(containerWidth, 0);
    const chartHeight = Math.max(containerHeight, 0);
    const maxChartRadius = Math.max(Math.min(chartWidth, chartHeight) / 2, 0);
    const outerRadius = Math.max(maxChartRadius - SLICE_HOVER_OFFSET, 0);
    const innerRadius = outerRadius * 0.38;
    const centerX = chartWidth / 2;
    const centerY = chartHeight / 2;
    const pie = d3
      .pie<HomePageNewsCountryChartSlice>()
      .sort(null)
      .value((slice) => slice.total);
    const arc = d3
      .arc<d3.PieArcDatum<HomePageNewsCountryChartSlice>>()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius);
    const hoverArc = d3
      .arc<d3.PieArcDatum<HomePageNewsCountryChartSlice>>()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius + SLICE_HOVER_OFFSET);
    const pieData = pie(data.slices).map((slice) => {
      const share = totalNews > 0 ? slice.data.total / totalNews : 0;
      const midAngle = (slice.startAngle + slice.endAngle) / 2;
      const labelAngle = midAngle - Math.PI / 2;
      const labelRadius = Math.max(outerRadius - SLICE_LABEL_EDGE_INSET, innerRadius);
      const labelX = Math.cos(labelAngle) * labelRadius;
      const labelY = Math.sin(labelAngle) * labelRadius;
      const isLeftSide = labelX < 0;
      const labelRotation = (labelAngle * 180) / Math.PI + (isLeftSide ? 180 : 0);
      const labelTextAnchor: "end" | "start" = isLeftSide ? "start" : "end";

      return {
        ...slice,
        labelRotation,
        labelTextAnchor,
        labelX,
        labelY,
        share,
        showLabel: share >= SLICE_LABEL_MIN_SHARE,
      };
    });

    return {
      arc,
      centerX,
      centerY,
      chartHeight,
      chartWidth,
      hoverArc,
      innerRadius,
      outerRadius,
      pieData,
    };
  }, [containerHeight, containerWidth, data.slices, totalNews]);

  function formatCountryLabel(country: string) {
    if (country === UNKNOWN_NEWS_COUNTRY) {
      return t("home.news-country-chart-unknown-country");
    }

    return country;
  }

  function updateTooltip(
    eventTarget: EventTarget & SVGPathElement,
    index: number,
    slice: HomePageNewsCountryChartSlice
  ) {
    const container = chartAreaRef.current;

    if (!container) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const sliceRect = eventTarget.getBoundingClientRect();

    setTooltip({
      country: formatCountryLabel(slice.country),
      total: slice.total,
      percentage: getSlicePercentage(slice.total),
      x: sliceRect.left - containerRect.left + sliceRect.width / 2,
      y: sliceRect.top - containerRect.top,
    });
    setActiveIndex(index);
  }

  function clearTooltip() {
    setActiveIndex(null);
    setTooltip(null);
  }

  function handleSliceKeyDown(
    event: KeyboardEvent<SVGPathElement>,
    index: number,
    slice: HomePageNewsCountryChartSlice
  ) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    updateTooltip(event.currentTarget, index, slice);
  }

  return (
    <div className={chartClassName}>
      <div className={styles["header"]}>
        <div className={styles["header-copy"]}>
          <h2 className={styles["title"]}>{title}</h2>
          <div className={styles["subtitle"]}>
            {totalLabel}: {formatCompactNumber(totalNews)}
          </div>
        </div>
      </div>
      <div className={styles["chart-frame"]}>
        {totalNews === 0 ? (
          <div className={styles["empty-state"]}>{emptyLabel}</div>
        ) : (
          <>
            <div className={styles["chart-area"]} ref={chartAreaRef}>
              {chartData.chartWidth > 0 && chartData.chartHeight > 0 && chartData.outerRadius > 0 ? (
                <svg
                  aria-label={title}
                  className={styles["svg"]}
                  height={chartData.chartHeight}
                  role="img"
                  viewBox={`0 0 ${chartData.chartWidth} ${chartData.chartHeight}`}
                  width={chartData.chartWidth}
                >
                  <g transform={`translate(${chartData.centerX}, ${chartData.centerY})`}>
                    {chartData.pieData.map((slice, index) => {
                      const isActive = activeIndex === index;
                      const slicePath = (isActive ? chartData.hoverArc : chartData.arc)(slice);

                      if (!slicePath) {
                        return null;
                      }

                      return (
                        <g key={slice.data.country}>
                          <path
                            aria-label={`${formatCountryLabel(slice.data.country)}: ${getSlicePercentage(slice.data.total)}`}
                            className={styles["slice"]}
                            d={slicePath}
                            fill={getCountryColor(slice.data.country)}
                            onBlur={clearTooltip}
                            onFocus={(event) => updateTooltip(event.currentTarget, index, slice.data)}
                            onKeyDown={(event) => handleSliceKeyDown(event, index, slice.data)}
                            onMouseEnter={(event) => updateTooltip(event.currentTarget, index, slice.data)}
                            onMouseLeave={clearTooltip}
                            onMouseMove={(event) => updateTooltip(event.currentTarget, index, slice.data)}
                            tabIndex={0}
                          />
                          {slice.showLabel ? (
                            <text
                              className={styles["slice-label"]}
                              dominantBaseline="middle"
                              textAnchor={slice.labelTextAnchor}
                              transform={`translate(${slice.labelX} ${slice.labelY}) rotate(${slice.labelRotation})`}
                              x={0}
                              y={0}
                            >
                              {formatPercentage(slice.share)}
                            </text>
                          ) : null}
                        </g>
                      );
                    })}
                    <circle className={styles["center-hole"]} cx={0} cy={0} r={chartData.innerRadius} />
                    <text
                      className={styles["center-value"]}
                      dominantBaseline="middle"
                      textAnchor="middle"
                      x={0}
                      y={0}
                    >
                      100%
                    </text>
                  </g>
                </svg>
              ) : null}
              {tooltip ? (
                <div className={styles["tooltip"]} style={{ left: tooltip.x, top: tooltip.y }}>
                  <div className={styles["tooltip-country"]}>{tooltip.country}</div>
                  <div className={styles["tooltip-value"]}>
                    {percentageLabel}: {tooltip.percentage}
                  </div>
                  <div className={styles["tooltip-value"]}>
                    {totalLabel}: {formatTooltipTotal(tooltip.total)}
                  </div>
                </div>
              ) : null}
            </div>
            <div className={styles["legend"]}>
              <div className={styles["legend-list"]}>
                {data.slices.map((slice) => (
                  <div className={styles["legend-item"]} key={slice.country}>
                    <span
                      className={styles["legend-swatch"]}
                      style={{ backgroundColor: getCountryColor(slice.country) }}
                    />
                    <span className={styles["legend-name"]}>{formatCountryLabel(slice.country)}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function NewsCountryPieChartSkeleton({ className }: { className?: string }) {
  const cardClassName = [styles["card"], styles["skeleton"], className].filter(Boolean).join(" ");

  return (
    <div aria-hidden="true" className={cardClassName}>
      <div className={styles["skeleton-header"]}>
        <div className={styles["header-copy"]}>
          <span className={styles["skeleton-title"]} />
          <span className={styles["skeleton-subtitle"]} />
        </div>
      </div>
      <div className={styles["skeleton-body"]}>
        <div className={styles["skeleton-ring"]} />
        <div className={styles["skeleton-legend"]}>
          {Array.from({ length: 6 }, (_, index) => (
            <div className={styles["skeleton-legend-item"]} key={index}>
              <span className={styles["skeleton-swatch"]} />
              <span className={styles["skeleton-line"]} />
              <span className={styles["skeleton-value"]} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
