import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCommentsTextTaskContentIdsResolvedHref,
  createCommentsTextTaskContentIdsImportState,
  shouldImportCommentsTextTaskContentIds,
  shouldLoadCommentsPageData,
} from "./comments-page-view-helpers";

test("createCommentsTextTaskContentIdsImportState keeps selected posts, stores search state, and removes p from href", () => {
  assert.deepEqual(
    createCommentsTextTaskContentIdsImportState({
      searchFrom: "1710000000",
      searchQuery: "toxic",
      searchTo: "1720000000",
      selectedPosts: ["post-a", "post-b"],
    }),
    {
      href: "/comments/text?from=1710000000&q=toxic&to=1720000000",
      posts: ["post-a", "post-b"],
      searchState: {
        searchQuery: "toxic",
        selectedPosts: ["post-a", "post-b"],
      },
    },
  );
});

test("buildCommentsTextTaskContentIdsResolvedHref preserves supported query params and drops p", () => {
  assert.equal(
    buildCommentsTextTaskContentIdsResolvedHref({
      searchFrom: "",
      searchQuery: "",
      searchTo: "",
    }),
    "/comments/text",
  );

  assert.equal(
    buildCommentsTextTaskContentIdsResolvedHref({
      searchFrom: "1710000000",
      searchQuery: "some query",
      searchTo: "1720000000",
    }),
    "/comments/text?from=1710000000&q=some+query&to=1720000000",
  );
});

test("shouldImportCommentsTextTaskContentIds only enables import flow for text tab with p param", () => {
  assert.equal(shouldImportCommentsTextTaskContentIds("text", true), true);
  assert.equal(shouldImportCommentsTextTaskContentIds("chart", true), false);
  assert.equal(shouldImportCommentsTextTaskContentIds("upload", true), false);
  assert.equal(shouldImportCommentsTextTaskContentIds("text", false), false);
});

test("shouldLoadCommentsPageData blocks loading while importing p and resumes after storage-backed state is ready", () => {
  assert.equal(
    shouldLoadCommentsPageData({
      isImportingTaskContentIdsSearchParam: true,
      isSearchReady: true,
      storedSelectedPosts: ["post-a"],
    }),
    false,
  );

  assert.equal(
    shouldLoadCommentsPageData({
      isImportingTaskContentIdsSearchParam: false,
      isSearchReady: false,
      storedSelectedPosts: ["post-a"],
    }),
    false,
  );

  assert.equal(
    shouldLoadCommentsPageData({
      isImportingTaskContentIdsSearchParam: false,
      isSearchReady: true,
      storedSelectedPosts: null,
    }),
    false,
  );

  assert.equal(
    shouldLoadCommentsPageData({
      isImportingTaskContentIdsSearchParam: false,
      isSearchReady: true,
      storedSelectedPosts: [],
    }),
    true,
  );
});
