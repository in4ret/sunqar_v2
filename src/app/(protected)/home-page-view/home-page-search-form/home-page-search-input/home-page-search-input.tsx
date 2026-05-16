"use client";

import { useRef } from "react";

import styles from "../../../page.module.scss";

type HomePageSearchInputProps = {
  clearLabel: string;
  name: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
};

export function HomePageSearchInput({
  clearLabel,
  name,
  onChange,
  placeholder,
  value,
}: HomePageSearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleClear() {
    onChange("");
    inputRef.current?.focus();
  }

  return (
    <span className={styles["home-page-search-input-wrapper"]}>
      <input
        ref={inputRef}
        className={styles["home-page-search-input"]}
        name={name}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type="text"
        value={value}
      />
      {value ? (
        <button
          aria-label={clearLabel}
          className={styles["home-page-search-clear"]}
          onClick={handleClear}
          type="button"
        >
          ×
        </button>
      ) : null}
    </span>
  );
}
