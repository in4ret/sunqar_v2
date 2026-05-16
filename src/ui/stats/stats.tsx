"use client";

import { formatCompactNumber } from "@/lib/utils";

import styles from "./stats.module.scss";

export type StatsItem = {
  title: string;
  tooltip?: string;
  value: {
    total: number;
    today: number;
  };
};

type StatsProps = {
  className?: string;
  loading?: boolean;
  stats: StatsItem[];
};

export function Stats({ className, loading = false, stats }: StatsProps) {
  const classNames = [styles["wrapper"], className, loading ? styles["loading"] : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classNames}>
      {stats.map((stat, index) => {
        const key = `${stat.title}-${index}`;
        const total = formatCompactNumber(stat.value.total);
        const today = formatCompactNumber(stat.value.today);

        return (
          <div key={key} className={styles["item"]}>
            <div className={styles["title"]}>{stat.title}</div>
            <div aria-label={stat.tooltip} className={styles["value"]} title={stat.tooltip}>
              {`${total} | ${today}`}
            </div>
          </div>
        );
      })}
    </div>
  );
}
