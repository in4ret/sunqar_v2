import assert from "node:assert/strict";
import test from "node:test";

import { formatSourceCountryLabel } from "@/lib/sources/source-country-label";
import { buildSourceOptions } from "@/lib/sources/source-options";

test("formatSourceCountryLabel shows Kazakhstan name in Russian", () => {
  assert.equal(
    formatSourceCountryLabel({
      country: "kz",
      locale: "ru",
      withoutCountryLabel: "Без страны",
    }),
    "🇰🇿 Казахстан",
  );
});

test("formatSourceCountryLabel keeps Russian country names for Kazakh locale", () => {
  assert.equal(
    formatSourceCountryLabel({
      country: "kz",
      locale: "kk",
      withoutCountryLabel: "Без страны",
    }),
    "🇰🇿 Казахстан",
  );
});

test("formatSourceCountryLabel shows Russia name in Russian", () => {
  assert.equal(
    formatSourceCountryLabel({
      country: "ru",
      locale: "ru",
      withoutCountryLabel: "Без страны",
    }),
    "🇷🇺 Россия",
  );
});

test("formatSourceCountryLabel resolves aliased TLD values", () => {
  assert.equal(
    formatSourceCountryLabel({
      country: "uk",
      locale: "ru",
      withoutCountryLabel: "Без страны",
    }),
    "🇬🇧 Великобритания",
  );
});

test("formatSourceCountryLabel falls back to empty-country label", () => {
  assert.equal(
    formatSourceCountryLabel({
      country: "  ",
      locale: "ru",
      withoutCountryLabel: "Без страны",
    }),
    "Без страны",
  );
});

test("formatSourceCountryLabel keeps unknown values unchanged", () => {
  assert.equal(
    formatSourceCountryLabel({
      country: "zz-top",
      locale: "ru",
      withoutCountryLabel: "Без страны",
    }),
    "zz-top",
  );
});

test("buildSourceOptions sorts countries by Russian labels with stable values", () => {
  assert.deepEqual(
    buildSourceOptions({
      locale: "ru",
      sources: [
        { country: "kz", name: "Tengri", type: "СМИ" },
        { country: "kz", name: "Zakon", type: "СМИ" },
        { country: "ru", name: "RT", type: "Канал" },
        { country: "az", name: "Mediapart", type: "Медиа" },
        { country: "uk", name: "BBC", type: "Медиа" },
        { country: null, name: "Unknown", type: null },
      ],
      withoutCountryLabel: "Без страны",
      withoutTypeLabel: "Без типа",
    }),
    [
      {
        children: [
          {
            children: [
              { label: "Tengri", value: "Tengri" },
              { label: "Zakon", value: "Zakon" },
            ],
            label: "СМИ",
            value: "country:kz/type:СМИ",
          },
        ],
        label: "🇰🇿 Казахстан",
        value: "country:kz",
      },
      {
        children: [
          {
            children: [{ label: "RT", value: "RT" }],
            label: "Канал",
            value: "country:ru/type:Канал",
          },
        ],
        label: "🇷🇺 Россия",
        value: "country:ru",
      },
      {
        children: [
          {
            children: [{ label: "Mediapart", value: "Mediapart" }],
            label: "Медиа",
            value: "country:az/type:Медиа",
          },
        ],
        label: "🇦🇿 Азербайджан",
        value: "country:az",
      },
      {
        children: [
          {
            children: [{ label: "BBC", value: "BBC" }],
            label: "Медиа",
            value: "country:uk/type:Медиа",
          },
        ],
        label: "🇬🇧 Великобритания",
        value: "country:uk",
      },
      {
        children: [
          {
            children: [{ label: "Unknown", value: "Unknown" }],
            label: "Без типа",
            value: "country:/type:Без типа",
          },
        ],
        label: "Без страны",
        value: "country:",
      },
    ],
  );
});

test("buildSourceOptions uses the same Russian country order for Kazakh locale", () => {
  assert.deepEqual(
    buildSourceOptions({
      locale: "kk",
      sources: [
        { country: "kz", name: "Tengri", type: "СМИ" },
        { country: "ru", name: "RT", type: "Канал" },
        { country: "az", name: "Mediapart", type: "Медиа" },
        { country: "uk", name: "BBC", type: "Медиа" },
      ],
      withoutCountryLabel: "Без страны",
      withoutTypeLabel: "Без типа",
    }).map((option) => option.label),
    [
      "🇰🇿 Казахстан",
      "🇷🇺 Россия",
      "🇦🇿 Азербайджан",
      "🇬🇧 Великобритания",
    ],
  );
});

test("buildSourceOptions sorts non-priority countries by Russian names instead of flag codes", () => {
  assert.deepEqual(
    buildSourceOptions({
      locale: "ru",
      sources: [
        { country: "hu", name: "Hungary source", type: "Медиа" },
        { country: "cn", name: "China source", type: "Медиа" },
      ],
      withoutCountryLabel: "Без страны",
      withoutTypeLabel: "Без типа",
    }).map((option) => option.label),
    [
      "🇭🇺 Венгрия",
      "🇨🇳 Китай",
    ],
  );
});

test("buildSourceOptions capitalizes source type labels in grouped options", () => {
  assert.deepEqual(
    buildSourceOptions({
      locale: "ru",
      sources: [{ country: "kz", name: "Tengri", type: "telegram" }],
      withoutCountryLabel: "Без страны",
      withoutTypeLabel: "Без типа",
    }),
    [
      {
        children: [
          {
            children: [{ label: "Tengri", value: "Tengri" }],
            label: "Telegram",
            value: "country:kz/type:Telegram",
          },
        ],
        label: "🇰🇿 Казахстан",
        value: "country:kz",
      },
    ],
  );
});
