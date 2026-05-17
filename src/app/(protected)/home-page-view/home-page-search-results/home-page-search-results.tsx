"use client";

import { type ReactNode, useState } from "react";

import { Stats, type StatsItem } from "@/ui";

import { HomePageSearchForm } from "../home-page-search-form/home-page-search-form";

import styles from "../../page.module.scss";

type HomePageSearchResultsProps = {
  children?: ReactNode;
  searchQuery: string;
  stats: StatsItem[];
};

export function HomePageSearchResults({
  children,
  searchQuery,
  stats,
}: HomePageSearchResultsProps) {
  const [isSearchDirty, setIsSearchDirty] = useState(false);
  const resultsClassName = [
    styles["home-page-search-results"],
    isSearchDirty ? styles["home-page-search-results-blurred"] : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <HomePageSearchForm onSearchDirtyChange={setIsSearchDirty} searchQuery={searchQuery} />
      <div className={resultsClassName}>
        <Stats stats={stats} />
        {children}
      </div>
    </>
  );
}
