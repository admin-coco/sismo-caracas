// Canonical public URL we always share.
export const SHARE_URL = "https://sismovenezuela.org";
const SHARE_TEXT =
  "🏚️ Reporta y mira los daños del terremoto en Venezuela en el mapa colaborativo:";

// Builds a wa.me deep link that opens WhatsApp's contact picker with a
// prefilled Spanish message + the app URL. Empty path = share to any contact.
export function whatsappShareUrl(appUrl: string = SHARE_URL): string {
  return `https://wa.me/?text=${encodeURIComponent(`${SHARE_TEXT} ${appUrl}`)}`;
}

export type ShareResult = "shared" | "copied" | "failed";

// Opens the native share sheet (mobile) if available; otherwise copies the
// link to the clipboard. Returns what happened so the UI can confirm.
export async function shareApp(): Promise<ShareResult> {
  // Native share sheet — lets the user pick WhatsApp, Instagram, SMS, etc.
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({
        title: "Mapa de Daños — Terremoto Caracas",
        text: SHARE_TEXT,
        url: SHARE_URL,
      });
      return "shared";
    } catch (e) {
      // AbortError = user dismissed the sheet; don't treat as failure.
      if (e instanceof Error && e.name === "AbortError") return "shared";
      // Otherwise fall through to clipboard.
    }
  }
  // Fallback: copy the link to the clipboard.
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(SHARE_URL);
      return "copied";
    }
  } catch {
    /* fall through */
  }
  // Last-resort fallback for old browsers without the Clipboard API.
  try {
    const ta = document.createElement("textarea");
    ta.value = SHARE_URL;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    return "copied";
  } catch {
    return "failed";
  }
}

// Caracas center, used as the default map view and fallback pin location.
export const CARACAS: { lng: number; lat: number; zoom: number } = {
  lng: -66.9036,
  lat: 10.4806,
  zoom: 12,
};
