"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { addAcopio } from "@/lib/acopios";
import { CARACAS } from "@/lib/share";
import { searchAddress, type GeoResult } from "@/lib/geocode";
import { TopNav } from "@/components/TopNav";

const OPENFREEMAP_STYLE = "https://tiles.openfreemap.org/styles/dark";
type GeoState = "idle" | "locating" | "ok" | "denied" | "error";

export default function AcopioPage() {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [coords, setCoords] = useState({ lat: CARACAS.lat, lng: CARACAS.lng });
  const [geo, setGeo] = useState<GeoState>("idle");
  const [name, setName] = useState("");
  const [needs, setNeeds] = useState("");
  const [contact, setContact] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: OPENFREEMAP_STYLE,
        center: [CARACAS.lng, CARACAS.lat],
        zoom: CARACAS.zoom,
        attributionControl: { compact: true },
      });
    } catch (e) {
      console.error("Mini-map init failed (WebGL?):", e);
      setMapError(true);
      return;
    }
    const marker = new maplibregl.Marker({ color: "#16a34a", draggable: true })
      .setLngLat([CARACAS.lng, CARACAS.lat])
      .addTo(map);
    marker.on("dragend", () => {
      const ll = marker.getLngLat();
      setCoords({ lat: ll.lat, lng: ll.lng });
    });
    mapRef.current = map;
    markerRef.current = marker;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  function moveTo(lat: number, lng: number, zoom = 16) {
    setCoords({ lat, lng });
    const map = mapRef.current;
    const marker = markerRef.current;
    if (map && marker) {
      marker.setLngLat([lng, lat]);
      map.flyTo({ center: [lng, lat], zoom });
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) return setGeo("error");
    setGeo("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        moveTo(pos.coords.latitude, pos.coords.longitude);
        setGeo("ok");
      },
      (err) => setGeo(err.code === 1 ? "denied" : "error"),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  }

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    setSearching(true);
    const timer = setTimeout(() => {
      searchAddress(q, controller.signal)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 600);
    return () => {
      clearTimeout(timer);
      controller.abort();
      setSearching(false);
    };
  }, [query]);

  function pickResult(r: GeoResult) {
    moveTo(r.lat, r.lng, 17);
    setQuery("");
    setResults([]);
  }

  async function submit() {
    if (!name.trim()) {
      setError("Escribe el nombre del centro de acopio.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await addAcopio({
        lat: coords.lat,
        lng: coords.lng,
        name: name.trim().slice(0, 120),
        needs: needs.trim() ? needs.trim().slice(0, 280) : undefined,
        contact: contact.trim() ? contact.trim().slice(0, 120) : undefined,
      });
      setDone(true);
    } catch (e) {
      console.error(e);
      setError("No se pudo enviar. Verifica tu conexión e intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <main style={styles.success}>
        <TopNav showMapaLink />
        <div style={{ fontSize: 56 }}>✅</div>
        <h1 style={{ margin: "8px 0" }}>¡Gracias!</h1>
        <p style={{ color: "var(--muted)", maxWidth: 320 }}>
          El centro de acopio aparecerá en el mapa para que la comunidad lo
          encuentre.
        </p>
        <div style={styles.actions}>
          <a className="btn btn-primary" href="/">
            🗺️ Ver el mapa
          </a>
          <a className="btn btn-ghost" href="/acopio">
            ➕ Reportar otro
          </a>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <TopNav showMapaLink />
      <header style={styles.header}>
        <h1 style={styles.title}>📦 Reportar centro de acopio</h1>
        <p style={styles.sub}>Terremoto Venezuela · mapa colaborativo</p>
      </header>

      <section>
        <label style={styles.label}>1. Nombre del centro</label>
        <input
          type="text"
          value={name}
          maxLength={120}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Acopio Iglesia San José"
          style={styles.input}
        />
      </section>

      <section>
        <label style={styles.label}>2. Ubicación</label>
        <div style={styles.searchWrap}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="🔎 Buscar dirección…"
            style={styles.input}
            autoComplete="off"
          />
          {(results.length > 0 || searching) && (
            <ul style={styles.results}>
              {searching && results.length === 0 && (
                <li style={styles.resultEmpty}>Buscando…</li>
              )}
              {results.map((r, i) => (
                <li
                  key={`${r.lat},${r.lng},${i}`}
                  style={styles.resultItem}
                  onClick={() => pickResult(r)}
                >
                  📍 {r.label}
                </li>
              ))}
            </ul>
          )}
        </div>
        <button className="btn btn-ghost" onClick={useMyLocation} style={{ marginTop: 4 }}>
          {geo === "locating" ? "Localizando…" : "📍 Usar mi ubicación"}
        </button>
        {!mapError && (
          <p style={styles.hint}>Arrastra el pin verde para ajustar la ubicación.</p>
        )}
        {mapError && (
          <p style={styles.hint}>
            El mapa no se pudo cargar, pero puedes buscar la dirección arriba.
          </p>
        )}
        <div ref={containerRef} style={mapError ? { display: "none" } : styles.map} />
      </section>

      <section>
        <label style={styles.label}>3. ¿Qué reciben o necesitan? (opcional)</label>
        <textarea
          value={needs}
          maxLength={280}
          onChange={(e) => setNeeds(e.target.value)}
          placeholder="Ej: agua, alimentos no perecederos, medicinas…"
          style={styles.textarea}
        />
      </section>

      <section>
        <label style={styles.label}>4. Contacto (opcional)</label>
        <input
          type="text"
          value={contact}
          maxLength={120}
          onChange={(e) => setContact(e.target.value)}
          placeholder="Teléfono, WhatsApp o responsable"
          style={styles.input}
        />
      </section>

      {error && <p style={{ ...styles.hint, color: "#b91c1c" }}>{error}</p>}

      <button
        className="btn btn-primary"
        disabled={!name.trim() || submitting}
        onClick={submit}
        style={{ marginTop: 8 }}
      >
        {submitting ? "Enviando…" : "Enviar centro de acopio"}
      </button>

      <a className="btn btn-ghost" href="/" style={{ marginTop: 12, marginBottom: 32 }}>
        🗺️ Ver el mapa
      </a>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  // Top padding leaves room for the fixed-position TopNav pills.
  page: { maxWidth: 520, margin: "0 auto", padding: "84px 16px 16px" },
  header: { textAlign: "center", marginBottom: 10 },
  title: { fontSize: 20, margin: "4px 0 2px" },
  sub: { color: "var(--muted)", margin: 0, fontSize: 13 },
  label: { display: "block", fontWeight: 700, margin: "14px 0 6px" },
  hint: { color: "var(--muted)", fontSize: 12, margin: "6px 0 0" },
  input: {
    width: "100%",
    padding: 14,
    marginBottom: 10,
    background: "var(--panel)",
    borderRadius: 12,
    border: "1px solid var(--border)",
    color: "var(--text)",
    fontSize: 15,
  },
  searchWrap: { position: "relative" },
  results: {
    listStyle: "none",
    margin: "-6px 0 0",
    padding: 4,
    background: "var(--panel)",
    borderRadius: 12,
    maxHeight: 220,
    overflowY: "auto",
    border: "1px solid var(--border)",
  },
  resultItem: {
    padding: "12px 10px",
    borderRadius: 8,
    fontSize: 14,
    cursor: "pointer",
    borderBottom: "1px solid var(--border)",
  },
  resultEmpty: { padding: "12px 10px", fontSize: 14, color: "var(--muted)" },
  map: { height: 180, borderRadius: 12, overflow: "hidden", marginTop: 8 },
  textarea: {
    width: "100%",
    minHeight: 60,
    padding: 12,
    background: "var(--panel)",
    borderRadius: 12,
    border: "1px solid var(--border)",
    color: "var(--text)",
    fontSize: 15,
    resize: "vertical",
  },
  success: {
    minHeight: "100dvh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: 24,
  },
  actions: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    width: "100%",
    maxWidth: 320,
    marginTop: 24,
  },
};
