// Builds a wa.me deep link that opens WhatsApp's contact picker with a
// prefilled Spanish message + the app URL. Empty path = share to any contact.
export function whatsappShareUrl(appUrl: string): string {
  const text = `🏚️ Reporta y mira los daños del terremoto en Caracas en el mapa colaborativo: ${appUrl}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

// Caracas center, used as the default map view and fallback pin location.
export const CARACAS: { lng: number; lat: number; zoom: number } = {
  lng: -66.9036,
  lat: 10.4806,
  zoom: 12,
};
