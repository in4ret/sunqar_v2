"use client";

import { useEffect, useId, useRef, useState } from "react";
import styles from "./dropdown.module.css";

type DropdownOption = {
  value: string;
  label: string;
};

type DropdownVariant = "default" | "pill";

type DropdownProps = {
  "aria-label"?: string;
  className?: string;
  defaultValue?: string;
  disabled?: boolean;
  name?: string;
  onChange?: (value: string) => void;
  options: DropdownOption[];
  required?: boolean;
  value?: string;
  variant?: DropdownVariant;
};

export function Dropdown({
  "aria-label": ariaLabel,
  className,
  defaultValue,
  disabled = false,
  name,
  onChange,
  options,
  required,
  value,
  variant = "default",
}: DropdownProps) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const isControlled = value !== undefined;
  const initialValue = defaultValue ?? options[0]?.value ?? "";
  const [internalValue, setInternalValue] = useState(initialValue);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const selectedValue = value ?? internalValue;
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === selectedValue),
  );
  const selectedOption = options[selectedIndex];
  const rootClassNames = [styles["dropdown-root"], styles[`dropdown-root-${variant}`]].join(" ");
  const classNames = [styles["dropdown"], styles[`dropdown-${variant}`], className]
    .filter(Boolean)
    .join(" ");

  function closeDropdown({ restoreFocus }: { restoreFocus: boolean }) {
    setIsOpen(false);

    if (restoreFocus) {
      buttonRef.current?.focus();
    }
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

  function selectValue(nextValue: string) {
    if (!isControlled) {
      setInternalValue(nextValue);
    }

    onChange?.(nextValue);
    closeDropdown({ restoreFocus: true });
  }

  function moveActiveOption(direction: 1 | -1) {
    setActiveIndex((currentIndex) => (currentIndex + direction + options.length) % options.length);
  }

  function getOptionId(index: number) {
    return `${listboxId}-option-${index}`;
  }

  return (
    <div ref={rootRef} className={rootClassNames}>
      {name ? <input name={name} required={required} type="hidden" value={selectedValue} /> : null}
      <div
        ref={buttonRef}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        aria-controls={listboxId}
        className={classNames}
        aria-disabled={disabled}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => {
          if (disabled) {
            return;
          }

          setIsOpen((currentIsOpen) => {
            if (!currentIsOpen) {
              setActiveIndex(selectedIndex);
            }

            return !currentIsOpen;
          });
        }}
        onKeyDown={(event) => {
          if (disabled) {
            return;
          }

          if (event.key === "ArrowDown") {
            event.preventDefault();
            if (!isOpen) {
              setIsOpen(true);
              setActiveIndex(selectedIndex);
              return;
            }

            moveActiveOption(1);
          }

          if (event.key === "ArrowUp") {
            event.preventDefault();
            if (!isOpen) {
              setIsOpen(true);
              setActiveIndex(selectedIndex);
              return;
            }

            moveActiveOption(-1);
          }

          if (event.key === "Home") {
            event.preventDefault();
            setIsOpen(true);
            setActiveIndex(0);
          }

          if (event.key === "End") {
            event.preventDefault();
            setIsOpen(true);
            setActiveIndex(Math.max(0, options.length - 1));
          }

          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();

            if (!isOpen) {
              setIsOpen(true);
              setActiveIndex(selectedIndex);
              return;
            }

            selectValue(options[activeIndex]?.value ?? selectedValue);
          }

          if (event.key === "Escape") {
            closeDropdown({ restoreFocus: true });
          }

          if (event.key === "Tab") {
            closeDropdown({ restoreFocus: false });
          }
        }}
      >
        <span className={styles["dropdown-value"]}>{selectedOption?.label}</span>
        <span className={styles["dropdown-chevron"]} aria-hidden="true" />
      </div>
      {isOpen ? (
        <div
          id={listboxId}
          aria-activedescendant={getOptionId(activeIndex)}
          className={styles["dropdown-list"]}
          role="listbox"
        >
          {options.map((option, index) => {
            const isSelected = option.value === selectedValue;
            const isActive = index === activeIndex;

            return (
              <div
                key={option.value}
                aria-selected={isSelected}
                className={styles["dropdown-option"]}
                data-active={isActive}
                id={getOptionId(index)}
                role="option"
                onPointerDown={(event) => {
                  event.preventDefault();
                  selectValue(option.value);
                }}
                onMouseEnter={() => {
                  setActiveIndex(index);
                }}
              >
                {option.label}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
