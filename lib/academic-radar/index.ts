import { fetchArxivAcademicCandidates } from "./arxiv";
import { buildAcademicRadar } from "./analysis";
import { isUsableAcademicAbstract } from "./abstracts";
import { fetchCrossrefAcademicCandidates } from "./crossref";
import { fetchOpenAlexAcademicCandidates } from "./openalex";
import { fetchSemanticScholarAcademicCandidates } from "./semanticscholar";
import type {
  AcademicPaperCandidate,
  AcademicRadarSection,
} from "./types";
import { academicPaperKey } from "./freshness";

function candidateQuality(candidate: AcademicPaperCandidate): number {
  return (
    (isUsableAcademicAbstract(candidate.summary) ? 10 : 0) +
    (candidate.abstractSource ? 3 : 0) +
    (candidate.venue ? 2 : 0) +
    Math.min(candidate.citationCount ?? 0, 100) / 50 +
    Math.min(candidate.influentialCitationCount ?? 0, 25) / 10 +
    ((candidate.pdfUrls?.length ?? 0) > 0 ? 1 : 0) +
    (/semantic scholar|openalex/i.test(candidate.source) ? 1 : 0)
  );
}

export function dedupeAcademicCandidates(
  candidates: AcademicPaperCandidate[],
): AcademicPaperCandidate[] {
  const byKey = new Map<string, AcademicPaperCandidate>();
  for (const candidate of candidates) {
    const key = academicPaperKey(candidate);
    const existing = byKey.get(key);
    if (!existing || candidateQuality(candidate) > candidateQuality(existing)) {
      byKey.set(key, candidate);
    }
  }
  return [...byKey.values()];
}

export function isAcademicArxivEnabled(
  value = process.env.ACADEMIC_ARXIV_ENABLED,
): boolean {
  return value?.toLowerCase() !== "false";
}

export async function fetchAcademicRadar(): Promise<AcademicRadarSection> {
  const arxivPromise = isAcademicArxivEnabled()
    ? fetchArxivAcademicCandidates()
    : Promise.resolve({
        candidates: [],
        sourceNotes: ["arXiv: disabled by ACADEMIC_ARXIV_ENABLED=false."],
      });
  const [semantic, openalex, crossref, arxiv] = await Promise.all([
    fetchSemanticScholarAcademicCandidates(),
    fetchOpenAlexAcademicCandidates(),
    fetchCrossrefAcademicCandidates(),
    arxivPromise,
  ]);
  const candidates = dedupeAcademicCandidates([
    ...semantic.candidates,
    ...openalex.candidates,
    ...crossref.candidates,
    ...arxiv.candidates,
  ]);
  // Rank an oversampled pool so abstract resolution can drop unusable source
  // records and still backfill the final eight without another network pass.
  const radar = buildAcademicRadar(candidates, new Date(), 24);
  return {
    ...radar,
    source_notes: [
      ...arxiv.sourceNotes,
      ...semantic.sourceNotes,
      ...openalex.sourceNotes,
      ...crossref.sourceNotes,
      ...radar.source_notes,
    ],
  };
}

export { buildAcademicRadar };
export type {
  AcademicPaperCandidate,
  AcademicPaperItem,
  AcademicPriority,
  AcademicRadarSection,
} from "./types";
