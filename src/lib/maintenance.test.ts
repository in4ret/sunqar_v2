import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSourcesGoogleSheetCsvUrl,
  diffSourcesForSync,
  formatMaintenanceLogMessage,
  normalizeSourceRows,
  parseTelegramSourceRowsCsv,
  parseWebSourceRowsCsv,
} from "@/lib/maintenance";

test("formatMaintenanceLogMessage prefixes message with ISO UTC timestamp", () => {
  const formattedMessage = formatMaintenanceLogMessage("Daily update started");

  assert.match(
    formattedMessage,
    /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z] Daily update started$/,
  );
});

test("buildSourcesGoogleSheetCsvUrl builds a csv export url for tg sheet", () => {
  assert.equal(
    buildSourcesGoogleSheetCsvUrl(
      "https://docs.google.com/spreadsheets/d/1JzK8P5Lkk2cPoCG9kctQqT2gHmQ0O5cX04BAAnilSzw/edit?gid=0#gid=0",
      "tg",
    ),
    "https://docs.google.com/spreadsheets/d/1JzK8P5Lkk2cPoCG9kctQqT2gHmQ0O5cX04BAAnilSzw/gviz/tq?tqx=out:csv&sheet=tg",
  );
});

test("buildSourcesGoogleSheetCsvUrl builds a csv export url for params sheet", () => {
  assert.equal(
    buildSourcesGoogleSheetCsvUrl(
      "https://docs.google.com/spreadsheets/d/1JzK8P5Lkk2cPoCG9kctQqT2gHmQ0O5cX04BAAnilSzw/edit?gid=0#gid=0",
      "params",
    ),
    "https://docs.google.com/spreadsheets/d/1JzK8P5Lkk2cPoCG9kctQqT2gHmQ0O5cX04BAAnilSzw/gviz/tq?tqx=out:csv&sheet=params",
  );
});

test("parseTelegramSourceRowsCsv maps channel_name and country into SourceRow", () => {
  const csvText = [
    "\"spider\",\"channel_name\",\"country\",\"tags\",\"\"",
    "\"telegram\",\"@baraeva_vidit\",\"ru\",\"\",\"\"",
    "\"telegram\",\"@tashkent3000\",\"uz\",\"\",\"\"",
  ].join("\n");

  assert.deepEqual(parseTelegramSourceRowsCsv(csvText), [
    {
      country: "ru",
      name: "@baraeva_vidit",
      type: "telegram",
    },
    {
      country: "uz",
      name: "@tashkent3000",
      type: "telegram",
    },
  ]);
});

test("parseTelegramSourceRowsCsv trims values", () => {
  const csvText = [
    "\"spider\",\"channel_name\",\"country\",\"\"",
    "\"telegram\",\"  @trimmed_channel  \",\"  kg  \",\"\"",
  ].join("\n");

  assert.deepEqual(parseTelegramSourceRowsCsv(csvText), [
    {
      country: "kg",
      name: "@trimmed_channel",
      type: "telegram",
    },
  ]);
});

test("parseTelegramSourceRowsCsv throws when channel_name is empty", () => {
  const csvText = [
    "\"spider\",\"channel_name\",\"country\"",
    "\"telegram\",\"   \",\"ru\"",
  ].join("\n");

  assert.throws(() => parseTelegramSourceRowsCsv(csvText), {
    message: "Google Sheet tg row 2 is missing required value channel_name.",
  });
});

test("parseTelegramSourceRowsCsv throws when country is empty", () => {
  const csvText = [
    "\"spider\",\"channel_name\",\"country\"",
    "\"telegram\",\"@source\",\"   \"",
  ].join("\n");

  assert.throws(() => parseTelegramSourceRowsCsv(csvText), {
    message: "Google Sheet tg row 2 is missing required value country.",
  });
});

test("parseWebSourceRowsCsv maps name, country, and type into SourceRow", () => {
  const csvText = [
    "\"name\",\"country\",\"type\"",
    "\"BBC\",\"uk\",\"media\"",
    "\"DW\",\"de\",\"news\"",
  ].join("\n");

  assert.deepEqual(parseWebSourceRowsCsv(csvText), [
    {
      country: "uk",
      name: "BBC",
      type: "media",
    },
    {
      country: "de",
      name: "DW",
      type: "news",
    },
  ]);
});

test("parseWebSourceRowsCsv trims values", () => {
  const csvText = [
    "\"name\",\"country\",\"type\"",
    "\"  Example Site  \",\"  kz  \",\"  website  \"",
  ].join("\n");

  assert.deepEqual(parseWebSourceRowsCsv(csvText), [
    {
      country: "kz",
      name: "Example Site",
      type: "website",
    },
  ]);
});

test("parseWebSourceRowsCsv throws when required name column is missing", () => {
  const csvText = [
    "\"country\",\"type\"",
    "\"kz\",\"website\"",
  ].join("\n");

  assert.throws(() => parseWebSourceRowsCsv(csvText), {
    message: "Google Sheet params is missing required column name.",
  });
});

test("parseWebSourceRowsCsv throws when required country column is missing", () => {
  const csvText = [
    "\"name\",\"type\"",
    "\"Site\",\"website\"",
  ].join("\n");

  assert.throws(() => parseWebSourceRowsCsv(csvText), {
    message: "Google Sheet params is missing required column country.",
  });
});

test("parseWebSourceRowsCsv throws when required type column is missing", () => {
  const csvText = [
    "\"name\",\"country\"",
    "\"Site\",\"kz\"",
  ].join("\n");

  assert.throws(() => parseWebSourceRowsCsv(csvText), {
    message: "Google Sheet params is missing required column type.",
  });
});

