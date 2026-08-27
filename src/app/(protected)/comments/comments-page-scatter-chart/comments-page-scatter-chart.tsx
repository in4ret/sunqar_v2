"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";

import * as d3 from "d3";

import { useSize } from "@/hooks/use-size";
import type {
  CommentsChartPoint,
  CommentsChartResult,
  CommentsChartSourceTotal,
} from "@/lib/comments/comments-chart.types";
import {
  formatCommentsChartSourceLabel,
  getCommentsSourceIconSrc,
  getSampledCommentsChartSubtitleValues,
  normalizeCommentsChartSource,
} from "@/lib/comments/comments-chart-shared";

import {
  areCommentsPageChartSourcesEqual,
  filterCommentsChartPointsBySources,
  resolveCommentsPageChartSelectedSources,
  toggleCommentsPageChartSourceSelection,
} from "./comments-page-scatter-chart-source-selection";
import {
  COMMENTS_PAGE_SCATTER_CHART_STORAGE_CONFIG,
  setStoredCommentsPageChartSources,
  useStoredCommentsPageChartSources,
} from "./comments-page-scatter-chart-storage";

import styles from "./comments-page-scatter-chart.module.scss";

type CommentsPageScatterChartProps = {
  hasLoadedStoredPosts: boolean;
  searchFrom: string;
  searchQuery: string;
  searchTo: string;
  searchTrigger: number;
  selectedPosts: string[];
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
      data: CommentsChartResult;
      status: "success";
    };

type TooltipState = {
  anchorBottomY: number;
  anchorX: number;
  anchorTopY: number;
  placement: "above" | "below";
  point: CommentsChartPoint;
  x: number;
  y: number;
};

const CHART_MARGIN = {
  top: 10,
  right: 26,
  bottom: 52,
  left: 58,
};
const TOOLTIP_EDGE_PADDING = 12;
const TOOLTIP_OFFSET = 10;
const MAX_TOOLTIP_COMMENT_LENGTH = 200;
const SCORE_TICKS = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];
const SOURCE_COLOR_OVERRIDES: Record<string, string> = {
  ig: "#f43f5e",
  tiktok: "#7c5cff",
  youtube: "#f97316",
};
const FALLBACK_SOURCE_COLOR = "#9aa5b4";
const SKELETON_POINTS = [
  { opacity: 0.58, size: 0.9, x: 0.06, y: 0.84 },
  { opacity: 0.72, size: 1.05, x: 0.12, y: 0.68 },
  { opacity: 0.52, size: 0.82, x: 0.18, y: 0.56 },
  { opacity: 0.66, size: 0.96, x: 0.21, y: 0.28 },
  { opacity: 0.61, size: 1.1, x: 0.27, y: 0.78 },
  { opacity: 0.79, size: 0.88, x: 0.32, y: 0.63 },
  { opacity: 0.57, size: 0.78, x: 0.37, y: 0.46 },
  { opacity: 0.74, size: 1.14, x: 0.41, y: 0.19 },
  { opacity: 0.64, size: 0.86, x: 0.48, y: 0.71 },
  { opacity: 0.68, size: 1.02, x: 0.54, y: 0.53 },
  { opacity: 0.55, size: 0.8, x: 0.58, y: 0.34 },
  { opacity: 0.76, size: 1.16, x: 0.62, y: 0.14 },
  { opacity: 0.63, size: 0.92, x: 0.69, y: 0.61 },
  { opacity: 0.59, size: 0.84, x: 0.73, y: 0.41 },
  { opacity: 0.71, size: 1.08, x: 0.79, y: 0.83 },
  { opacity: 0.62, size: 0.88, x: 0.84, y: 0.57 },
  { opacity: 0.77, size: 1.12, x: 0.89, y: 0.24 },
  { opacity: 0.53, size: 0.76, x: 0.94, y: 0.48 },
] as const;
const SKELETON_LEGEND_ITEMS = [
  { width: "82%" },
  { width: "68%" },
  { width: "76%" },
] as const;

function clampScore(value: number) {
  return Math.max(0, Math.min(1, value));
}

function getSourceColor(source: string) {
  const normalizedSource = normalizeCommentsChartSource(source);

  return SOURCE_COLOR_OVERRIDES[normalizedSource] ?? FALLBACK_SOURCE_COLOR;
}

