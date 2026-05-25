"use client";

import { type KeyboardEvent, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import * as d3 from "d3";

import { useSize } from "@/hooks/use-size";
import type {
  HomePageChartRange,
  HomePageReportTrendRangeStats,
} from "@/lib/home-page-stats";

import styles from "./report-trend-chart.module.scss";

type ReportTrendChartProps = {
  range: HomePageChartRange;
  ranges: {
    [key in HomePageChartRange]: HomePageReportTrendRangeStats;
  };
  reportTitle: string;
};

type TooltipState = {
  blockItems: {
    color: string;
    title: string;
    total: number;
  }[];
  periodLabel: string;
  total: number;
  x: number;
  y: number;
};

const CHART_HEIGHT = 96;
const CHART_MARGIN = {
  bottom: 14,
  left: 30,
  right: 6,
  top: 6,
};
const TREND_COLORS = ["#1d4ed8", "#0f766e", "#c2410c"];

function parseChartDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day, 12));
}

function getTrendColor(colorIndex: number) {
  return TREND_COLORS[colorIndex % TREND_COLORS.length];
}

export function ReportTrendChart({
  range,
  ranges,
  reportTitle,
}: ReportTrendChartProps) {
  const locale = useLocale();
  const t = useTranslations();
  const { ref: containerRef, width: containerWidth } = useSize<HTMLDivElement>(100);
  const [activeBucketStart, setActiveBucketStart] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const chartLabel = t("home.reports-table-trend-chart-label", { title: reportTitle });
  const tooltipTotalLabel = t("home.reports-table-trend-tooltip-total-label");
  const emptyLabels = useMemo(
    () => ({
      "all-time-monthly": t("home.reports-table-trend-empty.all-time-monthly"),
      "month-daily": t("home.reports-table-trend-empty.month-daily"),
      "six-months-weekly": t("home.reports-table-trend-empty.six-months-weekly"),
    }),
    [t]
  );
  const rangeStats = ranges[range];
  const buckets = rangeStats.buckets;
  const series = rangeStats.series;
  const hasData = series.some((item) => item.points.some((point) => point.total > 0));

  const chartData = useMemo(() => {
    const width = Math.max(containerWidth, 0);
    const height = CHART_HEIGHT;
    const innerWidth = Math.max(width - CHART_MARGIN.left - CHART_MARGIN.right, 0);
    const innerHeight = Math.max(height - CHART_MARGIN.top - CHART_MARGIN.bottom, 0);
    const maxValue = Math.max(...series.flatMap((item) => item.points.map((point) => point.total)), 0);
    const xScale =
      buckets.length > 0 && innerWidth > 0
        ? d3.scalePoint<string>().domain(buckets.map((bucket) => bucket.bucketStart)).range([0, innerWidth])
        : null;
    const yScale =
      innerHeight > 0
        ? d3.scaleLinear().domain([0, Math.max(maxValue, 1)]).range([innerHeight, 0]).nice(3)
        : null;
    const lineBuilder =
      xScale && yScale
        ? d3
            .line<{ bucketStart: string; total: number }>()
            .defined((point) => xScale(point.bucketStart) !== undefined)
            .x((point) => xScale(point.bucketStart) ?? 0)
            .y((point) => yScale(point.total))
        : null;
    const paths = lineBuilder
      ? series.map((item) => ({
          blockTitle: item.blockTitle,
          color: getTrendColor(item.colorIndex),
          path: lineBuilder(item.points) ?? "",
        }))
      : [];

    return {
      chartHeight: height,
      chartWidth: width,
      innerHeight,
      innerWidth,
      paths,
      xScale,
      yScale,
    };
  }, [buckets, containerWidth, series]);

  const dayAxisLabelFormatter = useMemo(
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
  const valueFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        maximumFractionDigits: 0,
      }),
    [locale]
  );
  const bucketTotals = useMemo(() => {
    const totals = new Map<string, number>();

    for (const bucket of buckets) {
      totals.set(bucket.bucketStart, 0);
    }

    for (const item of series) {
      for (const point of item.points) {
        totals.set(point.bucketStart, (totals.get(point.bucketStart) ?? 0) + point.total);
      }
    }

    return totals;
  }, [buckets, series]);
  const bucketSeriesItems = useMemo(() => {
    return new Map(
      buckets.map((bucket) => [
        bucket.bucketStart,
        series.map((item) => ({
          color: getTrendColor(item.colorIndex),
          title: item.blockTitle,
          total: item.points.find((point) => point.bucketStart === bucket.bucketStart)?.total ?? 0,
        })),
      ])
    );
  }, [buckets, series]);

  function formatPeriodLabel(bucketStart: string, bucketEnd: string) {
    if (range === "all-time-monthly") {
      return monthFormatter.format(parseChartDate(bucketStart));
    }

    if (range === "six-months-weekly") {
      return `${shortPeriodFormatter.format(parseChartDate(bucketStart))} - ${shortPeriodFormatter.format(parseChartDate(bucketEnd))}`;
    }

    return longDayFormatter.format(parseChartDate(bucketStart));
  }

  const axisLabels = useMemo(() => {
    if (buckets.length === 0) {
      return [];
    }

    const indices = [0, Math.floor((buckets.length - 1) / 2), buckets.length - 1];

    return [...new Set(indices)].map((index) => ({
      date: buckets[index]?.bucketStart ?? "",
      label:
        range === "all-time-monthly"
          ? monthFormatter.format(parseChartDate(buckets[index].bucketStart))
          : range === "six-months-weekly"
            ? shortPeriodFormatter.format(parseChartDate(buckets[index].bucketStart))
            : dayAxisLabelFormatter.format(parseChartDate(buckets[index].bucketStart)),
    }));
  }, [buckets, dayAxisLabelFormatter, monthFormatter, range, shortPeriodFormatter]);
  const yScale = chartData.yScale;
  const yAxisTicks = useMemo(() => {
    if (!yScale) {
      return [];
    }

    return yScale.ticks(3).map((value) => ({
      label: valueFormatter.format(value),
      value,
      y: yScale(value),
    }));
  }, [valueFormatter, yScale]);

  function updateTooltip(
    eventTarget: EventTarget & SVGRectElement,
    bucketStart: string,
    bucketEnd: string
  ) {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const bucketRect = eventTarget.getBoundingClientRect();

    setTooltip({
      blockItems: bucketSeriesItems.get(bucketStart) ?? [],
      periodLabel: formatPeriodLabel(bucketStart, bucketEnd),
      total: bucketTotals.get(bucketStart) ?? 0,
      x: bucketRect.left - containerRect.left + bucketRect.width / 2,
      y: bucketRect.top - containerRect.top,
    });
    setActiveBucketStart(bucketStart);
  }

  function clearTooltip() {
    setActiveBucketStart(null);
    setTooltip(null);
  }

  function handleBucketKeyDown(
    event: KeyboardEvent<SVGRectElement>,
    bucketStart: string,
    bucketEnd: string
  ) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    updateTooltip(event.currentTarget, bucketStart, bucketEnd);
  }

  return (
    <div className={styles["report-trend-chart"]}>
      <div className={styles["chart-frame"]} ref={containerRef}>
        {!hasData ? (
          <div className={styles["empty-state"]}>{emptyLabels[range]}</div>
        ) : (
          chartData.chartWidth > 0 &&
          chartData.innerWidth > 0 &&
          chartData.innerHeight > 0 &&
          chartData.xScale &&
          chartData.yScale && (
            <>
              <svg
                aria-label={chartLabel}
                className={styles["svg"]}
                height={chartData.chartHeight}
                role="img"
                viewBox={`0 0 ${chartData.chartWidth} ${chartData.chartHeight}`}
                width={chartData.chartWidth}
              >
                <g transform={`translate(${CHART_MARGIN.left}, ${CHART_MARGIN.top})`}>
                  {yAxisTicks.map((tick) => {
                    return (
                      <g key={tick.value}>
                        <line
                          className={styles["grid-line"]}
                          x1={0}
                          x2={chartData.innerWidth}
                          y1={tick.y}
                          y2={tick.y}
                        />
                        <text
                          className={styles["y-axis-label"]}
                          textAnchor="end"
                          x={-6}
                          y={tick.y + 3}
                        >
                          {tick.label}
                        </text>
                      </g>
                    );
                  })}
                  <line
                    className={styles["baseline"]}
                    x1={0}
                    x2={chartData.innerWidth}
                    y1={chartData.innerHeight}
                    y2={chartData.innerHeight}
                  />
                  {buckets.map((bucket, index) => {
                    const currentX = chartData.xScale?.(bucket.bucketStart);

                    if (currentX === undefined) {
                      return null;
                    }

                    const previousX =
                      index > 0 ? chartData.xScale?.(buckets[index - 1]?.bucketStart ?? "") : undefined;
                    const nextX =
                      index < buckets.length - 1
                        ? chartData.xScale?.(buckets[index + 1]?.bucketStart ?? "")
                        : undefined;
                    const leftEdge =
                      index === 0
                        ? 0
                        : previousX !== undefined
                          ? (previousX + currentX) / 2
                          : currentX;
                    const rightEdge =
                      index === buckets.length - 1
                        ? chartData.innerWidth
                        : nextX !== undefined
                          ? (currentX + nextX) / 2
                          : currentX;
                    const hitboxWidth = Math.max(rightEdge - leftEdge, 0);
                    const isActive = activeBucketStart === bucket.bucketStart;

                    return (
                      <g key={bucket.bucketStart}>
                        {isActive ? (
                          <rect
                            className={styles["active-column"]}
                            height={chartData.innerHeight}
                            width={hitboxWidth}
                            x={leftEdge}
                            y={0}
                          />
                        ) : null}
                        <rect
                          aria-label={`${formatPeriodLabel(bucket.bucketStart, bucket.bucketEnd)}: ${valueFormatter.format(bucketTotals.get(bucket.bucketStart) ?? 0)}`}
                          className={styles["bucket-hitbox"]}
                          height={chartData.innerHeight}
                          onBlur={clearTooltip}
                          onFocus={(event) =>
                            updateTooltip(event.currentTarget, bucket.bucketStart, bucket.bucketEnd)
                          }
                          onKeyDown={(event) =>
                            handleBucketKeyDown(event, bucket.bucketStart, bucket.bucketEnd)
                          }
                          onMouseEnter={(event) =>
                            updateTooltip(event.currentTarget, bucket.bucketStart, bucket.bucketEnd)
                          }
                          onMouseLeave={clearTooltip}
                          onMouseMove={(event) =>
                            updateTooltip(event.currentTarget, bucket.bucketStart, bucket.bucketEnd)
                          }
                          tabIndex={0}
                          width={hitboxWidth}
                          x={leftEdge}
                          y={0}
                        />
                      </g>
                    );
                  })}
                  {chartData.paths.map((series) =>
                    series.path ? (
                      <path
                        d={series.path}
                        key={series.blockTitle}
                        stroke={series.color}
                        className={styles["trend-line"]}
                      />
                    ) : null
                  )}
                  {axisLabels.map((axisLabel) => {
                    const x = chartData.xScale?.(axisLabel.date);

                    if (x === undefined) {
                      return null;
                    }

                    return (
                      <text
                        className={styles["axis-label"]}
                        key={axisLabel.date}
                        textAnchor={
                          axisLabel.date === buckets[0]?.bucketStart
                            ? "start"
                            : axisLabel.date === buckets[buckets.length - 1]?.bucketStart
                              ? "end"
                              : "middle"
                        }
                        x={x}
                        y={chartData.innerHeight + 12}
                      >
                        {axisLabel.label}
                      </text>
                    );
                  })}
                </g>
              </svg>
              {tooltip ? (
                <div className={styles["tooltip"]} style={{ left: tooltip.x, top: tooltip.y }}>
                  <div className={styles["tooltip-period"]}>{tooltip.periodLabel}</div>
                  <div className={styles["tooltip-row"]}>
                    <span className={styles["tooltip-label"]}>{tooltipTotalLabel}</span>
                    <span className={styles["tooltip-value"]}>
                      {valueFormatter.format(tooltip.total)}
                    </span>
                  </div>
                  {tooltip.blockItems.length > 0 ? <hr className={styles["tooltip-divider"]} /> : null}
                  <div className={styles["tooltip-blocks"]}>
                    {tooltip.blockItems.map((blockItem) => (
                      <div className={styles["tooltip-block"]} key={blockItem.title}>
                        <span
                          className={styles["legend-swatch"]}
                          style={{ backgroundColor: blockItem.color }}
                        />
                        <span className={styles["tooltip-block-value"]}>
                          {valueFormatter.format(blockItem.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          )
        )}
      </div>
    </div>
  );
}
