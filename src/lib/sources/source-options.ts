import type { MultiSelectOption } from "@/ui";

export type SourceOptionItem = {
  country: string | null;
  name: string;
  type: string | null;
};

function normalizeSourceGroupValue(value: string | null) {
  const trimmedValue = value?.trim();

  return trimmedValue ? trimmedValue : null;
}

function compareByLabel(left: { label: string }, right: { label: string }) {
  return left.label.localeCompare(right.label);
}

export function buildSourceOptions({
  missingSourceNames = [],
  sources,
  unavailableLabel,
  withoutCountryLabel,
  withoutTypeLabel,
}: {
  missingSourceNames?: string[];
  sources: SourceOptionItem[];
  unavailableLabel?: string;
  withoutCountryLabel: string;
  withoutTypeLabel: string;
}) {
  const countries = new Map<string, Map<string, MultiSelectOption[]>>();

  for (const source of sources) {
    const countryLabel = normalizeSourceGroupValue(source.country) ?? withoutCountryLabel;
    const typeLabel = normalizeSourceGroupValue(source.type) ?? withoutTypeLabel;
    const countryGroup = countries.get(countryLabel) ?? new Map<string, MultiSelectOption[]>();
    const typeGroup = countryGroup.get(typeLabel) ?? [];

    typeGroup.push({
      label: source.name,
      value: source.name,
    });
    countryGroup.set(typeLabel, typeGroup);
    countries.set(countryLabel, countryGroup);
  }

  const groupedOptions = [...countries.entries()]
    .map<MultiSelectOption>(([countryLabel, typeGroups]) => ({
      children: [...typeGroups.entries()]
        .map<MultiSelectOption>(([typeLabel, sourceOptions]) => ({
          children: [...sourceOptions].sort(compareByLabel),
          label: typeLabel,
          value: `country:${countryLabel}/type:${typeLabel}`,
        }))
        .sort(compareByLabel),
      label: countryLabel,
      value: `country:${countryLabel}`,
    }))
    .sort(compareByLabel);

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
