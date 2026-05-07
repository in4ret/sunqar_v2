"use client";

import { useEffect, useId, useRef, useState } from "react";
import styles from "./multi-select.module.scss";

type MultiSelectOption = {
  label: string;
  value: string;
};

type MultiSelectProps = {
  "aria-label"?: string;
  disabled?: boolean;
  emptyLabel?: string;
  name?: string;
  onChange?: (value: string[]) => void;
  options: MultiSelectOption[];
  placeholder?: string;
  removeButtonLabel?: (label: string) => string;
  value: string[];
};

export function MultiSelect({
  "aria-label": ariaLabel,
  disabled = false,
  emptyLabel,
  name,
  onChange,
  options,
  placeholder,
  removeButtonLabel,
  value,
}: MultiSelectProps) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const selectedOptions = value
    .map((selectedValue) => options.find((option) => option.value === selectedValue))
    .filter((option): option is MultiSelectOption => option !== undefined);
  const availableOptions = options.filter((option) => !value.includes(option.value));
  const clampedActiveIndex = Math.min(activeIndex, Math.max(availableOptions.length - 1, 0));

  function updateSelectedValues(nextValue: string[]) {
    onChange?.(nextValue);
  }

  function closeDropdown({ restoreFocus }: { restoreFocus: boolean }) {
    setIsOpen(false);

    if (restoreFocus) {
      buttonRef.current?.focus();
    }
  }

  function selectValue(nextValue: string) {
    if (disabled || value.includes(nextValue)) {
      return;
    }

    updateSelectedValues([...value, nextValue]);
    closeDropdown({ restoreFocus: true });
  }

  function removeValue(valueToRemove: string) {
    if (disabled) {
      return;
    }

    updateSelectedValues(
      value.filter((selectedValue) => selectedValue !== valueToRemove),
    );
  }

  function getOptionId(index: number) {
    return `${listboxId}-option-${index}`;
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        closeDropdown({ restoreFocus: true });
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen]);

  return (
    <div ref={rootRef} className={styles["multi-select-root"]}>
      {name ? <input name={name} type="hidden" value={value.join(", ")} /> : null}
      <div
        ref={buttonRef}
        aria-activedescendant={
          isOpen && availableOptions.length > 0 ? getOptionId(clampedActiveIndex) : undefined
        }
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        aria-disabled={disabled}
        className={styles["multi-select"]}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => {
          if (disabled) {
            return;
          }

          setIsOpen((currentIsOpen) => !currentIsOpen);
        }}
        onKeyDown={(event) => {
          if (disabled) {
            return;
          }

          if (event.key === "ArrowDown") {
            event.preventDefault();
            if (!isOpen) {
              setIsOpen(true);
              setActiveIndex(0);
              return;
            }

            setActiveIndex((currentIndex) =>
              availableOptions.length === 0
                ? 0
                : (currentIndex + 1 + availableOptions.length) % availableOptions.length,
            );
          }

          if (event.key === "ArrowUp") {
            event.preventDefault();
            if (!isOpen) {
              setIsOpen(true);
              setActiveIndex(Math.max(availableOptions.length - 1, 0));
              return;
            }

            setActiveIndex((currentIndex) =>
              availableOptions.length === 0
                ? 0
                : (currentIndex - 1 + availableOptions.length) % availableOptions.length,
            );
          }

          if (event.key === "Home") {
            event.preventDefault();
            setIsOpen(true);
            setActiveIndex(0);
          }

          if (event.key === "End") {
            event.preventDefault();
            setIsOpen(true);
            setActiveIndex(Math.max(availableOptions.length - 1, 0));
          }

          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();

            if (!isOpen) {
              setIsOpen(true);
              return;
            }

            const activeOption = availableOptions[clampedActiveIndex];

            if (activeOption) {
              selectValue(activeOption.value);
            }
          }

          if (event.key === "Escape") {
            closeDropdown({ restoreFocus: true });
          }

          if (event.key === "Tab") {
            closeDropdown({ restoreFocus: false });
          }
        }}
      >
        <div className={styles["multi-select-content"]}>
          {selectedOptions.length > 0 ? (
            <div className={styles["multi-select-chips"]}>
              {selectedOptions.map((option) => (
                <span key={option.value} className={styles["multi-select-chip"]}>
                  <span className={styles["multi-select-chip-label"]}>{option.label}</span>
                  <button
                    aria-label={removeButtonLabel?.(option.label) ?? option.label}
                    className={styles["multi-select-chip-remove"]}
                    disabled={disabled}
                    type="button"
                    onKeyDown={(event) => {
                      event.stopPropagation();
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      removeValue(option.value);
                    }}
                  >
                    <span aria-hidden="true">&times;</span>
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <span className={styles["multi-select-placeholder"]}>{placeholder}</span>
          )}
        </div>
        <span className={styles["multi-select-chevron"]} aria-hidden="true" />
      </div>
      {isOpen ? (
        <div
          id={listboxId}
          className={styles["multi-select-list"]}
          role="listbox"
        >
          {availableOptions.length > 0 ? (
            availableOptions.map((option, index) => {
              const isActive = index === clampedActiveIndex;

              return (
                <div
                  key={option.value}
                  aria-selected="false"
                  className={styles["multi-select-option"]}
                  data-active={isActive}
                  id={getOptionId(index)}
                  role="option"
                  onMouseEnter={() => {
                    setActiveIndex(index);
                  }}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    selectValue(option.value);
                  }}
                >
                  {option.label}
                </div>
              );
            })
          ) : (
            <div className={styles["multi-select-empty"]}>{emptyLabel}</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
