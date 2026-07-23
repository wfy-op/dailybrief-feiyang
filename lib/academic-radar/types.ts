export type AcademicPriority = "must-read" | "deep-read" | "watch";

export interface AcademicPaperCandidate {
  id: string;
  title: string;
  url: string;
  source: string;
  summary: string;
  authors?: string[];
  tags?: string[];
  publishedAt?: Date;
  abstractSource?: string;
  venue?: string;
  citationCount?: number;
  influentialCitationCount?: number;
  pdfUrls?: string[];
}

export interface AcademicPaperItem {
  id: string;
  /** Per-report display number. Global feed numbering is regenerated separately. */
  paper_no?: string;
  title: string;
  title_en: string;
  title_zh: string;
  url: string;
  source: string;
  summary: string;
  abstract_en: string;
  summary_zh: string;
  abstract_zh: string;
  abstract_source?: string;
  authors: string[];
  tags: string[];
  published_at?: string;
  score: number;
  priority: AcademicPriority;
  action: string;
  relevance: string;
  why_relevant: string;
  why_this_matters: string;
  matched_terms: string[];
  is_new?: boolean;
  first_seen_date?: string;
  last_seen_date?: string;
  seen_count?: number;
}

export interface AcademicRadarSection {
  generated_at: string;
  profile: string;
  items: AcademicPaperItem[];
  deep_read_candidates: AcademicPaperItem[];
  new_items_count?: number;
  push_channels?: {
    rss_path: string;
    json_path: string;
    note: string;
  };
  source_notes: string[];
  risk_caveat: string;
}
