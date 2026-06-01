import { requireRole } from "@/lib/auth/auth";
import { listSources } from "@/lib/sources/sources";

import { SourcesPageView } from "./sources-page-view/sources-page-view";

type SourceOption = {
  label: string;
  value: string;
};

function getSourceOptions(values: Array<string | null>) {
  const uniqueValues = new Map<string, string>();

  for (const value of values) {
    const trimmedValue = value?.trim();

    if (!trimmedValue) {
      continue;
    }

    const normalizedValue = trimmedValue.toLocaleLowerCase();

    if (!uniqueValues.has(normalizedValue)) {
      uniqueValues.set(normalizedValue, trimmedValue);
    }
  }

  return [...uniqueValues.values()]
    .sort((left, right) => left.localeCompare(right))
    .map<SourceOption>((optionValue) => ({
      label: optionValue,
      value: optionValue,
    }));
}

export default async function SourcesPage() {
  await requireRole("admin");

  const allSources = await listSources();
  const typeOptions = getSourceOptions(allSources.map((source) => source.type));
  const countryOptions = getSourceOptions(allSources.map((source) => source.country));

  return (
    <SourcesPageView
      allSources={allSources.map(({ country, id, name, type }) => ({
        country,
        id,
        name,
        type,
      }))}
      countryOptions={countryOptions}
      typeOptions={typeOptions}
    />
  );
}
