"use client";

import { useRef } from "react";

import { XIcon } from "../icon/icon";

import styles from "./search-input.module.scss";

type SearchInputProps = {
  clearLabel: string;
  name: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
};

export function SearchInput({
  clearLabel,
  name,
  onChange,
  placeholder,
  value,
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleClear() {
    onChange("");
    inputRef.current?.focus();
  }

  return (
    <span className={styles["search-input-wrapper"]}>
      <input
        ref={inputRef}
        className={styles["search-input"]}
        name={name}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type="text"
        value={value}
      />
      {value ? (
        <button
          aria-label={clearLabel}
          className={styles["search-input-clear"]}
          onClick={handleClear}
          type="button"
        >
          <XIcon className={styles["search-input-clear-icon"]} />
        </button>
      ) : null}
    </span>
  );
}
