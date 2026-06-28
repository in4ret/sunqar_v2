const sourceCountryCodeAliases: Record<string, string> = {
  uk: "GB",
};
const sourceCountryDisplayLocale = "ru";

function normalizeSourceCountryValue(value: string | null) {
  const trimmedValue = value?.trim();

  return trimmedValue ? trimmedValue : null;
}

function getRegionCode(value: string) {
  const normalizedValue = value.toLocaleLowerCase("en");

  return sourceCountryCodeAliases[normalizedValue] ?? normalizedValue.toUpperCase();
}

function getCountryFlagEmoji(regionCode: string) {
  if (!/^[A-Z]{2}$/.test(regionCode)) {
    return "";
  }

  return String.fromCodePoint(
    ...regionCode.split("").map((character) => 0x1f1e6 + character.charCodeAt(0) - 65),
  );
}

function capitalizeCountryLabel(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  return `${trimmedValue.charAt(0).toLocaleUpperCase()}${trimmedValue.slice(1)}`;
}

export function formatSourceCountryLabel({
  country,
  locale: _locale,
  withoutCountryLabel,
}: {
  country: string | null;
  locale: string;
  withoutCountryLabel: string;
}) {
  void _locale;

  const normalizedCountry = normalizeSourceCountryValue(country);

  if (!normalizedCountry) {
    return withoutCountryLabel;
  }

  try {
    const regionCode = getRegionCode(normalizedCountry);
    const formatter = new Intl.DisplayNames([sourceCountryDisplayLocale], {
      type: "region",
    });
    const countryLabel = formatter.of(regionCode);

    if (countryLabel) {
      const capitalizedCountryLabel = capitalizeCountryLabel(countryLabel);
      const countryFlagEmoji = getCountryFlagEmoji(regionCode);

      return countryFlagEmoji
        ? `${countryFlagEmoji} ${capitalizedCountryLabel}`
        : capitalizedCountryLabel;
    }
  } catch {
    return normalizedCountry;
  }

  return normalizedCountry;
}
