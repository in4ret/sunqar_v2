import "server-only";

import { manticoreSql } from "@/lib/manticore";
import { normalizeSearchQuery } from "@/lib/utils";

import type {
  CommentsChartPoint,
  CommentsChartResult,
} from "./comments-chart.types";
import {
  MAX_CHART_POINTS,
  normalizeCommentsChartSourceTotals,
} from "./comments-chart-shared";
import {
  buildCommentsWhereClause,
  type CommentsQueryInput,
  normalizeCommentsQueryInput,
} from "./comments-filters";

type RawCommentsChartPoint = {
  comment?: number | string | null;
  comment_id?: number | string | null;
  content_id?: number | string | null;
  id?: number | string | null;
  publishedat?: number | string | null;
  row_id?: number | string | null;
  source?: number | string | null;
  threat?: number | string | null;
  toxic?: number | string | null;
  username?: number | string | null;
};

type CountRow = {
  total: number | string;
};

type SourceTotalRow = {
  source?: number | string | null;
  total?: number | string | null;
};

const MAX_MANTICORE_MATCHES = 10000;

function normalizeNumberValue(value: number | string | null | undefined) {
  const normalizedValue = Number(value ?? 0);

  return Number.isFinite(normalizedValue) ? normalizedValue : null;
}

function normalizeScore(score: number) {
  if (!Number.isFinite(score)) {
    return null;
  }

  return Math.max(0, Math.min(1, score));
}

function normalizeCommentsChartPoint(row: RawCommentsChartPoint): CommentsChartPoint | null {
  const rawId = row.row_id ?? row.id;
  const publishedat = normalizeNumberValue(row.publishedat);
  const toxic = normalizeScore(normalizeNumberValue(row.toxic) ?? Number.NaN);
  const threat = normalizeScore(normalizeNumberValue(row.threat) ?? Number.NaN);

  if (rawId === null || typeof rawId === "undefined" || String(rawId) === "") {
    return null;
  }

  if (publishedat === null || toxic === null || threat === null) {
    return null;
  }

  return {
    comment: row.comment === null || typeof row.comment === "undefined" ? "" : String(row.comment),
    comment_id:
      row.comment_id === null || typeof row.comment_id === "undefined" ? "" : String(row.comment_id),
    content_id:
      row.content_id === null || typeof row.content_id === "undefined" ? "" : String(row.content_id),
    id: String(rawId),
    publishedat,
    source: row.source === null || typeof row.source === "undefined" ? "" : String(row.source),
    threat,
    toxic,
    username: row.username === null || typeof row.username === "undefined" ? "" : String(row.username),
  };
}

function buildCommentChartWhereClause(input: CommentsQueryInput, extraConditions: string[] = []) {
  const normalizedInput = normalizeCommentsQueryInput(input);

  return buildCommentsWhereClause(
    normalizeSearchQuery(normalizedInput.query),
    normalizedInput.posts,
    normalizedInput.from,
    normalizedInput.to,
    extraConditions,
  );
}

export function sampleCommentsChartPoints(
  points: CommentsChartPoint[],
  total: number,
  maxPoints = MAX_CHART_POINTS,
) {
  if (points.length <= maxPoints || total <= maxPoints) {
    return points.slice(0, maxPoints);
  }

  const step = Math.max(1, Math.ceil(total / maxPoints));
  const sampledPoints: CommentsChartPoint[] = [];

  for (let index = 0; index < points.length; index += step) {
    sampledPoints.push(points[index]);

    if (sampledPoints.length >= maxPoints) {
      break;
    }
  }

  if (sampledPoints.length < maxPoints && points.length > 0) {
    const reverseStep = Math.max(1, Math.floor(points.length / Math.max(1, maxPoints - sampledPoints.length)));

    for (let index = points.length - 1; index >= 0; index -= reverseStep) {
      const point = points[index];

      if (!point || sampledPoints.some((sampledPoint) => sampledPoint.id === point.id)) {
        continue;
      }

      sampledPoints.push(point);

      if (sampledPoints.length >= maxPoints) {
        break;
      }
    }
  }

  return sampledPoints
    .sort((left, right) => {
      if (right.publishedat !== left.publishedat) {
        return right.publishedat - left.publishedat;
      }

      return right.id.localeCompare(left.id, "en");
    })
    .slice(0, maxPoints);
}

async function fetchCommentsChartPoints(
  input: CommentsQueryInput,
  limit?: number,
  extraConditions: string[] = [],
) {
  const whereClause = buildCommentChartWhereClause(input, extraConditions);
  const limitClause = typeof limit === "number" ? ` LIMIT 0, ${limit}` : "";

  const rows = await manticoreSql<RawCommentsChartPoint>(
    `SELECT TO_STRING(id) AS row_id, source, content_id, comment_id, comment, username, publishedat, toxic, threat FROM comments${whereClause} ORDER BY publishedat DESC, id DESC${limitClause} OPTION max_matches=${MAX_MANTICORE_MATCHES}`,
  );

  return rows
    .map((row) => normalizeCommentsChartPoint(row))
    .filter((row): row is CommentsChartPoint => row !== null);
}

export async function listCommentsChartPoints(input: CommentsQueryInput): Promise<CommentsChartResult> {
  const normalizedInput = normalizeCommentsQueryInput(input);
  const whereClause = buildCommentChartWhereClause(normalizedInput);
  const [countRows, sourceTotalRows] = await Promise.all([
    manticoreSql<CountRow>(
      `SELECT COUNT(*) AS total FROM comments${whereClause} OPTION max_matches=${MAX_MANTICORE_MATCHES}`,
    ),
    manticoreSql<SourceTotalRow>(
      `SELECT source, COUNT(*) AS total FROM comments${whereClause} GROUP BY source ORDER BY source ASC OPTION max_matches=${MAX_MANTICORE_MATCHES}`,
    ),
  ]);
  const total = Number(countRows[0]?.total ?? 0);
  const sourceTotals = normalizeCommentsChartSourceTotals(sourceTotalRows);

  if (total <= 0) {
    return {
      isSampled: false,
      points: [],
      sampleTotal: 0,
      sourceTotals,
      total: 0,
    };
  }

  if (total <= MAX_CHART_POINTS) {
    const points = await fetchCommentsChartPoints(normalizedInput, MAX_CHART_POINTS);

    return {
      isSampled: false,
      points,
      sampleTotal: points.length,
      sourceTotals,
      total,
    };
  }

  const points = await fetchCommentsChartPoints(normalizedInput, MAX_MANTICORE_MATCHES);
  const sampledPoints = sampleCommentsChartPoints(points, total, MAX_CHART_POINTS);

  return {
    isSampled: true,
    points: sampledPoints,
    sampleTotal: sampledPoints.length,
    sourceTotals,
    total,
  };
}