function formatScoreTickLabel(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function formatTooltipScore(value: number) {
  return `${Math.round(clampScore(value) * 100)}%`;
}

function isValidExternalUrl(value: string) {
  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function buildYoutubeCommentHref(contentId: string, commentId: string) {
  const normalizedContentId = contentId.trim();
  const normalizedCommentId = commentId.trim();

  if (!normalizedContentId || !normalizedCommentId) {
    return null;
  }

  return `https://www.youtube.com/watch?v=${encodeURIComponent(normalizedContentId)}&lc=${encodeURIComponent(normalizedCommentId)}`;
}

function buildYoutubeThumbnailSrc(contentId: string) {
  const normalizedContentId = contentId.trim();

  if (!normalizedContentId) {
    return null;
  }

  return `https://i.ytimg.com/vi/${encodeURIComponent(normalizedContentId)}/hqdefault.jpg`;
}

function buildPointHref(point: CommentsChartPoint) {
  if (point.source === "youtube") {
    return buildYoutubeCommentHref(point.content_id, point.comment_id);
  }

  return isValidExternalUrl(point.content_id) ? point.content_id : null;
}

function truncateComment(value: string) {
  if (value.length <= MAX_TOOLTIP_COMMENT_LENGTH) {
    return value;
  }

  return `${value.slice(0, MAX_TOOLTIP_COMMENT_LENGTH)}…`;
}

function isCommentsChartResult(value: unknown): value is CommentsChartResult {
  if (!value || typeof value !== "object") {
    return false;
  }

  const result = value as Partial<CommentsChartResult>;

  return (
    typeof result.total === "number" &&
    typeof result.sampleTotal === "number" &&
    typeof result.isSampled === "boolean" &&
    Array.isArray(result.sourceTotals) &&
    result.sourceTotals.every(
      (sourceTotal) =>
        sourceTotal &&
        typeof sourceTotal === "object" &&
        typeof (sourceTotal as Partial<CommentsChartSourceTotal>).source === "string" &&
        typeof (sourceTotal as Partial<CommentsChartSourceTotal>).total === "number",
    ) &&
    Array.isArray(result.points) &&
    result.points.every(
      (point) =>
        point &&
        typeof point === "object" &&
        typeof (point as Partial<CommentsChartPoint>).id === "string" &&
        typeof (point as Partial<CommentsChartPoint>).source === "string" &&
        typeof (point as Partial<CommentsChartPoint>).content_id === "string" &&
        typeof (point as Partial<CommentsChartPoint>).comment_id === "string" &&
        typeof (point as Partial<CommentsChartPoint>).comment === "string" &&
        typeof (point as Partial<CommentsChartPoint>).username === "string" &&
        typeof (point as Partial<CommentsChartPoint>).publishedat === "number" &&
        typeof (point as Partial<CommentsChartPoint>).toxic === "number" &&
        typeof (point as Partial<CommentsChartPoint>).threat === "number",
    )
  );
}

export function CommentsPageScatterChart({
  hasLoadedStoredPosts,
  searchFrom,
  searchQuery,
  searchTo,
  searchTrigger,
  selectedPosts,
}: CommentsPageScatterChartProps) {
  const locale = useLocale();
  const t = useTranslations();
  const { ref: containerRef, height: containerHeight, width: containerWidth } =
    useSize<HTMLDivElement>(100);
  const [state, setState] = useState<ChartState>({ status: "loading" });
  const [activePointId, setActivePointId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const selectedPostsRef = useRef(selectedPosts);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const storedSelectedSources = useStoredCommentsPageChartSources(
    COMMENTS_PAGE_SCATTER_CHART_STORAGE_CONFIG,
  );

  useEffect(() => {
    selectedPostsRef.current = selectedPosts;
  }, [selectedPosts]);

  useEffect(() => {
    if (!hasLoadedStoredPosts) {
      return;
    }

    const abortController = new AbortController();

    async function loadChart() {
      setState({ status: "loading" });

      try {
        const response = await fetch("/api/comments/chart", {
          body: JSON.stringify({
            from: searchFrom,
            posts: selectedPostsRef.current,
            query: searchQuery,
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

        const payload = (await response.json()) as unknown;

        if (!isCommentsChartResult(payload)) {
          throw new Error("Response payload is invalid.");
        }

        setState({
          data: payload,
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
  }, [hasLoadedStoredPosts, searchFrom, searchQuery, searchTo, searchTrigger]);

  const result = state.status === "success" ? state.data : null;
  const points = useMemo(() => result?.points ?? [], [result]);
  const legendSources = useMemo(() => {
    return (result?.sourceTotals ?? []).map((sourceTotal) => ({
      iconSrc: getCommentsSourceIconSrc(sourceTotal.source),
      label: formatCommentsChartSourceLabel(sourceTotal.source),
      total: sourceTotal.total,
      value: normalizeCommentsChartSource(sourceTotal.source),
    }));
  }, [result]);
  const availableSourceValues = useMemo(
    () => legendSources.map((source) => source.value),
    [legendSources],
  );
  const effectiveSelectedSources = useMemo(
    () => resolveCommentsPageChartSelectedSources(availableSourceValues, storedSelectedSources),
    [availableSourceValues, storedSelectedSources],
  );
  const selectedSourceSet = useMemo(
    () => new Set(effectiveSelectedSources),
    [effectiveSelectedSources],
  );
  const visiblePoints = useMemo(
    () => filterCommentsChartPointsBySources(points, effectiveSelectedSources),
    [effectiveSelectedSources, points],
  );
  const visiblePointIds = useMemo(
    () => new Set(visiblePoints.map((point) => point.id)),
    [visiblePoints],
  );
  const chartData = useMemo(() => {
    const width = Math.max(containerWidth, 0);
    const height = Math.max(containerHeight, 0);
    const innerWidth = Math.max(width - CHART_MARGIN.left - CHART_MARGIN.right, 0);
    const innerHeight = Math.max(height - CHART_MARGIN.top - CHART_MARGIN.bottom, 0);
    const xScale =
      innerWidth > 0 ? d3.scaleLinear().domain([0, 1]).range([0, innerWidth]) : null;
    const yScale =
      innerHeight > 0 ? d3.scaleLinear().domain([0, 1]).range([innerHeight, 0]) : null;

    return {
      chartHeight: height,
      chartWidth: width,
      innerHeight,
      innerWidth,
      xScale,
      yScale,
    };
  }, [containerHeight, containerWidth]);
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
    [locale],
  );
  const title = t("comments.chart.title");
  const xAxisLabel = t("comments.chart.x-axis-label");
  const yAxisLabel = t("comments.chart.y-axis-label");
  const toxicLabel = t("comments.table.toxic");
  const threatLabel = t("comments.table.threat");
  const subtitle = useMemo(() => {
    if (!result) {
      return t("comments.chart.loading");
    }

    const sampledSubtitleValues = getSampledCommentsChartSubtitleValues(result);

    if (sampledSubtitleValues) {
      return t("comments.chart.subtitle-sampled", sampledSubtitleValues);
    }

    return t("comments.chart.subtitle");
  }, [result, t]);

  useEffect(() => {
    if (availableSourceValues.length === 0) {
      return;
    }

    const resolvedSelectedSources = resolveCommentsPageChartSelectedSources(
      availableSourceValues,
      storedSelectedSources,
    );

    if (
      !areCommentsPageChartSourcesEqual(storedSelectedSources, resolvedSelectedSources)
    ) {
      setStoredCommentsPageChartSources(
        COMMENTS_PAGE_SCATTER_CHART_STORAGE_CONFIG,
        resolvedSelectedSources,
      );
    }
  }, [availableSourceValues, storedSelectedSources]);

  useEffect(() => {
    if (!tooltip || !containerRef.current || !tooltipRef.current) {
      return;
    }

    const containerRect = containerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const preferredPlacement =
      tooltip.anchorTopY >= tooltipRect.height + TOOLTIP_OFFSET + TOOLTIP_EDGE_PADDING
        ? "above"
        : "below";
    const clampedX = Math.min(
      Math.max(tooltip.anchorX, tooltipRect.width / 2 + TOOLTIP_EDGE_PADDING),
      containerRect.width - tooltipRect.width / 2 - TOOLTIP_EDGE_PADDING,
    );
    const clampedAboveY = Math.min(
      Math.max(tooltip.anchorTopY, tooltipRect.height + TOOLTIP_OFFSET + TOOLTIP_EDGE_PADDING),
      containerRect.height - TOOLTIP_EDGE_PADDING + tooltipRect.height + TOOLTIP_OFFSET,
    );
    const clampedBelowY = Math.min(
      Math.max(tooltip.anchorBottomY, TOOLTIP_EDGE_PADDING - TOOLTIP_OFFSET),
      containerRect.height - tooltipRect.height - TOOLTIP_OFFSET - TOOLTIP_EDGE_PADDING,
    );
    const nextPlacement = preferredPlacement;
    const nextY = nextPlacement === "above" ? clampedAboveY : clampedBelowY;

    if (tooltip.x !== clampedX || tooltip.y !== nextY || tooltip.placement !== nextPlacement) {
      setTooltip((current) =>
        current
          ? {
              ...current,
              placement: nextPlacement,
              x: clampedX,
              y: nextY,
            }
          : current,
      );
    }
  }, [containerRef, tooltip]);

  useEffect(() => {
    if (
      (activePointId && !visiblePointIds.has(activePointId)) ||
      (tooltip && !visiblePointIds.has(tooltip.point.id))
    ) {
      clearTooltip();
    }
  }, [activePointId, tooltip, visiblePointIds]);

  function updateTooltip(eventTarget: EventTarget & SVGCircleElement, point: CommentsChartPoint) {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const pointRect = eventTarget.getBoundingClientRect();

    setActivePointId(point.id);
    setTooltip({
      anchorBottomY: pointRect.bottom - containerRect.top,
      anchorX: pointRect.left - containerRect.left + pointRect.width / 2,
      anchorTopY: pointRect.top - containerRect.top,
      placement: "above",
      point,
      x: pointRect.left - containerRect.left + pointRect.width / 2,
      y: pointRect.top - containerRect.top,
    });
  }

  function clearTooltip() {
    setActivePointId(null);
    setTooltip(null);
  }

  function handleSourceToggle(sourceValue: string) {
    const nextSelectedSources = toggleCommentsPageChartSourceSelection(
      effectiveSelectedSources,
      sourceValue,
      availableSourceValues,
    );

    setStoredCommentsPageChartSources(
      COMMENTS_PAGE_SCATTER_CHART_STORAGE_CONFIG,
      nextSelectedSources,
    );
  }

  if (state.status === "error") {
    return <p className={styles["comments-page-chart-error"]}>{t("comments.chart.error")}</p>;
  }

  return (
    <section className={styles["comments-page-chart-card"]}>
      <div className={styles["comments-page-chart-header"]}>
        <div className={styles["comments-page-chart-copy"]}>
          <h2 className={styles["comments-page-chart-title"]}>{title}</h2>
          <p className={styles["comments-page-chart-subtitle"]}>{subtitle}</p>
        </div>
      </div>
      <div className={styles["comments-page-chart-content"]}>
        <div
          className={styles["comments-page-chart-frame"]}
          ref={containerRef}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              clearTooltip();
            }
          }}
          onMouseLeave={() => {
            clearTooltip();
          }}
        >
          {state.status === "loading" ? (
            <div aria-hidden="true" className={styles["comments-page-chart-skeleton"]}>
              <div className={styles["comments-page-chart-skeleton-plot"]}>
                {SCORE_TICKS.map((tick) => (
                  <div
                    className={styles["comments-page-chart-skeleton-y-tick"]}
                    key={`y-${tick}`}
                    style={{ top: `${(1 - tick) * 83 + 3}%` }}
                  >
                    <span className={styles["comments-page-chart-skeleton-tick-label"]} />
                    <span className={styles["comments-page-chart-skeleton-tick-line"]} />
                  </div>
                ))}
                {SCORE_TICKS.map((tick) => (
                  <div
                    className={styles["comments-page-chart-skeleton-x-tick"]}
                    key={`x-${tick}`}
                    style={{ left: `${tick * 90 + 6}%` }}
                  >
                    <span className={styles["comments-page-chart-skeleton-tick-line"]} />
                    <span className={styles["comments-page-chart-skeleton-tick-label"]} />
                  </div>
                ))}
                {/* <span className={styles["comments-page-chart-skeleton-y-axis"]} />
                <span className={styles["comments-page-chart-skeleton-x-axis"]} /> */}
                <span className={styles["comments-page-chart-skeleton-y-axis-title"]} />
                <span className={styles["comments-page-chart-skeleton-x-axis-title"]} />
                <div className={styles["comments-page-chart-skeleton-point-cloud"]}>
                  {SKELETON_POINTS.map((point, index) => (
                    <span
                      className={styles["comments-page-chart-skeleton-dot"]}
                      key={index}
                      style={{
                        height: `${point.size}rem`,
                        left: `${point.x * 100}%`,
                        opacity: point.opacity,
                        top: `${point.y * 100}%`,
                        width: `${point.size}rem`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : visiblePoints.length === 0 ? (
            <div className={styles["comments-page-chart-empty"]}>{t("comments.chart.empty")}</div>
          ) : chartData.chartWidth > 0 && chartData.chartHeight > 0 && chartData.xScale && chartData.yScale ? (
            <>
              <svg
                aria-label={title}
                className={styles["comments-page-chart-svg"]}
                height={chartData.chartHeight}
                role="img"
                viewBox={`0 0 ${chartData.chartWidth} ${chartData.chartHeight}`}
                width={chartData.chartWidth}
              >
                <g transform={`translate(${CHART_MARGIN.left}, ${CHART_MARGIN.top})`}>
                  {SCORE_TICKS.map((tick) => {
                    const x = chartData.xScale?.(tick) ?? 0;
                    const y = chartData.yScale?.(tick) ?? 0;

                    return (
                      <g key={tick}>
                        <line
                          className={styles["comments-page-chart-grid-line"]}
                          x1={0}
                          x2={chartData.innerWidth}
                          y1={y}
                          y2={y}
                        />
                        <line
                          className={styles["comments-page-chart-grid-line"]}
                          x1={x}
                          x2={x}
                          y1={0}
                          y2={chartData.innerHeight}
                        />
                        <line className={styles["comments-page-chart-tick-line"]} x1={-6} x2={0} y1={y} y2={y} />
                        <text
                          className={styles["comments-page-chart-y-axis-label"]}
                          textAnchor="end"
                          x={-10}
                          y={y + 4}
                        >
                          {formatScoreTickLabel(tick)}
                        </text>
                        <line
                          className={styles["comments-page-chart-tick-line"]}
                          x1={x}
                          x2={x}
                          y1={chartData.innerHeight}
                          y2={chartData.innerHeight + 8}
                        />
                        <text
                          className={styles["comments-page-chart-x-axis-label"]}
                          textAnchor="middle"
                          x={x}
                          y={chartData.innerHeight + 22}
                        >
                          {formatScoreTickLabel(tick)}
                        </text>
                      </g>
                    );
                  })}
                  <line
                    className={styles["comments-page-chart-axis-line"]}
                    x1={0}
                    x2={0}
                    y1={0}
                    y2={chartData.innerHeight}
                  />
                  <line
                    className={styles["comments-page-chart-axis-line"]}
                    x1={0}
                    x2={chartData.innerWidth}
                    y1={chartData.innerHeight}
                    y2={chartData.innerHeight}
                  />
                  <text
                    className={styles["comments-page-chart-axis-title"]}
                    textAnchor="start"
                    transform={`rotate(-90)`}
                    x={-40}
                    y={-44}
                  >
                    {yAxisLabel}
                  </text>
                  <text
                    className={styles["comments-page-chart-axis-title"]}
                    textAnchor="end"
                    x={chartData.innerWidth}
                    y={chartData.innerHeight + 40}
                  >
                    {xAxisLabel}
                  </text>
                  {visiblePoints.map((point) => {
                    const x = chartData.xScale?.(clampScore(point.toxic)) ?? 0;
                    const y = chartData.yScale?.(clampScore(point.threat)) ?? 0;
                    const isActive = activePointId === point.id;

                    return (
                      <circle
                        aria-label={t("comments.chart.point-label", {
                          threat: point.threat,
                          toxic: point.toxic,
                          username: point.username || t("comments.chart.unknown-user"),
                        })}
                        className={[
                          styles["comments-page-chart-point"],
                          isActive ? styles["comments-page-chart-point-active"] : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        cx={x}
                        cy={y}
                        fill={getSourceColor(point.source)}
                        key={point.id}
                        r={isActive ? 5.4 : 4}
                        onMouseEnter={(event) => {
                          updateTooltip(event.currentTarget, point);
                        }}
                      />
                    );
                  })}
                </g>
              </svg>
              {tooltip ? (
                <div
                  className={`${styles["comments-page-chart-tooltip"]} ${
                    tooltip.placement === "below"
                      ? styles["comments-page-chart-tooltip-below"]
                      : styles["comments-page-chart-tooltip-above"]
                  }`}
                  ref={tooltipRef}
                  style={{ left: tooltip.x, top: tooltip.y }}
                >
                  {tooltip.point.source === "youtube" && buildYoutubeThumbnailSrc(tooltip.point.content_id) ? (
                    <Image
                      alt={t("comments.table.youtube-thumbnail-alt", { contentId: tooltip.point.content_id })}
                      className={styles["comments-page-chart-tooltip-image"]}
                      height={90}
                      loading="lazy"
                      src={buildYoutubeThumbnailSrc(tooltip.point.content_id) ?? ""}
                      unoptimized
                      width={160}
                    />
                  ) : null}
                  <div className={styles["comments-page-chart-tooltip-date"]}>
                    {dateFormatter.format(new Date(tooltip.point.publishedat * 1000))}
                  </div>
                  <div className={styles["comments-page-chart-tooltip-user"]}>
                    {tooltip.point.username.trim() || t("comments.chart.unknown-user")}
                  </div>
                  <div className={styles["comments-page-chart-tooltip-comment"]}>
                    {truncateComment(tooltip.point.comment)}
                  </div>
                  <div className={styles["comments-page-chart-tooltip-scores"]}>
                    <div className={styles["comments-page-chart-tooltip-score-row"]}>
                      <span className={styles["comments-page-chart-tooltip-score-label"]}>
                        {toxicLabel}
                      </span>
                      <span className={styles["comments-page-chart-tooltip-score-value"]}>
                        {formatTooltipScore(tooltip.point.toxic)}
                      </span>
                    </div>
                    <div className={styles["comments-page-chart-tooltip-score-row"]}>
                      <span className={styles["comments-page-chart-tooltip-score-label"]}>
                        {threatLabel}
                      </span>
                      <span className={styles["comments-page-chart-tooltip-score-value"]}>
                        {formatTooltipScore(tooltip.point.threat)}
                      </span>
                    </div>
                  </div>
                  <div className={styles["comments-page-chart-tooltip-link-row"]}>
                    {buildPointHref(tooltip.point) ? (
                      <a
                        className={styles["comments-page-chart-tooltip-link"]}
                        href={buildPointHref(tooltip.point) ?? undefined}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {tooltip.point.source === "youtube"
                          ? t("comments.chart.open-comment")
                          : t("comments.chart.open-video")}
                      </a>
                    ) : (
                      <span className={styles["comments-page-chart-tooltip-link-muted"]}>
                        {tooltip.point.content_id}
                      </span>
                    )}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
        {state.status === "loading" ? (
          <div
            aria-hidden="true"
            className={`${styles["comments-page-chart-legend"]} ${styles["comments-page-chart-legend-skeleton"]}`}
          >
            {SKELETON_LEGEND_ITEMS.map((item, index) => (
              <div className={styles["comments-page-chart-legend-item"]} key={index}>
                <span
                  className={`${styles["comments-page-chart-legend-swatch"]} ${styles["comments-page-chart-skeleton-swatch"]}`}
                />
                <span
                  className={styles["comments-page-chart-skeleton-legend-line"]}
                  style={{ width: item.width }}
                />
              </div>
            ))}
          </div>
        ) : legendSources.length > 0 ? (
          <div
            aria-label={t("comments.chart.legend-label")}
            className={styles["comments-page-chart-legend"]}
            role="list"
          >
            {legendSources.map((source) => (
              <div key={source.value} role="listitem">
                <button
                  aria-pressed={selectedSourceSet.has(source.value)}
                  className={[
                    styles["comments-page-chart-legend-item"],
                    selectedSourceSet.has(source.value)
                      ? styles["comments-page-chart-legend-item-selected"]
                      : styles["comments-page-chart-legend-item-unselected"],
                  ].join(" ")}
                  onClick={() => {
                    handleSourceToggle(source.value);
                  }}
                  type="button"
                >
                  <span
                    aria-hidden="true"
                    className={styles["comments-page-chart-legend-swatch"]}
                    style={{ backgroundColor: getSourceColor(source.value) }}
                  />
                  {source.iconSrc ? (
                    <Image
                      alt=""
                      aria-hidden="true"
                      className={styles["comments-page-chart-legend-icon"]}
                      height={16}
                      src={source.iconSrc}
                      width={16}
                    />
                  ) : null}
                  <span className={styles["comments-page-chart-legend-text"]}>
                    {`${source.label} (${source.total})`}
                  </span>
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
