// Key-free address autocomplete via OpenStreetMap's Nominatim — same data
// source as our OpenFreeMap basemap, so coverage is consistent. Biased to
// Venezuela and the Caracas area. Nominatim's usage policy asks for <=1 req/s,
// so callers MUST debounce (see the report page).

export interface GeoResult {
  label: string; // human-readable display name
  lat: number;
  lng: number;
}

// Caracas viewbox (left,top,right,bottom) to rank nearby results first.
const CARACAS_VIEWBOX = "-67.10,10.55,-66.75,10.40";

export async function searchAddress(
  query: string,
  signal?: AbortSignal
): Promise<GeoResult[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const url =
    "https://nominatim.openstreetmap.org/search?" +
    new URLSearchParams({
      q,
      format: "jsonv2",
      addressdetails: "0",
      limit: "5",
      countrycodes: "ve",
      viewbox: CARACAS_VIEWBOX,
      bounded: "0",
      "accept-language": "es",
    }).toString();

  const res = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!res.ok) return [];
  const data: Array<{ display_name: string; lat: string; lon: string }> =
    await res.json();
  return data.map((d) => ({
    label: d.display_name,
    lat: parseFloat(d.lat),
    lng: parseFloat(d.lon),
  }));
}
