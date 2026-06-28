import type { MultiSelectOption } from "@/ui";

import { formatSourceCountryLabel } from "./source-country-label";

export type SourceOptionItem = {
  country: string | null;
  name: string;
  type: string | null;
};

function normalizeSourceGroupValue(value: string | null) {
  const trimmedValue = value?.trim();

  return trimmedValue ? trimmedValue : null;
}

function formatSourceTypeLabel(value: string | null, withoutTypeLabel: string) {
  const normalizedValue = normalizeSourceGroupValue(value);

  if (!normalizedValue) {
    return withoutTypeLabel;
  }

  return normalizedValue.charAt(0).toLocaleUpperCase("ru") + normalizedValue.slice(1);
}

const ruLabelCollator = new Intl.Collator("ru");

function compareByLabel(left: { label: string }, right: { label: string }) {
  return left.label.localeCompare(right.label);
}

type SourceCountryGroup = {
  countryValue: string;
  label: string;
  sortLabel: string;
  typeGroups: Map<string, MultiSelectOption[]>;
};

const prioritizedCountryOrder = new Map<string, number>([
  ["kz", 0],
  ["ru", 1],
]);

function compareCountryGroups(left: SourceCountryGroup, right: SourceCountryGroup) {
  if (left.countryValue === "") {
    return right.countryValue === "" ? 0 : 1;
  }

  if (right.countryValue === "") {
    return -1;
  }

  const leftPriority = prioritizedCountryOrder.get(left.countryValue.toLocaleLowerCase("en"));
  const rightPriority = prioritizedCountryOrder.get(right.countryValue.toLocaleLowerCase("en"));

  if (leftPriority !== undefined || rightPriority !== undefined) {
    if (leftPriority === undefined) {
      return 1;
    }

    if (rightPriority === undefined) {
      return -1;
    }

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }
  }

  return ruLabelCollator.compare(left.sortLabel, right.sortLabel);
}

function getCountrySortLabel(label: string) {
  return label.replace(/^\p{Regional_Indicator}{2}\s+/u, "");
}

export function buildSourceOptions({
  locale,
  missingSourceNames = [],
  sources,
  unavailableLabel,
  withoutCountryLabel,
  withoutTypeLabel,
}: {
  locale: string;
  missingSourceNames?: string[];
  sources: SourceOptionItem[];
  unavailableLabel?: string;
  withoutCountryLabel: string;
  withoutTypeLabel: string;
}) {
  const countries = new Map<string, SourceCountryGroup>();

  for (const source of sources) {
    const countryValue = normalizeSourceGroupValue(source.country) ?? "";
    const countryLabel = formatSourceCountryLabel({
      country: source.country,
      locale,
      withoutCountryLabel,
    });
    const typeLabel = formatSourceTypeLabel(source.type, withoutTypeLabel);
    const countryGroup = countries.get(countryValue) ?? {
      countryValue,
      label: countryLabel,
      sortLabel: getCountrySortLabel(countryLabel),
      typeGroups: new Map<string, MultiSelectOption[]>(),
    };
    const typeGroup = countryGroup.typeGroups.get(typeLabel) ?? [];

    typeGroup.push({
      label: source.name,
      value: source.name,
    });
    countryGroup.typeGroups.set(typeLabel, typeGroup);
    countries.set(countryValue, countryGroup);
  }

  const groupedOptions = [...countries.values()]
    .sort(compareCountryGroups)
    .map<MultiSelectOption>((countryGroup) => ({
      children: [...countryGroup.typeGroups.entries()]
        .map<MultiSelectOption>(([typeLabel, sourceOptions]) => ({
          children: [...sourceOptions].sort(compareByLabel),
          label: typeLabel,
          value: `country:${countryGroup.countryValue}/type:${typeLabel}`,
        }))
        .sort(compareByLabel),
      label: countryGroup.label,
      value: `country:${countryGroup.countryValue}`,
    }));

  const uniqueMissingSourceNames = [...new Set(
    missingSourceNames.map((sourceName) => sourceName.trim()).filter(Boolean),
  )].sort((left, right) => left.localeCompare(right));

  if (uniqueMissingSourceNames.length > 0 && unavailableLabel) {
    groupedOptions.push({
      children: uniqueMissingSourceNames.map((sourceName) => ({
        label: sourceName,
        value: sourceName,
      })),
      label: unavailableLabel,
      value: "unavailable-sources",
    });
  }

  return groupedOptions;
}
