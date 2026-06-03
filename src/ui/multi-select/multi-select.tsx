"use client";

import {
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Modal } from "../modal/modal";

import styles from "./multi-select.module.scss";

export type MultiSelectOption = {
  children?: MultiSelectOption[];
  label: string;
  value: string;
};

type MultiSelectNode = {
  children: MultiSelectNode[];
  descendantLeafValues: string[];
  isLeaf: boolean;
  label: string;
  level: number;
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
  searchPlaceholder?: string;
  removeButtonLabel?: (label: string) => string;
  selectedItemsModalCloseLabel?: string;
  selectedItemsModalTitle?: string;
  showAllSelectedLabel?: (count: number) => string;
  value: string[];
  visibleSelectedOptionsCount?: number;
};

type MultiSelectPlacement = "top" | "bottom";
type SelectionState = "checked" | "indeterminate" | "unchecked";

const VIEWPORT_MARGIN = 12;
const LIST_GAP = 6;
const MAX_LIST_HEIGHT = 320;
const MIN_LIST_HEIGHT = 120;

function buildMultiSelectTree(
  options: MultiSelectOption[],
  level = 0,
  leafOptionsByValue = new Map<string, MultiSelectOption>(),
): MultiSelectNode[] {
  return options.map((option) => {
    const childOptions = option.children ?? [];
    const children = buildMultiSelectTree(childOptions, level + 1, leafOptionsByValue);
    const isLeaf = children.length === 0;
    const descendantLeafValues = isLeaf
      ? [option.value]
      : children.flatMap((child) => child.descendantLeafValues);

    if (isLeaf) {
      leafOptionsByValue.set(option.value, option);
    }

    return {
      children,
      descendantLeafValues,
      isLeaf,
      label: option.label,
      level,
      value: option.value,
    };
  });
}

function mergeSelectedValues(currentValue: string[], nextValues: string[]) {
  const nextSelectedValues = [...currentValue];
  const selectedValuesSet = new Set(currentValue);

  for (const value of nextValues) {
    if (!selectedValuesSet.has(value)) {
      selectedValuesSet.add(value);
      nextSelectedValues.push(value);
    }
  }

  return nextSelectedValues;
}

function filterMultiSelectTree(nodes: MultiSelectNode[], normalizedQuery: string): MultiSelectNode[] {
  if (normalizedQuery.length === 0) {
    return nodes;
  }

  return nodes.flatMap((node) => {
    const filteredChildren = filterMultiSelectTree(node.children, normalizedQuery);
    const isMatch = node.label.toLocaleLowerCase().includes(normalizedQuery);

    if (!isMatch && filteredChildren.length === 0) {
      return [];
    }

    return [
      {
        ...node,
        children: filteredChildren,
      },
    ];
  });
}

function TriStateCheckbox({
  checked,
  disabled,
  indeterminate,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  indeterminate: boolean;
  onChange: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <input
      ref={inputRef}
      checked={checked}
      className={styles["multi-select-checkbox"]}
      disabled={disabled}
      type="checkbox"
      onChange={onChange}
    />
  );
}

