import type { RawArticle, SourceDef } from "./types";

function withFinanceCreatorMeta(
  source: SourceDef,
  item: RawArticle,
): RawArticle {
  if (source.category !== "finance" || source.subcategory !== "creator") {
    return item;
  }
  const channel =
    source.type === "rss" ? "public RSS" : "public source";
  const meta = item.meta?.includes("opinion/NFA")
    ? item.meta
    : [item.meta, `${channel} | opinion/NFA`].filter(Boolean).join(" | ");
  const excerpt = item.excerpt?.includes("NFA")
    ? item.excerpt
    : item.excerpt
      ? `观点/NFA: ${item.excerpt}`
      : "观点/NFA: Market creator commentary; not investment advice.";
  return { ...item, meta, excerpt };
}

export function applySourceFetchLimit(
  source: SourceDef,
  items: RawArticle[],
): RawArticle[] {
  const capped =
    source.fetchLimit === undefined ? items : items.slice(0, source.fetchLimit);
  return capped.map((item) => withFinanceCreatorMeta(source, item));
}
