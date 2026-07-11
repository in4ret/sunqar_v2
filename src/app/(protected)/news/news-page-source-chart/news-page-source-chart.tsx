"use client";

import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import * as d3 from "d3";

import { useSize } from "@/hooks/use-size";
import { getNewsChartItemColor } from "@/lib/news/news-chart-colors";
import {
  type NewsChartAggregation,
  type NewsChartBucket,
  type NewsChartSegment,
  type NewsChartStats,
  OTHER_NEWS_SOURCE,
  UNKNOWN_NEWS_COUNTRY,
  UNKNOWN_NEWS_SOURCE,
} from "@/lib/news/news-chart-shared";
import { formatSourceCountryLabel } from "@/lib/sources/source-country-label";

import {
  NEWS_PAGE_SOURCE_CHART_STORAGE_CONFIG,
  setStoredNewsPageSourceChartAggregation,
  useStoredNewsPageSourceChartAggregation,
} from "./news-page-source-chart-storage";

import styles from "./news-page-source-chart.module.scss";

type NewsPageSourceChartProps = {
  hasLoadedStoredSources: boolean;
  searchFrom: string;
  searchQuery: string;
  searchTo: string;
  searchTrigger: number;
  selectedSources: string[];
};

type ChartState =
  | {
      status: "loading";
    }
  | {
      errorMessage?: string;
      status: "error";
    }
  | {
      data: NewsChartStats;
      status: "success";
    };

type TooltipState = {
  anchorX: number;
  anchorY: number;
  periodLabel: string;
  segments: NewsChartSegment[];
  total: number;
  x: number;
  y: number;
};

const CHART_MARGIN = {
  top: 10,
  right: 10,
  bottom: 34,
  left: 50,
};
const TOOLTIP_EDGE_PADDING = 12;
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

