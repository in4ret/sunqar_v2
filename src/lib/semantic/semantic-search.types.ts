export type SemanticSearchArticle = {
  url: string;
  title: string;
  source: string;
  dist: number;
};

export function isSemanticSearchArticles(value: unknown): value is SemanticSearchArticle[] {
  return Array.isArray(value) && value.every((article: unknown) => {
    if (!article || typeof article !== "object") {
      return false;
    }

    const row = article as Partial<SemanticSearchArticle>;

    if (
      typeof row.url !== "string" || typeof row.title !== "string" ||
      typeof row.source !== "string" || typeof row.dist !== "number" || !Number.isFinite(row.dist)
    ) {
      return false;
    }

    try {
      return ["http:", "https:"].includes(new URL(row.url).protocol);
    } catch {
      return false;
    }
  });
}
