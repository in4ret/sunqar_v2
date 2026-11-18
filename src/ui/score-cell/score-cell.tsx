import { type CSSProperties } from "react";

import styles from "./score-cell.module.scss";

const SCORE_COLOR_STOPS = {
  error: {
    dark: [178, 75, 82],
    light: [249, 223, 223],
  },
  success: {
    dark: [45, 122, 87],
    light: [223, 244, 234],
  },
  warning: {
    dark: [182, 125, 24],
    light: [249, 235, 204],
  },
} as const;
const NEUTRAL_SCORE_CELL_STYLE = {
  "--score-cell-background-end": "var(--bg-elevated)",
  "--score-cell-background-start": "color-mix(in srgb, var(--bg-elevated) 92%, white)",
} as CSSProperties;

type RgbColor = readonly [number, number, number];

function clampScore(value: number) {
  return Math.max(0, Math.min(1, value));
}

function interpolateChannel(start: number, end: number, factor: number) {
  return Math.round(start + (end - start) * factor);
}

function interpolateRgbColor(start: RgbColor, end: RgbColor, factor: number): RgbColor {
  return [
    interpolateChannel(start[0], end[0], factor),
    interpolateChannel(start[1], end[1], factor),
    interpolateChannel(start[2], end[2], factor),
  ];
}

function mixRgbColor(color: RgbColor, target: RgbColor, factor: number): RgbColor {
  return interpolateRgbColor(color, target, factor);
}

function rgbColorToCssValue(color: RgbColor) {
  return `rgb(${color[0]} ${color[1]} ${color[2]})`;
}

function getScoreBaseColor(score: number): RgbColor {
  const normalizedScore = clampScore(score);

  if (normalizedScore <= 0.5) {
    return interpolateRgbColor(
      SCORE_COLOR_STOPS.success.light,
      SCORE_COLOR_STOPS.warning.light,
      normalizedScore / 0.5,
    );
  }

  return interpolateRgbColor(
    SCORE_COLOR_STOPS.warning.light,
    SCORE_COLOR_STOPS.error.light,
    (normalizedScore - 0.5) / 0.5,
  );
}

function getScoreCellStyle(score: number): CSSProperties {
  if (!Number.isFinite(score)) {
    return NEUTRAL_SCORE_CELL_STYLE;
  }

  const baseColor = getScoreBaseColor(score);
  const gradientStartColor = mixRgbColor(baseColor, [255, 255, 255], 0.26);
  const gradientEndColor = mixRgbColor(baseColor, [0, 0, 0], 0.04);

  return {
    "--score-cell-background-end": rgbColorToCssValue(gradientEndColor),
    "--score-cell-background-start": rgbColorToCssValue(gradientStartColor),
  } as CSSProperties;
}

export function ScoreCell({ value }: { value: number }) {
  return (
    <span className={styles["score-cell"]} style={getScoreCellStyle(value)}>
      {value}
    </span>
  );
}
