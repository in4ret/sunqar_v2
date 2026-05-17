"use client";

import { type KeyboardEvent, useMemo, useState } from "react";
import { useLocale } from "next-intl";

import * as d3 from "d3";

import { useSize } from "@/hooks/use-size";
import type { HomePageCommentsDailyStat } from "@/lib/home-page-stats";

import styles from "./comments-bar-chart.module.scss";

type CommentsBarChartProps = {
  className?: string;
  data: HomePageCommentsDailyStat[];
  emptyLabel: string;
  subtitle: string;
  title: string;
  valueLabel: string;
};

type TooltipState = {
  date: string;
  total: number;
  x: number;
  y: number;
};

const CHART_MARGIN = {
  top: 10,
  right: 10,
  bottom: 30,
  left: 32,
};
const Y_TICK_COUNT = 4;

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

export function CommentsBarChart({
  className,
  data,
  emptyLabel,
  subtitle,
  title,
  valueLabel,
}: CommentsBarChartProps) {
  const locale = useLocale();
  const { ref: containerRef, height: containerHeight, width: containerWidth } =
    useSize<HTMLDivElement>(100);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const totalComments = data.reduce((sum, item) => sum + item.total, 0);
  const chartClassName = [styles["card"], className].filter(Boolean).join(" ");

  const chartData = useMemo(() => {
    const width = Math.max(containerWidth, 0);
    const height = Math.max(containerHeight, 0);
    const innerWidth = Math.max(width - CHART_MARGIN.left - CHART_MARGIN.right, 0);
    const innerHeight = Math.max(height - CHART_MARGIN.top - CHART_MARGIN.bottom, 0);
    const dates = data.map((item) => item.date);
    const maxValue = Math.max(...data.map((item) => item.total), 0);
    const labelIndices = getBarLabelIndices(data.length);
    const maxDomainValue = Math.max(maxValue, 1);
    const xScale =
      dates.length > 0 && innerWidth > 0
        ? d3.scaleBand<string>().domain(dates).range([0, innerWidth]).padding(0.16)
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
      maxValue: maxDomainValue,
      ticks,
      xScale,
      yScale,
    };
  }, [containerHeight, containerWidth, data]);

  const axisDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: "2-digit",
        month: "2-digit",
        timeZone: "UTC",
      }),
    [locale]
  );
  const tooltipDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }),
    [locale]
  );

  function getBarHeight(total: number) {
    if (!chartData.yScale) {
      return 0;
    }

    return chartData.innerHeight - chartData.yScale(total);
  }

  function updateTooltip(
    eventTarget: EventTarget & SVGRectElement,
    index: number,
    item: HomePageCommentsDailyStat
  ) {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const barRect = eventTarget.getBoundingClientRect();

    setTooltip({
      date: item.date,
      total: item.total,
      x: barRect.left - containerRect.left + barRect.width / 2,
      y: barRect.top - containerRect.top,
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
    item: HomePageCommentsDailyStat
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
        <h2 className={styles["title"]}>{title}</h2>
        <div className={styles["subtitle"]}>{subtitle}</div>
      </div>
      <div className={styles["chart-frame"]} ref={containerRef}>
        {totalComments === 0 ? (
          <div className={styles["empty-state"]}>{emptyLabel}</div>
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

                {data.map((item, index) => {
                  const height = getBarHeight(item.total);
                  const renderedHeight = Math.max(height, item.total > 0 ? 3 : 0);
                  const x = chartData.xScale?.(item.date) ?? 0;
                  const barWidth = chartData.xScale?.bandwidth() ?? 0;
                  const y = chartData.innerHeight - renderedHeight;
                  const isActive = activeIndex === index;
                  const barClassName = [
                    styles["bar"],
                    styles["bar-interactive"],
                    isActive ? styles["bar-active"] : "",
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <g key={item.date}>
                      <rect
                        aria-label={`${tooltipDateFormatter.format(parseChartDate(item.date))}: ${item.total}`}
                        className={barClassName}
                        height={renderedHeight}
                        onBlur={clearTooltip}
                        onFocus={(event) => updateTooltip(event.currentTarget, index, item)}
                        onKeyDown={(event) => handleBarKeyDown(event, index, item)}
                        onMouseEnter={(event) => updateTooltip(event.currentTarget, index, item)}
                        onMouseLeave={clearTooltip}
                        onMouseMove={(event) => updateTooltip(event.currentTarget, index, item)}
                        rx={4}
                        ry={4}
                        tabIndex={0}
                        width={barWidth}
                        x={x}
                        y={y}
                      />
                      {chartData.labelIndices.has(index) ? (
                        <g transform={`translate(${x + barWidth / 2}, ${chartData.innerHeight})`}>
                          <line className={styles["tick-line"]} y1={0} y2={8} />
                          <text className={styles["x-axis-label"]} textAnchor="middle" y={24}>
                            {axisDateFormatter.format(parseChartDate(item.date))}
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
                <div className={styles["tooltip-date"]}>
                  {tooltipDateFormatter.format(parseChartDate(tooltip.date))}
                </div>
                <div className={styles["tooltip-value"]}>
                  {valueLabel}: {tooltip.total}
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
        <span className={styles["skeleton-title"]} />
        <span className={styles["skeleton-subtitle"]} />
      </div>
      <div className={styles["skeleton-body"]}>
        {skeletonHeights.map((height, index) => (
          <div className={styles["skeleton-column"]} key={index}>
            <span className={styles["skeleton-bar"]} style={{ height: `${height}%` }} />
            <span className={styles["skeleton-axis-label"]} />
          </div>
        ))}
      </div>
    </div>
  );
}
