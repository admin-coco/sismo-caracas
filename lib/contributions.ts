import { supabase, PHOTOS_BUCKET } from "./supabase";

// One row per community contribution to a report: a vote, a comment, or an
// extra photo. Same RLS pattern as reports (anon insert + read approved).
export type ContributionKind = "vote_real" | "vote_fake" | "comment" | "photo";

export interface ContributionRow {
  id: string;
  report_id: string;
  kind: ContributionKind;
  comment: string | null;
  photo_url: string | null;
  created_at: string;
}

export async function fetchContributions(
  reportId: string
): Promise<ContributionRow[]> {
  const { data, error } = await supabase
    .from("contributions")
    .select("id,report_id,kind,comment,photo_url,created_at")
    .eq("report_id", reportId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error(error);
    return [];
  }
  return (data ?? []) as ContributionRow[];
}

export async function addContribution(input: {
  reportId: string;
  kind: ContributionKind;
  comment?: string;
  photoUrl?: string;
}): Promise<void> {
  const { error } = await supabase.from("contributions").insert({
    report_id: input.reportId,
    kind: input.kind,
    comment: input.comment ?? null,
    photo_url: input.photoUrl ?? null,
  });
  if (error) throw error;
}

// Reuses the same public photos bucket as the main report form.
export async function uploadContributionPhoto(file: File): Promise<string> {
  const imageCompression = (await import("browser-image-compression")).default;
  const compressed = await imageCompression(file, {
    maxSizeMB: 0.6,
    maxWidthOrHeight: 1280,
    useWebWorker: true,
  });
  const path = `${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .upload(path, compressed, { contentType: "image/jpeg" });
  if (error) throw error;
  return supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(path).data.publicUrl;
}

// --- One-vote-per-device, best-effort, via localStorage ---
const VOTE_KEY = "sismo_votes";

export function hasVoted(reportId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const v = JSON.parse(localStorage.getItem(VOTE_KEY) || "{}");
    return !!v[reportId];
  } catch {
    return false;
  }
}

export function recordVote(reportId: string, kind: "vote_real" | "vote_fake") {
  if (typeof window === "undefined") return;
  try {
    const v = JSON.parse(localStorage.getItem(VOTE_KEY) || "{}");
    v[reportId] = kind;
    localStorage.setItem(VOTE_KEY, JSON.stringify(v));
  } catch {
    /* ignore */
  }
}
