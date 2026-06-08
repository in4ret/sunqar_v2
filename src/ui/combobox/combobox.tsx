"use client";

import { type CSSProperties, useEffect, useId, useLayoutEffect, useRef, useState } from "react";

import { createPortal } from "react-dom";

import { ChevronDownIcon } from "../icon/icon";

import styles from "./combobox.module.scss";

type ComboboxOption = {
  label: string;
  value: string;
};

type ComboboxProps = {
  "aria-label"?: string;
  defaultValue?: string;
  disabled?: boolean;
  name?: string;
  onChange?: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  value?: string;
};

type ComboboxPlacement = "top" | "bottom";

const VIEWPORT_MARGIN = 12;
const LIST_GAP = 6;
const MAX_LIST_HEIGHT = 320;
const MIN_LIST_HEIGHT = 120;

export function Combobox({
  "aria-label": ariaLabel,
  defaultValue = "",
  disabled = false,
  name,
  onChange,
  options,
  placeholder,
  value,
}: ComboboxProps) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLDivElement | null>>([]);
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [placement, setPlacement] = useState<ComboboxPlacement>("bottom");
  const [listMaxHeight, setListMaxHeight] = useState(MAX_LIST_HEIGHT);
  const [listStyle, setListStyle] = useState<CSSProperties>({});
  const [searchQuery, setSearchQuery] = useState("");
  const selectedValue = isControlled ? value : internalValue;
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase();
  const filteredOptions = options.filter((option) => {
    if (!normalizedSearch) {
      return true;
    }

    return option.label.toLocaleLowerCase().includes(normalizedSearch);
  });
  const clampedActiveIndex = Math.min(activeIndex, Math.max(filteredOptions.length - 1, 0));

  function updateListPosition() {
    const inputElement = inputRef.current;
    const listElement = listRef.current;

    if (!inputElement || !listElement) {
      return;
    }

    const inputRect = inputElement.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = Math.max(0, viewportHeight - inputRect.bottom - LIST_GAP - VIEWPORT_MARGIN);
    const spaceAbove = Math.max(0, inputRect.top - LIST_GAP - VIEWPORT_MARGIN);
    const desiredHeight = Math.min(listElement.scrollHeight, MAX_LIST_HEIGHT);
    const canOpenBelow = spaceBelow >= Math.min(desiredHeight, MIN_LIST_HEIGHT);
    const nextPlacement: ComboboxPlacement =
      canOpenBelow || spaceBelow >= spaceAbove ? "bottom" : "top";
    const availableSpace = nextPlacement === "bottom" ? spaceBelow : spaceAbove;

    setPlacement(nextPlacement);
    setListMaxHeight(Math.max(availableSpace, MIN_LIST_HEIGHT));
    setListStyle(
      nextPlacement === "bottom"
        ? {
            left: inputRect.left,
            top: inputRect.bottom + LIST_GAP,
            width: inputRect.width,
          }
        : {
            bottom: viewportHeight - inputRect.top + LIST_GAP,
            left: inputRect.left,
            width: inputRect.width,
          },
    );
  }

  function updateValue(nextValue: string) {
    if (!isControlled) {
      setInternalValue(nextValue);
    }

    onChange?.(nextValue);
  }

  function closeList({ restoreFocus }: { restoreFocus: boolean }) {
    setIsOpen(false);
    setSearchQuery("");

    if (restoreFocus) {
      inputRef.current?.focus();
    }
  }

  function openList({ resetSearch = true }: { resetSearch?: boolean } = {}) {
    if (disabled) {
      return;
    }

    if (resetSearch) {
      setSearchQuery("");
    }

    setIsOpen(true);
  }

  function selectValue(nextValue: string) {
    updateValue(nextValue);
    setSearchQuery("");
    closeList({ restoreFocus: true });
  }

  function getOptionId(index: number) {
    return `${listboxId}-option-${index}`;
  }

  function getSelectedOptionIndex() {
    return options.findIndex((option) => option.value === selectedValue);
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        closeList({ restoreFocus: false });
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      updateListPosition();
    });

    function handleViewportChange() {
      updateListPosition();
    }

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [filteredOptions.length, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    optionRefs.current[clampedActiveIndex]?.scrollIntoView({ block: "nearest" });
  }, [clampedActiveIndex, isOpen]);

  return (
    <div ref={rootRef} className={styles["combobox-root"]} data-placement={placement}>
      <div className={styles["combobox-shell"]}>
        <input
          ref={inputRef}
          aria-activedescendant={
            isOpen && filteredOptions.length > 0 ? getOptionId(clampedActiveIndex) : undefined
          }
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={isOpen}
          aria-label={ariaLabel}
          aria-disabled={disabled}
          aria-haspopup="listbox"
          autoComplete="off"
          className={styles["combobox-input"]}
          disabled={disabled}
          name={name}
          placeholder={placeholder}
          role="combobox"
          type="text"
          value={selectedValue}
          onChange={(event) => {
            const nextValue = event.target.value;

            updateValue(nextValue);
            setSearchQuery(nextValue);
            openList({ resetSearch: false });
            setActiveIndex(0);
          }}
          onClick={() => {
            openList();
            setActiveIndex(Math.max(getSelectedOptionIndex(), 0));
          }}
          onFocus={() => {
            openList();
            setActiveIndex(Math.max(getSelectedOptionIndex(), 0));
          }}
          onKeyDown={(event) => {
            if (disabled) {
              return;
            }

            if (event.key === "ArrowDown") {
              event.preventDefault();

              if (!isOpen) {
                openList();
                setActiveIndex(Math.max(getSelectedOptionIndex(), 0));
                return;
              }

              setActiveIndex((currentIndex) =>
                filteredOptions.length === 0
                  ? 0
                  : (currentIndex + 1 + filteredOptions.length) % filteredOptions.length,
              );
            }

            if (event.key === "ArrowUp") {
              event.preventDefault();

              if (!isOpen) {
                openList();
                setActiveIndex(
                  Math.max(getSelectedOptionIndex(), Math.max(filteredOptions.length - 1, 0)),
                );
                return;
              }

              setActiveIndex((currentIndex) =>
                filteredOptions.length === 0
                  ? 0
                  : (currentIndex - 1 + filteredOptions.length) % filteredOptions.length,
              );
            }

            if (event.key === "Enter") {
              if (!isOpen) {
                return;
              }

              const activeOption = filteredOptions[clampedActiveIndex];

              if (!activeOption) {
                closeList({ restoreFocus: false });
                return;
              }

              event.preventDefault();
              selectValue(activeOption.value);
            }

            if (event.key === "Escape") {
              closeList({ restoreFocus: true });
            }

            if (event.key === "Tab") {
              closeList({ restoreFocus: false });
            }
          }}
        />
        <button
          aria-hidden="true"
          className={styles["combobox-toggle"]}
          disabled={disabled}
          tabIndex={-1}
          type="button"
          onClick={() => {
            if (isOpen) {
              closeList({ restoreFocus: false });
              return;
            }

            inputRef.current?.focus();
            openList();
          }}
        >
          <ChevronDownIcon className={styles["combobox-toggle-icon"]} />
        </button>
      </div>
      {isOpen
        ? createPortal(
            <div
              id={listboxId}
              ref={listRef}
              className={styles["combobox-list"]}
              role="listbox"
              style={
                {
                  ...listStyle,
                  "--combobox-list-max-height": `${listMaxHeight}px`,
                } as CSSProperties
              }
            >
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option, index) => {
                  const isActive = index === clampedActiveIndex;
                  const isSelected = option.value === selectedValue;

                  return (
                    <div
                      key={option.value}
                      aria-selected={isSelected}
                      className={styles["combobox-option"]}
                      data-active={isActive}
                      id={getOptionId(index)}
                      role="option"
                      ref={(element) => {
                        optionRefs.current[index] = element;
                      }}
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
                <div className={styles["combobox-empty"]} />
              )}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