export function NewsPageSourceChart({
  hasLoadedStoredSources,
  searchFrom,
  searchQuery,
  searchTo,
  searchTrigger,
  selectedSources,
}: NewsPageSourceChartProps) {
  const locale = useLocale();
  const t = useTranslations();
  const { ref: containerRef, height: containerHeight, width: containerWidth } =
    useSize<HTMLDivElement>(100);
  const [state, setState] = useState<ChartState>({ status: "loading" });
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const aggregation = useStoredNewsPageSourceChartAggregation(NEWS_PAGE_SOURCE_CHART_STORAGE_CONFIG);
  const activeIndexRef = useRef<number | null>(null);
  const selectedSourcesRef = useRef(selectedSources);
  const tooltipStateRef = useRef<TooltipState | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    selectedSourcesRef.current = selectedSources;
  }, [selectedSources]);

  useEffect(() => {
    tooltipStateRef.current = tooltip;
  }, [tooltip]);

  useEffect(() => {
    if (!hasLoadedStoredSources) {
      return;
    }

    const abortController = new AbortController();

    async function loadChart() {
      setState({ status: "loading" });

      try {
        const response = await fetch("/api/news/chart", {
          body: JSON.stringify({
            from: searchFrom,
            aggregation,
            query: searchQuery,
            sources: selectedSourcesRef.current,
            to: searchTo,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload = (await response.json()) as Partial<NewsChartStats>;

        if (
          !payload ||
          !Array.isArray(payload.buckets) ||
          !Array.isArray(payload.items) ||
          (payload.aggregation !== "sources" && payload.aggregation !== "countries") ||
          (payload.granularity !== "day" &&
            payload.granularity !== "week" &&
            payload.granularity !== "month")
        ) {
          throw new Error("Response payload is invalid.");
        }

        setState({
          data: payload as NewsChartStats,
          status: "success",
        });
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setState({
          errorMessage: (error as Error).message,
          status: "error",
        });
      }
    }

    void loadChart();

    return () => {
      abortController.abort();
    };
  }, [aggregation, hasLoadedStoredSources, searchFrom, searchQuery, searchTo, searchTrigger]);

  const title = t("news.chart-title");
  const legendLabel =
    aggregation === "countries"
      ? t("news.chart-legend-label-countries")
      : t("news.chart-legend-label-sources");
  const totalLabel = t("news.chart-total-label");
  const chartModeLabel = t("news.chart-mode-label");
  const chartModeSourcesLabel = t("news.chart-mode-sources");
  const chartModeCountriesLabel = t("news.chart-mode-countries");
  const withoutCountryLabel = t("reports.form.sources-without-country");
  const subtitles = useMemo(
    () => ({
      day: t("news.chart-subtitles.day"),
      month: t("news.chart-subtitles.month"),
      week: t("news.chart-subtitles.week"),
    }),
    [t],
  );
  const emptyLabels = useMemo(
    () =>
      aggregation === "countries"
        ? {
            day: t("news.chart-empty-countries.day"),
            month: t("news.chart-empty-countries.month"),
            week: t("news.chart-empty-countries.week"),
          }
        : {
            day: t("news.chart-empty.day"),
            month: t("news.chart-empty.month"),
            week: t("news.chart-empty.week"),
          },
    [aggregation, t],
  );
  const chartResult = useMemo(
    () => (state.status === "success" ? state.data : null),
    [state],
  );
  const chartEntries = useMemo(
    () => chartResult?.buckets ?? [],
    [chartResult],
  );
  const granularity = chartResult?.granularity ?? "day";
  const items = useMemo(
    () => chartResult?.items ?? [],
    [chartResult],
  );
  const totalNews = useMemo(
    () => chartEntries.reduce((sum, item) => sum + item.total, 0),
    [chartEntries],
  );
  const chartData = useMemo(() => {
    const width = Math.max(containerWidth, 0);
    const height = Math.max(containerHeight, 0);
    const innerWidth = Math.max(width - CHART_MARGIN.left - CHART_MARGIN.right, 0);
    const innerHeight = Math.max(height - CHART_MARGIN.top - CHART_MARGIN.bottom, 0);
    const bucketStarts = chartEntries.map((item) => item.bucketStart);
    const maxValue = Math.max(...chartEntries.map((item) => item.total), 0);
    const maxDomainValue = Math.max(maxValue, 1);
    const xScale =
      bucketStarts.length > 0 && innerWidth > 0
        ? d3.scaleBand<string>().domain(bucketStarts).range([0, innerWidth]).padding(0.16)
        : null;
    const yScale =
      innerHeight > 0
        ? d3.scaleLinear().domain([0, maxDomainValue]).nice(Y_TICK_COUNT).range([innerHeight, 0])
        : null;

    return {
      chartHeight: height,
      chartWidth: width,
      innerHeight,
      innerWidth,
      labelIndices: getBarLabelIndices(chartEntries.length),
      ticks: yScale?.ticks(Y_TICK_COUNT) ?? [],
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
    [locale],
  );
  const shortPeriodFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      }),
    [locale],
  );
  const longDayFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }),
    [locale],
  );
  const monthFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }),
    [locale],
  );

  useEffect(() => {
    if (!tooltip || !containerRef.current || !tooltipRef.current) {
      return;
    }

    const containerRect = containerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const clampedX = Math.min(
      Math.max(tooltip.anchorX, tooltipRect.width / 2 + TOOLTIP_EDGE_PADDING),
      containerRect.width - tooltipRect.width / 2 - TOOLTIP_EDGE_PADDING,
    );

    if (tooltip.x !== clampedX) {
      setTooltip((currentTooltip) => {
        if (!currentTooltip) {
          return currentTooltip;
        }

        return {
          ...currentTooltip,
          x: clampedX,
        };
      });
    }
  }, [containerRef, tooltip]);

  function formatSourceLabel(source: string) {
    if (aggregation === "countries") {
      if (source === UNKNOWN_NEWS_COUNTRY) {
        return t("news.chart-unknown-country");
      }

      return formatSourceCountryLabel({
        country: source,
        locale,
        withoutCountryLabel,
      });
    }

    if (source === OTHER_NEWS_SOURCE) {
      return t("news.chart-other-source");
    }

    if (source === UNKNOWN_NEWS_SOURCE) {
      return t("news.chart-unknown-source");
    }

    return source;
  }

  function handleAggregationChange(nextAggregation: NewsChartAggregation) {
    if (nextAggregation === aggregation) {
      return;
    }

    setStoredNewsPageSourceChartAggregation(NEWS_PAGE_SOURCE_CHART_STORAGE_CONFIG, nextAggregation);
    setActiveIndex(null);
    setTooltip(null);
  }

  function formatAxisLabel(item: NewsChartBucket) {
    if (granularity === "month") {
      return monthFormatter.format(parseChartDate(item.bucketStart));
    }

    if (granularity === "week") {
      return shortPeriodFormatter.format(parseChartDate(item.bucketStart));
    }

    return dayAxisFormatter.format(parseChartDate(item.bucketStart));
  }

  function formatPeriodLabel(item: NewsChartBucket) {
    if (granularity === "month") {
      return monthFormatter.format(parseChartDate(item.bucketStart));
    }

    if (granularity === "week") {
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

  function updateTooltipPosition(anchorX: number, anchorY: number, index: number, item: NewsChartBucket) {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const nextPeriodLabel = formatPeriodLabel(item);
    const currentTooltip = tooltipStateRef.current;

    if (
      activeIndexRef.current === index &&
      currentTooltip &&
      currentTooltip.anchorX === anchorX &&
      currentTooltip.anchorY === anchorY &&
      currentTooltip.periodLabel === nextPeriodLabel &&
      currentTooltip.total === item.total
    ) {
      return;
    }

    setTooltip({
      anchorX,
      anchorY,
      periodLabel: nextPeriodLabel,
      segments: item.segments,
      total: item.total,
      x: anchorX,
      y: anchorY,
    });
    setActiveIndex(index);
  }

  function updateTooltipFromBar(
    eventTarget: EventTarget & SVGRectElement,
    index: number,
    item: NewsChartBucket,
  ) {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const barRect = eventTarget.getBoundingClientRect();

    updateTooltipPosition(
      barRect.left - containerRect.left + barRect.width / 2,
      barRect.top - containerRect.top + barRect.height / 2,
      index,
      item,
    );
  }

  function clearTooltip() {
    if (activeIndexRef.current === null && tooltipStateRef.current === null) {
      return;
    }

    setActiveIndex(null);
    setTooltip(null);
  }

  function handleBarKeyDown(
    event: KeyboardEvent<SVGRectElement>,
    index: number,
    item: NewsChartBucket,
  ) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    updateTooltipFromBar(event.currentTarget, index, item);
  }

  if (state.status === "error") {
    return <p className={styles["news-page-chart-error"]}>{t("news.chart-error")}</p>;
  }

  return (
    <section className={styles["news-page-chart-card"]}>
      <div className={styles["news-page-chart-header"]}>
        <div className={styles["news-page-chart-copy"]}>
          <h2 className={styles["news-page-chart-title"]}>{title}</h2>
          <p className={styles["news-page-chart-subtitle"]}>
            {state.status === "success"
              ? subtitles[granularity]
              : t(
                  aggregation === "countries"
                    ? "news.chart-loading-countries"
                    : "news.chart-loading-sources",
                )}
          </p>
        </div>
        <div
          aria-label={chartModeLabel}
          className={styles["news-page-chart-switcher"]}
          role="group"
        >
          <button
            aria-pressed={aggregation === "sources"}
            className={[
              styles["news-page-chart-switcher-button"],
              aggregation === "sources" ? styles["news-page-chart-switcher-button-active"] : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => handleAggregationChange("sources")}
            type="button"
          >
            {chartModeSourcesLabel}
          </button>
          <button
            aria-pressed={aggregation === "countries"}
            className={[
              styles["news-page-chart-switcher-button"],
              aggregation === "countries" ? styles["news-page-chart-switcher-button-active"] : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => handleAggregationChange("countries")}
            type="button"
          >
            {chartModeCountriesLabel}
          </button>
        </div>
      </div>

      {items.length > 0 ? (
                <div
                  aria-label={legendLabel}
                  className={styles["news-page-chart-legend"]}
                  role="list"
                >
          {items.map((source) => (
            <div className={styles["news-page-chart-legend-item"]} key={source} role="listitem">
              <span
                className={styles["news-page-chart-legend-swatch"]}
                style={{ backgroundColor: getNewsChartItemColor(source, aggregation) }}
              />
              <span className={styles["news-page-chart-legend-text"]}>{formatSourceLabel(source)}</span>
            </div>
          ))}
        </div>
      ) : null}

      <div className={styles["news-page-chart-frame"]} ref={containerRef}>
        {state.status === "loading" ? (
          <div aria-hidden="true" className={styles["news-page-chart-skeleton"]}>
            <div className={styles["news-page-chart-skeleton-columns"]}>
              {Array.from({ length: 10 }, (_, index) => (
                <div className={styles["news-page-chart-skeleton-column"]} key={index}>
                  <span
                    className={styles["news-page-chart-skeleton-bar"]}
                    style={{ height: `${36 + (index % 5) * 10}%` }}
                  />
                  <span className={styles["news-page-chart-skeleton-axis-label"]} />
                </div>
              ))}
            </div>
          </div>
        ) : totalNews === 0 ? (
          <div className={styles["news-page-chart-empty"]}>{emptyLabels[granularity]}</div>
        ) : chartData.chartWidth > 0 && chartData.chartHeight > 0 && chartData.xScale && chartData.yScale ? (
          <>
            <svg
              aria-label={title}
              className={styles["news-page-chart-svg"]}
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
                        className={styles["news-page-chart-grid-line"]}
                        x1={0}
                        x2={chartData.innerWidth}
                        y1={y}
                        y2={y}
                      />
                      <line className={styles["news-page-chart-tick-line"]} x1={-6} x2={0} y1={y} y2={y} />
                      <text
                        className={styles["news-page-chart-y-axis-label"]}
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
                  className={styles["news-page-chart-axis-line"]}
                  x1={0}
                  x2={0}
                  y1={0}
                  y2={chartData.innerHeight}
                />
                <line
                  className={styles["news-page-chart-axis-line"]}
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
                    styles["news-page-chart-bar-group"],
                    styles["news-page-chart-bar-group-interactive"],
                    isActive ? styles["news-page-chart-bar-group-active"] : "",
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
                            key={`${item.bucketStart}-${segment.key}-${segmentIndex}`}
                            className={styles["news-page-chart-bar-segment"]}
                            fill={getNewsChartItemColor(segment.key, aggregation)}
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
                        className={styles["news-page-chart-bar-hitbox"]}
                        height={chartData.innerHeight}
                        onBlur={clearTooltip}
                        onFocus={(event) => updateTooltipFromBar(event.currentTarget, index, item)}
                        onKeyDown={(event) => handleBarKeyDown(event, index, item)}
                        onMouseEnter={(event) => updateTooltipFromBar(event.currentTarget, index, item)}
                        onMouseLeave={clearTooltip}
                        tabIndex={0}
                        width={barWidth}
                        x={x}
                        y={0}
                      />
                      {chartData.labelIndices.has(index) ? (
                        <g transform={`translate(${x + barWidth / 2}, ${chartData.innerHeight})`}>
                          <line className={styles["news-page-chart-tick-line"]} y1={0} y2={8} />
                          <text
                            className={styles["news-page-chart-x-axis-label"]}
                            textAnchor="middle"
                            y={24}
                          >
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
              <div
                className={[
                  styles["news-page-chart-tooltip"],
                  styles["news-page-chart-tooltip-above"],
                ].join(" ")}
                ref={tooltipRef}
                style={{ left: tooltip.x, top: tooltip.y }}
              >
                <div className={styles["news-page-chart-tooltip-date"]}>{tooltip.periodLabel}</div>
                <div className={styles["news-page-chart-tooltip-value"]}>
                  {totalLabel}: {tooltip.total}
                </div>
                {tooltip.segments.length > 0 ? (
                  <hr className={styles["news-page-chart-tooltip-divider"]} />
                ) : null}
                <div className={styles["news-page-chart-tooltip-segments"]}>
                  {tooltip.segments.map((segment) => (
                    <div className={styles["news-page-chart-tooltip-segment"]} key={segment.key}>
                      <span
                        className={styles["news-page-chart-legend-swatch"]}
                        style={{ backgroundColor: getNewsChartItemColor(segment.key, aggregation) }}
                      />
                      <span className={styles["news-page-chart-tooltip-segment-label"]}>
                        {formatSourceLabel(segment.key)}
                      </span>
                      <span className={styles["news-page-chart-tooltip-segment-value"]}>
                        {segment.total}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}
