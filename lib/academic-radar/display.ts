import { academicPaperKey } from "./freshness";
import type { AcademicPaperItem, AcademicRadarSection } from "./types";

/** One authoritative order/number for JSON, HTML, Markdown, top reads and feeds. */
export function finalizeAcademicRadarDisplay(
  radar: AcademicRadarSection,
  limit = 8,
): AcademicRadarSection {
  const seen = new Set<string>();
  const unique = (items: AcademicPaperItem[]) => items.filter((item) => {
    const key = academicPaperKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const ordered = unique([
    ...radar.items.filter((item) => item.priority === "must-read"),
    ...radar.items.filter((item) => item.priority === "deep-read"),
    ...radar.items.filter((item) => item.priority === "watch"),
  ])
    .slice(0, limit)
    .map((item, index) => ({ ...item, paper_no: `P${index + 1}` }));
  return {
    ...radar,
    items: ordered,
    deep_read_candidates: ordered.filter((item) => item.priority === "deep-read"),
    new_items_count: ordered.filter((item) => item.is_new).length,
  };
}
