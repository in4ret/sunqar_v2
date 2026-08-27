"use client";

import { type KeyboardEvent, type MouseEvent, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import * as d3 from "d3";

import { useSize } from "@/hooks/use-size";
import type {
  HomePageCommentsChartBucket,
  HomePageCommentsChartSegment,
  HomePageCommentsChartStats,
} from "@/lib/home-page-stats";

import { HomePageChartRangeSelector } from "../home-page-chart-range/home-page-chart-range";
import {
  isHomePageChartRange,
  setStoredHomePageChartRange,
  useStoredHomePageChartRange,
} from "../home-page-chart-range/home-page-chart-range-storage";

import styles from "./comments-bar-chart.module.scss";

type CommentsBarChartProps = {
  className?: string;
  data: HomePageCommentsChartStats;
};

type TooltipState = {
  periodLabel: string;
  segments: HomePageCommentsChartSegment[];
  total: number;
  x: number;
  y: number;
};

const CHART_MARGIN = {
  top: 10,
  right: 10,
  bottom: 30,
  left: 50,
};
const Y_TICK_COUNT = 4;
const COMMENTS_CHART_RANGE_STORAGE_KEY = "sunqar-home-comments-chart-range";
const COMMENTS_CHART_RANGE_CHANGE_EVENT = "sunqar-home-comments-chart-range-change";
const COMMENTS_CHART_RANGE_STORAGE = {
  changeEventName: COMMENTS_CHART_RANGE_CHANGE_EVENT,
  storageKey: COMMENTS_CHART_RANGE_STORAGE_KEY,
} as const;
const UNKNOWN_COMMENT_SOURCE = "__unknown__";
const CHART_COLORS = [
  "#315fe8",
  "#129074",
  "#e29d32",
  "#8a58d4",
  "#e55c62",
  "#1b88c9",
  "#2d7ef7",
  "#00a987",
];
const SOURCE_COLOR_OVERRIDES: Record<string, string> = {
  youtube: "#f97316",
  ig: "#f43f5e",
  tiktok: "#7c5cff",
  [UNKNOWN_COMMENT_SOURCE]: "#9aa5b4",
};

function parseChartDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day, 12));
}

function getBarLabelIndices(length: number) {
  if (length <= 1) {
    return new Set([0]);
  }

  const step = Math.max(1, Math.ceil(length / 6));
  const indices = new Set<number>([0, length - 1]);

  for (let index = step; index < length - 1; index += step) {
    indices.add(index);
  }

  return indices;
}

function formatSourceLabel(source: string, unknownSourceLabel: string) {
  return source === UNKNOWN_COMMENT_SOURCE ? unknownSourceLabel : source;
}

function getSourceColor(source: string) {
  const normalizedSource = source.trim().toLowerCase();
  const overrideColor = SOURCE_COLOR_OVERRIDES[normalizedSource];

  if (overrideColor) {
    return overrideColor;
  }

  let hash = 0;

  for (const character of normalizedSource) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return CHART_COLORS[hash % CHART_COLORS.length];
}

