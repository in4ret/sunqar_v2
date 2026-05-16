import { type ReactNode, Suspense } from "react";

import styles from "./stats.module.scss";

export type StatsItem = {
  fallbackValue?: ReactNode;
  title: string;
  tooltip?: string;
  value: ReactNode;
};

type StatsProps = {
  className?: string;
  stats: StatsItem[];
};

export function StatsValueSkeleton() {
  return <span aria-hidden="true" className={styles["value-skeleton"]} />;
}

export function Stats({ className, stats }: StatsProps) {
  const classNames = [styles["wrapper"], className].filter(Boolean).join(" ");

  return (
    <div className={classNames}>
      {stats.map((stat, index) => {
        const key = `${stat.title}-${index}`;

        return (
          <div key={key} className={styles["item"]}>
            <div className={styles["title"]}>{stat.title}</div>
            <div aria-label={stat.tooltip} className={styles["value"]} title={stat.tooltip}>
              <Suspense fallback={stat.fallbackValue ?? <StatsValueSkeleton />}>
                {stat.value}
              </Suspense>
            </div>
          </div>
        );
      })}
    </div>
  );
}