export function MultiSelect({
  "aria-label": ariaLabel,
  disabled = false,
  emptyLabel,
  name,
  onChange,
  options,
  removeButtonLabel,
  selectedItemsModalCloseLabel,
  selectedItemsModalTitle,
  showAllSelectedLabel,
  value,
  visibleSelectedOptionsCount,
}: MultiSelectProps) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const shouldIgnoreNextInputFocusRef = useRef(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isSelectedItemsModalOpen, setIsSelectedItemsModalOpen] = useState(false);
  const [placement, setPlacement] = useState<MultiSelectPlacement>("bottom");
  const [listMaxHeight, setListMaxHeight] = useState(MAX_LIST_HEIGHT);
  const [expandedValues, setExpandedValues] = useState<Set<string>>(() => new Set());
  const [searchValue, setSearchValue] = useState("");
  const { leafOptionsByValue, tree } = useMemo(() => {
    const nextLeafOptionsByValue = new Map<string, MultiSelectOption>();
    const nextTree = buildMultiSelectTree(options, 0, nextLeafOptionsByValue);

    return {
      leafOptionsByValue: nextLeafOptionsByValue,
      tree: nextTree,
    };
  }, [options]);
  const normalizedSearchValue = searchValue.trim().toLocaleLowerCase();
  const filteredTree = useMemo(
    () => filterMultiSelectTree(tree, normalizedSearchValue),
    [normalizedSearchValue, tree],
  );
  const hasActiveSearch = normalizedSearchValue.length > 0;
  const selectedLeafValues = value.filter((selectedValue) => leafOptionsByValue.has(selectedValue));
  const selectedOptions = selectedLeafValues
    .map((selectedValue) => leafOptionsByValue.get(selectedValue))
    .filter((option): option is MultiSelectOption => option !== undefined);
  const visibleSelectedOptions = visibleSelectedOptionsCount
    ? selectedOptions.slice(0, visibleSelectedOptionsCount)
    : selectedOptions;
  const hasHiddenSelectedOptions =
    visibleSelectedOptionsCount !== undefined &&
    selectedOptions.length > visibleSelectedOptionsCount &&
    showAllSelectedLabel !== undefined &&
    selectedItemsModalTitle !== undefined &&
    selectedItemsModalCloseLabel !== undefined;
  const selectedValuesSet = new Set(selectedLeafValues);

  function updateListPosition() {
    const buttonElement = buttonRef.current;
    const listElement = listRef.current;

    if (!buttonElement || !listElement) {
      return;
    }

    const buttonRect = buttonElement.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = Math.max(0, viewportHeight - buttonRect.bottom - LIST_GAP - VIEWPORT_MARGIN);
    const spaceAbove = Math.max(0, buttonRect.top - LIST_GAP - VIEWPORT_MARGIN);
    const desiredHeight = Math.min(listElement.scrollHeight, MAX_LIST_HEIGHT);
    const canOpenBelow = spaceBelow >= Math.min(desiredHeight, MIN_LIST_HEIGHT);
    const nextPlacement: MultiSelectPlacement =
      canOpenBelow || spaceBelow >= spaceAbove ? "bottom" : "top";
    const availableSpace = nextPlacement === "bottom" ? spaceBelow : spaceAbove;

    setPlacement(nextPlacement);
    setListMaxHeight(Math.max(availableSpace, MIN_LIST_HEIGHT));
  }

  function updateSelectedValues(nextValue: string[]) {
    const nextSelectedLeafValues = nextValue.filter((selectedValue) =>
      leafOptionsByValue.has(selectedValue),
    );
    const nextHasHiddenSelectedOptions =
      visibleSelectedOptionsCount !== undefined &&
      nextSelectedLeafValues.length > visibleSelectedOptionsCount &&
      showAllSelectedLabel !== undefined &&
      selectedItemsModalTitle !== undefined &&
      selectedItemsModalCloseLabel !== undefined;

    if (!nextHasHiddenSelectedOptions) {
      setIsSelectedItemsModalOpen(false);
    }

    onChange?.(nextValue);
  }

  function closeDropdown({ restoreFocus }: { restoreFocus: boolean }) {
    setIsOpen(false);
    setSearchValue("");

    if (restoreFocus) {
      shouldIgnoreNextInputFocusRef.current = true;
      inputRef.current?.focus();
    }
  }

  function getSelectionState(node: MultiSelectNode): SelectionState {
    const selectedLeafCount = node.descendantLeafValues.filter((leafValue) =>
      selectedValuesSet.has(leafValue),
    ).length;

    if (selectedLeafCount === 0) {
      return "unchecked";
    }

    if (selectedLeafCount === node.descendantLeafValues.length) {
      return "checked";
    }

    return "indeterminate";
  }

  function toggleNodeSelection(node: MultiSelectNode) {
    if (disabled) {
      return;
    }

    const selectionState = getSelectionState(node);

    if (selectionState === "checked") {
      updateSelectedValues(
        value.filter((selectedValue) => !node.descendantLeafValues.includes(selectedValue)),
      );
      return;
    }

    updateSelectedValues(mergeSelectedValues(value, node.descendantLeafValues));
  }

  function removeValue(valueToRemove: string) {
    if (disabled) {
      return;
    }

    updateSelectedValues(
      value.filter((selectedValue) => selectedValue !== valueToRemove),
    );
  }

  function toggleExpanded(valueToToggle: string) {
    setExpandedValues((currentExpandedValues) => {
      const nextExpandedValues = new Set(currentExpandedValues);

      if (nextExpandedValues.has(valueToToggle)) {
        nextExpandedValues.delete(valueToToggle);
      } else {
        nextExpandedValues.add(valueToToggle);
      }

      return nextExpandedValues;
    });
  }

  function handleTreeKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeDropdown({ restoreFocus: true });
    }
  }

  function openDropdown() {
    if (disabled) {
      return;
    }

    setIsOpen(true);
  }

  function toggleDropdown() {
    if (disabled) {
      return;
    }

    if (isOpen) {
      closeDropdown({ restoreFocus: true });
      return;
    }

    setIsOpen(true);
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
  }, [expandedValues, isOpen, options, value]);

  function renderNode(node: MultiSelectNode) {
    const selectionState = getSelectionState(node);
    const hasVisibleChildren = node.children.length > 0;
    const isExpanded = hasActiveSearch ? hasVisibleChildren : expandedValues.has(node.value);
    const hasChildren = node.children.length > 0;
    const isChecked = selectionState === "checked";
    const isIndeterminate = selectionState === "indeterminate";
    const paddingStyle = {
      "--multi-select-option-level": `${node.level}`,
    } as CSSProperties;

    return (
      <div key={node.value} className={styles["multi-select-tree-node"]}>
        <div
          className={styles["multi-select-option"]}
          role="treeitem"
          aria-checked={isIndeterminate ? "mixed" : isChecked}
          aria-expanded={hasChildren ? isExpanded : undefined}
          aria-selected={isChecked}
          style={paddingStyle}
        >
          <div className={styles["multi-select-option-main"]}>
            {hasChildren ? (
              <button
                aria-label={isExpanded ? `Collapse ${node.label}` : `Expand ${node.label}`}
                className={styles["multi-select-branch-toggle"]}
                disabled={disabled}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();

                  if (hasActiveSearch) {
                    return;
                  }

                  toggleExpanded(node.value);
                }}
              >
                <span
                  aria-hidden="true"
                  className={styles["multi-select-branch-toggle-icon"]}
                  data-expanded={isExpanded}
                />
              </button>
            ) : (
              <span className={styles["multi-select-branch-toggle-spacer"]} aria-hidden="true" />
            )}
            <label className={styles["multi-select-checkbox-label"]}>
              <TriStateCheckbox
                checked={isChecked}
                disabled={disabled}
                indeterminate={isIndeterminate}
                onChange={() => {
                  toggleNodeSelection(node);
                }}
              />
              <span>{node.label}</span>
            </label>
          </div>
        </div>
        {hasChildren && isExpanded ? (
          <div role="group" className={styles["multi-select-tree-group"]}>
            {node.children.map((child) => renderNode(child))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div ref={rootRef} className={styles["multi-select-root"]} data-placement={placement}>
      {name ? <input name={name} type="hidden" value={selectedLeafValues.join(", ")} /> : null}
      <div
        ref={buttonRef}
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-haspopup="tree"
        aria-disabled={disabled}
        className={styles["multi-select"]}
        onClick={() => {
          openDropdown();
        }}
        onKeyDown={(event) => {
          if (disabled) {
            return;
          }

          if (
            (event.target as HTMLElement).tagName !== "INPUT" &&
            (event.key === "Enter" || event.key === " ")
          ) {
            event.preventDefault();
            toggleDropdown();
          }

          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setIsOpen(true);
          }

          if (event.key === "Escape") {
            closeDropdown({ restoreFocus: true });
          }
        }}
      >
        <div className={styles["multi-select-content"]}>
          <div className={styles["multi-select-selected"]}>
            <div className={styles["multi-select-selected-flow"]}>
              {selectedOptions.length > 0
                ? visibleSelectedOptions.map((option) => (
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
                  ))
                : null}
              <input
                aria-label={ariaLabel}
                className={styles["multi-select-input"]}
                disabled={disabled}
                ref={inputRef}
                type="text"
                value={searchValue}
                onChange={(event) => {
                  setSearchValue(event.target.value);
                  setIsOpen(true);
                }}
                onFocus={() => {
                  if (shouldIgnoreNextInputFocusRef.current) {
                    shouldIgnoreNextInputFocusRef.current = false;
                    return;
                  }

                  openDropdown();
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    event.stopPropagation();
                    closeDropdown({ restoreFocus: true });
                  }
                }}
              />
            </div>
            {hasHiddenSelectedOptions ? (
              <button
                className={styles["multi-select-show-all-button"]}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setIsSelectedItemsModalOpen(true);
                }}
              >
                {showAllSelectedLabel(selectedOptions.length)}
              </button>
            ) : null}
          </div>
        </div>
        <button
          aria-label={isOpen ? "Close options" : "Open options"}
          className={styles["multi-select-chevron-button"]}
          disabled={disabled}
          type="button"
          onClick={(event: MouseEvent<HTMLButtonElement>) => {
            event.stopPropagation();
            toggleDropdown();
          }}
        >
          <span className={styles["multi-select-chevron"]} aria-hidden="true" />
        </button>
      </div>
      {isOpen ? (
        <div
          id={listboxId}
          ref={listRef}
          className={styles["multi-select-list"]}
          role="tree"
          style={{ "--multi-select-list-max-height": `${listMaxHeight}px` } as CSSProperties}
          onKeyDown={handleTreeKeyDown}
        >
          {filteredTree.length > 0 ? filteredTree.map((node) => renderNode(node)) : (
            <div className={styles["multi-select-empty"]}>{emptyLabel}</div>
          )}
        </div>
      ) : null}
      {hasHiddenSelectedOptions ? (
        <Modal
          closeLabel={selectedItemsModalCloseLabel}
          isOpen={isSelectedItemsModalOpen}
          title={selectedItemsModalTitle}
          onClose={() => {
            setIsSelectedItemsModalOpen(false);
          }}
        >
          <div className={styles["multi-select-modal-chips"]}>
            {selectedOptions.map((option) => (
              <span key={option.value} className={styles["multi-select-chip"]}>
                <span className={styles["multi-select-chip-label"]}>{option.label}</span>
                <button
                  aria-label={removeButtonLabel?.(option.label) ?? option.label}
                  className={styles["multi-select-chip-remove"]}
                  disabled={disabled}
                  type="button"
                  onClick={() => {
                    removeValue(option.value);
                  }}
                >
                  <span aria-hidden="true">&times;</span>
                </button>
              </span>
            ))}
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