export function CommentsBarChart({ className, data }: CommentsBarChartProps) {
  const locale = useLocale();
  const t = useTranslations();
  const { ref: containerRef, height: containerHeight, width: containerWidth } =
    useSize<HTMLDivElement>(100);
  const range = useStoredHomePageChartRange(COMMENTS_CHART_RANGE_STORAGE);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const chartEntries = data.ranges[range];
  const totalComments = chartEntries.reduce((sum, item) => sum + item.total, 0);
  const chartClassName = [styles["card"], className].filter(Boolean).join(" ");
  const title = t("home.comments-chart-title");
  const rangeSelectorLabel = t("home.comments-chart-range-selector");
  const totalLabel = t("home.comments-chart-total-label");
  const unknownSourceLabel = t("home.comments-chart-unknown-source");
  const subtitles = useMemo(
    () => ({
      "all-time-monthly": t("home.comments-chart-subtitles.all-time-monthly"),
      "month-daily": t("home.comments-chart-subtitles.month-daily"),
      "six-months-weekly": t("home.comments-chart-subtitles.six-months-weekly"),
    }),
    [t]
  );
  const emptyLabels = useMemo(
    () => ({
      "all-time-monthly": t("home.comments-chart-empty.all-time-monthly"),
      "month-daily": t("home.comments-chart-empty.month-daily"),
      "six-months-weekly": t("home.comments-chart-empty.six-months-weekly"),
    }),
    [t]
  );
  const chartData = useMemo(() => {
    const width = Math.max(containerWidth, 0);
    const height = Math.max(containerHeight, 0);
    const innerWidth = Math.max(width - CHART_MARGIN.left - CHART_MARGIN.right, 0);
    const innerHeight = Math.max(height - CHART_MARGIN.top - CHART_MARGIN.bottom, 0);
    const bucketStarts = chartEntries.map((item) => item.bucketStart);
    const maxValue = Math.max(...chartEntries.map((item) => item.total), 0);
    const labelIndices = getBarLabelIndices(chartEntries.length);
    const maxDomainValue = Math.max(maxValue, 1);
    const xScale =
      bucketStarts.length > 0 && innerWidth > 0
        ? d3.scaleBand<string>().domain(bucketStarts).range([0, innerWidth]).padding(0.16)
        : null;
    const yScale =
      innerHeight > 0
        ? d3.scaleLinear().domain([0, maxDomainValue]).nice(Y_TICK_COUNT).range([innerHeight, 0])
        : null;
    const ticks = yScale?.ticks(Y_TICK_COUNT) ?? [];

    return {
      chartHeight: height,
      chartWidth: width,
      innerHeight,
      innerWidth,
      labelIndices,
      ticks,
      xScale,
      yScale,
    };
  }, [chartEntries, containerHeight, containerWidth]);

  const dayAxisFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: "2-digit",
        month: "2-digit",
        timeZone: "UTC",
      }),
    [locale]
  );
  const shortPeriodFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      }),
    [locale]
  );
  const longDayFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }),
    [locale]
  );
  const monthFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }),
    [locale]
  );

  function formatAxisLabel(item: HomePageCommentsChartBucket) {
    if (range === "all-time-monthly") {
      return monthFormatter.format(parseChartDate(item.bucketStart));
    }

    if (range === "six-months-weekly") {
      return shortPeriodFormatter.format(parseChartDate(item.bucketStart));
    }

    return dayAxisFormatter.format(parseChartDate(item.bucketStart));
  }

  function formatPeriodLabel(item: HomePageCommentsChartBucket) {
    if (range === "all-time-monthly") {
      return monthFormatter.format(parseChartDate(item.bucketStart));
    }

    if (range === "six-months-weekly") {
      return `${shortPeriodFormatter.format(parseChartDate(item.bucketStart))} - ${shortPeriodFormatter.format(parseChartDate(item.bucketEnd))}`;
    }

    return longDayFormatter.format(parseChartDate(item.bucketStart));
  }

  function getBarHeight(total: number) {
    if (!chartData.yScale) {
      return 0;
    }

    return chartData.innerHeight - chartData.yScale(total);
  }

  function updateTooltip(
    eventTarget: EventTarget & SVGRectElement,
    index: number,
    item: HomePageCommentsChartBucket,
    pointerEvent?: MouseEvent<SVGRectElement>
  ) {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const barRect = eventTarget.getBoundingClientRect();
    const x = pointerEvent
      ? pointerEvent.clientX - containerRect.left
      : barRect.left - containerRect.left + barRect.width / 2;
    const y = pointerEvent ? pointerEvent.clientY - containerRect.top : barRect.top - containerRect.top;

    setTooltip({
      periodLabel: formatPeriodLabel(item),
      segments: item.segments,
      total: item.total,
      x,
      y,
    });
    setActiveIndex(index);
  }

  function clearTooltip() {
    setActiveIndex(null);
    setTooltip(null);
  }

  function handleBarKeyDown(
    event: KeyboardEvent<SVGRectElement>,
    index: number,
    item: HomePageCommentsChartBucket
  ) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    updateTooltip(event.currentTarget, index, item);
  }

  return (
    <div className={chartClassName}>
      <div className={styles["header"]}>
        <div className={styles["header-copy"]}>
          <h2 className={styles["title"]}>{title}</h2>
          <div className={styles["subtitle"]}>{subtitles[range]}</div>
        </div>
        <div className={styles["header-actions"]}>
          <HomePageChartRangeSelector
            aria-label={rangeSelectorLabel}
            value={range}
            onChange={(nextValue) => {
              if (isHomePageChartRange(nextValue)) {
                setActiveIndex(null);
                setTooltip(null);
                setStoredHomePageChartRange(COMMENTS_CHART_RANGE_STORAGE, nextValue);
              }
            }}
          />
        </div>
      </div>
      <div className={styles["chart-frame"]} ref={containerRef}>
        {totalComments === 0 ? (
          <div className={styles["empty-state"]}>{emptyLabels[range]}</div>
        ) : chartData.chartWidth > 0 && chartData.chartHeight > 0 && chartData.xScale && chartData.yScale ? (
          <>
            <svg
              aria-label={title}
              className={styles["svg"]}
              height={chartData.chartHeight}
              role="img"
              viewBox={`0 0 ${chartData.chartWidth} ${chartData.chartHeight}`}
              width={chartData.chartWidth}
            >
              <g transform={`translate(${CHART_MARGIN.left}, ${CHART_MARGIN.top})`}>
                {chartData.ticks.map((tick) => {
                  const y = chartData.yScale?.(tick) ?? chartData.innerHeight;

                  return (
                    <g key={tick}>
                      <line
                        className={styles["grid-line"]}
                        x1={0}
                        x2={chartData.innerWidth}
                        y1={y}
                        y2={y}
                      />
                      <line className={styles["tick-line"]} x1={-6} x2={0} y1={y} y2={y} />
                      <text
                        className={styles["y-axis-label"]}
                        textAnchor="end"
                        x={-12}
                        y={y + 7}
                      >
                        {tick}
                      </text>
                    </g>
                  );
                })}

                <line
                  className={styles["axis-line"]}
                  x1={0}
                  x2={0}
                  y1={0}
                  y2={chartData.innerHeight}
                />
                <line
                  className={styles["axis-line"]}
                  x1={0}
                  x2={chartData.innerWidth}
                  y1={chartData.innerHeight}
                  y2={chartData.innerHeight}
                />

                {chartEntries.map((item, index) => {
                  const x = chartData.xScale?.(item.bucketStart) ?? 0;
                  const barWidth = chartData.xScale?.bandwidth() ?? 0;
                  const isActive = activeIndex === index;
                  const barGroupClassName = [
                    styles["bar-group"],
                    styles["bar-group-interactive"],
                    isActive ? styles["bar-group-active"] : "",
                  ]
                    .filter(Boolean)
                    .join(" ");
                  let stackedOffset = 0;

                  return (
                    <g className={barGroupClassName} key={item.bucketStart}>
                      {item.segments.map((segment, segmentIndex) => {
                        const segmentHeight = Math.max(getBarHeight(segment.total), 0);
                        const renderedHeight =
                          segment.total > 0 ? Math.max(segmentHeight, item.total > 0 ? 3 : 0) : 0;

                        if (renderedHeight === 0) {
                          return null;
                        }

                        const y = chartData.innerHeight - stackedOffset - renderedHeight;
                        stackedOffset += renderedHeight;

                        return (
                          <rect
                            key={`${item.bucketStart}-${segment.source}-${segmentIndex}`}
                            className={styles["bar-segment"]}
                            fill={getSourceColor(segment.source)}
                            height={renderedHeight}
                            rx={segmentIndex === item.segments.length - 1 ? 4 : 0}
                            ry={segmentIndex === item.segments.length - 1 ? 4 : 0}
                            width={barWidth}
                            x={x}
                            y={y}
                          />
                        );
                      })}
                      <rect
                        aria-label={`${formatPeriodLabel(item)}: ${item.total}`}
                        className={styles["bar-hitbox"]}
                        height={chartData.innerHeight}
                        onBlur={clearTooltip}
                        onFocus={(event) => updateTooltip(event.currentTarget, index, item)}
                        onKeyDown={(event) => handleBarKeyDown(event, index, item)}
                        onMouseEnter={(event) => updateTooltip(event.currentTarget, index, item, event)}
                        onMouseLeave={clearTooltip}
                        onMouseMove={(event) => updateTooltip(event.currentTarget, index, item, event)}
                        tabIndex={0}
                        width={barWidth}
                        x={x}
                        y={0}
                      />
                      {chartData.labelIndices.has(index) ? (
                        <g transform={`translate(${x + barWidth / 2}, ${chartData.innerHeight})`}>
                          <line className={styles["tick-line"]} y1={0} y2={8} />
                          <text className={styles["x-axis-label"]} textAnchor="middle" y={24}>
                            {formatAxisLabel(item)}
                          </text>
                        </g>
                      ) : null}
                    </g>
                  );
                })}
              </g>
            </svg>

            {tooltip ? (
              <div className={styles["tooltip"]} style={{ left: tooltip.x, top: tooltip.y }}>
                <div className={styles["tooltip-date"]}>{tooltip.periodLabel}</div>
                <div className={styles["tooltip-value"]}>
                  {totalLabel}: {tooltip.total}
                </div>
                {tooltip.segments.length > 0 ? <hr className={styles["tooltip-divider"]} /> : null}
                <div className={styles["tooltip-segments"]}>
                  {tooltip.segments.map((segment) => (
                    <div className={styles["tooltip-segment"]} key={segment.source}>
                      <span
                        className={styles["legend-swatch"]}
                        style={{ backgroundColor: getSourceColor(segment.source) }}
                      />
                      <span className={styles["tooltip-segment-label"]}>
                        {formatSourceLabel(segment.source, unknownSourceLabel)}
                      </span>
                      <span className={styles["tooltip-segment-value"]}>{segment.total}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

export function CommentsBarChartSkeleton({ className }: { className?: string }) {
  const cardClassName = [styles["card"], styles["skeleton"], className].filter(Boolean).join(" ");
  const skeletonHeights = [24, 38, 52, 66, 42, 74, 58, 68, 48, 60];

  return (
    <div aria-hidden="true" className={cardClassName}>
      <div className={styles["skeleton-header"]}>
        <div className={styles["header-copy"]}>
          <span className={styles["skeleton-title"]} />
          <span className={styles["skeleton-subtitle"]} />
        </div>
        <span className={styles["skeleton-range"]} />
      </div>
      <div className={styles["skeleton-body"]}>
        <span className={styles["skeleton-legend"]} />
        <div className={styles["skeleton-columns"]}>
          {skeletonHeights.map((height, index) => (
            <div className={styles["skeleton-column"]} key={index}>
              <span className={styles["skeleton-bar"]} style={{ height: `${height}%` }} />
              <span className={styles["skeleton-axis-label"]} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