test("parseWebSourceRowsCsv throws when name is empty", () => {
  const csvText = [
    "\"name\",\"country\",\"type\"",
    "\"   \",\"kz\",\"website\"",
  ].join("\n");

  assert.throws(() => parseWebSourceRowsCsv(csvText), {
    message: "Google Sheet params row 2 is missing required value name.",
  });
});

test("parseWebSourceRowsCsv throws when country is empty", () => {
  const csvText = [
    "\"name\",\"country\",\"type\"",
    "\"Site\",\"   \",\"website\"",
  ].join("\n");

  assert.throws(() => parseWebSourceRowsCsv(csvText), {
    message: "Google Sheet params row 2 is missing required value country.",
  });
});

test("parseWebSourceRowsCsv throws when type is empty", () => {
  const csvText = [
    "\"name\",\"country\",\"type\"",
    "\"Site\",\"kz\",\"   \"",
  ].join("\n");

  assert.throws(() => parseWebSourceRowsCsv(csvText), {
    message: "Google Sheet params row 2 is missing required value type.",
  });
});

test("normalizeSourceRows deduplicates only fully identical rows", () => {
  assert.deepEqual(
    normalizeSourceRows([
      { country: "kz", name: "Tengri", type: "website" },
      { country: "kz", name: "Tengri", type: "website" },
      { country: "ru", name: "Meduza", type: "media" },
    ]),
    [
      { country: "kz", name: "Tengri", type: "website" },
      { country: "ru", name: "Meduza", type: "media" },
    ],
  );
});

test("normalizeSourceRows keeps rows with the same name when type or country differs", () => {
  assert.deepEqual(
    normalizeSourceRows([
      { country: "kz", name: "Tengri", type: "website" },
      { country: "ru", name: "Tengri", type: "website" },
      { country: "kz", name: "Tengri", type: "media" },
    ]),
    [
      { country: "kz", name: "Tengri", type: "website" },
      { country: "ru", name: "Tengri", type: "website" },
      { country: "kz", name: "Tengri", type: "media" },
    ],
  );
});

test("diffSourcesForSync returns inserts for sheet sources missing in sqlite", () => {
  assert.deepEqual(
    diffSourcesForSync(
      [
        { country: "kz", name: "Tengri", type: "website" },
        { country: "ru", name: "Meduza", type: "media" },
      ],
      [{ country: "kz", id: "source-1", name: "Tengri", type: "website" }],
    ),
    {
      toDelete: [],
      toInsert: [{ country: "ru", name: "Meduza", type: "media" }],
      toUpdate: [],
    },
  );
});

test("diffSourcesForSync returns deletes for sqlite sources missing in sheet", () => {
  assert.deepEqual(
    diffSourcesForSync(
      [{ country: "kz", name: "Tengri", type: "website" }],
      [
        { country: "kz", id: "source-1", name: "Tengri", type: "website" },
        { country: "ru", id: "source-2", name: "Meduza", type: "media" },
      ],
    ),
    {
      toDelete: [{ country: "ru", id: "source-2", name: "Meduza", type: "media" }],
      toInsert: [],
      toUpdate: [],
    },
  );
});

test("diffSourcesForSync inserts a second source with the same name when the composite key differs", () => {
  assert.deepEqual(
    diffSourcesForSync(
      [
        { country: "kz", name: "Tengri", type: "website" },
        { country: "ru", name: "Tengri", type: "website" },
      ],
      [{ country: "kz", id: "source-1", name: "Tengri", type: "website" }],
    ),
    {
      toDelete: [],
      toInsert: [{ country: "ru", name: "Tengri", type: "website" }],
      toUpdate: [],
    },
  );
});

test("diffSourcesForSync does not delete or collapse stored rows only because names match", () => {
  assert.deepEqual(
    diffSourcesForSync(
      [
        { country: "kz", name: "Tengri", type: "website" },
        { country: "ru", name: "Tengri", type: "website" },
      ],
      [
        { country: "kz", id: "source-1", name: "Tengri", type: "website" },
        { country: "ru", id: "source-2", name: "Tengri", type: "website" },
      ],
    ),
    {
      toDelete: [],
      toInsert: [],
      toUpdate: [],
    },
  );
});

test("diffSourcesForSync returns an empty diff when sheet and sqlite rows match by composite key", () => {
  assert.deepEqual(
    diffSourcesForSync(
      [
        { country: "kz", name: "Tengri", type: "website" },
        { country: "kz", name: "Tengri", type: "media" },
        { country: "ru", name: "Meduza", type: "media" },
      ],
      [
        { country: "kz", id: "source-1", name: "Tengri", type: "website" },
        { country: "kz", id: "source-2", name: "Tengri", type: "media" },
        { country: "ru", id: "source-3", name: "Meduza", type: "media" },
      ],
    ),
    {
      toDelete: [],
      toInsert: [],
      toUpdate: [],
    },
  );
});

test("diffSourcesForSync returns updates when type or country changed", () => {
  assert.deepEqual(
    diffSourcesForSync(
      [
        { country: "kz", name: "Tengri", type: "news" },
        { country: "de", name: "DW", type: "media" },
      ],
      [
        { country: "kz", id: "source-1", name: "Tengri", type: "website" },
        { country: null, id: "source-2", name: "DW", type: "media" },
      ],
    ),
    {
      toDelete: [],
      toInsert: [],
      toUpdate: [
        { country: "kz", id: "source-1", name: "Tengri", type: "news" },
        { country: "de", id: "source-2", name: "DW", type: "media" },
      ],
    },
  );
});
