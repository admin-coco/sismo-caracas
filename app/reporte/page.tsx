"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import imageCompression from "browser-image-compression";
import { supabase, PHOTOS_BUCKET, type Severity } from "@/lib/supabase";
import { SEVERITIES } from "@/lib/severity";
import { CARACAS, whatsappShareUrl } from "@/lib/share";
import { searchAddress, type GeoResult } from "@/lib/geocode";

const OPENFREEMAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

type GeoState = "idle" | "locating" | "ok" | "denied" | "error";

export default function ReportPage() {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [coords, setCoords] = useState({ lat: CARACAS.lat, lng: CARACAS.lng });
  const [geo, setGeo] = useState<GeoState>("idle");
  const [place, setPlace] = useState(""); // building/house name + address text
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [severity, setSeverity] = useState<Severity | null>(null);
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  // Honeypot: humans never see/fill this; bots auto-fill it. If set, we bail.
  const [hp, setHp] = useState("");
  const [helpOpen, setHelpOpen] = useState(false); // "Hecho con amor" help modal
  const [error, setError] = useState<string | null>(null);

  // Initialize the draggable-pin map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OPENFREEMAP_STYLE,
      center: [CARACAS.lng, CARACAS.lat],
      zoom: CARACAS.zoom,
      attributionControl: { compact: true },
    });
    const marker = new maplibregl.Marker({ color: "#dc2626", draggable: true })
      .setLngLat([CARACAS.lng, CARACAS.lat])
      .addTo(map);
    // The pin is the source of truth — dragging it sets the coordinates.
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

  // Shared by geolocation and address pick: move pin + recenter map + record coords.
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
    if (!navigator.geolocation) {
      setGeo("error");
      return;
    }
    setGeo("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        moveTo(pos.coords.latitude, pos.coords.longitude);
        setGeo("ok");
      },
      (err) => {
        // 1 = denied, 2 = unavailable, 3 = timeout
        setGeo(err.code === 1 ? "denied" : "error");
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  }

  // Debounced address autocomplete (Nominatim asks for <=1 req/s).
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
    // Prefill the building/address name with the first part of the result.
    if (!place.trim()) setPlace(r.label.split(",").slice(0, 2).join(",").trim());
    setQuery("");
    setResults([]);
  }

  async function submit() {
    if (severity == null) return;
    // Honeypot tripped → almost certainly a bot. Pretend it worked (so it
    // won't retry) but write nothing.
    if (hp.trim() !== "") {
      setDone(true);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      let photo_url: string | null = null;
      if (file) {
        // Compress hard — free-tier storage is only 1 GB and phone photos are huge.
        const compressed = await imageCompression(file, {
          maxSizeMB: 0.6,
          maxWidthOrHeight: 1280,
          useWebWorker: true,
        });
        const path = `${crypto.randomUUID()}.jpg`;
        const { error: upErr } = await supabase.storage
          .from(PHOTOS_BUCKET)
          .upload(path, compressed, { contentType: "image/jpeg" });
        if (upErr) throw upErr;
        photo_url = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(path)
          .data.publicUrl;
      }

      // No .select() chained on purpose: supabase-js only reads the row back
      // when you call .select(), and our restrictive RLS SELECT policy would
      // block that read-back and surface a spurious error.
      const { error: insErr } = await supabase.from("reports").insert({
        lat: coords.lat,
        lng: coords.lng,
        severity,
        place: place.trim() ? place.trim().slice(0, 200) : null,
        note: note.trim() ? note.trim().slice(0, 280) : null,
        photo_url,
      });
      if (insErr) throw insErr;
      setDone(true);
    } catch (e) {
      console.error(e);
      setError(
        "No se pudo enviar el reporte. Verifica tu conexión e intenta de nuevo."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const shareUrl =
    typeof window !== "undefined"
      ? whatsappShareUrl(window.location.origin)
      : "#";

  if (done) {
    return (
      <main style={styles.success}>
        <div style={{ fontSize: 56 }}>✅</div>
        <h1 style={{ margin: "8px 0" }}>¡Gracias!</h1>
        <p style={{ color: "var(--muted)", maxWidth: 320 }}>
          Tu reporte ayuda a entender dónde se necesita ayuda. Compártelo para
          que más gente reporte.
        </p>
        <div style={styles.actions}>
          <a className="btn btn-whatsapp" href={shareUrl}>
            📲 Compartir por WhatsApp
          </a>
          <a className="btn btn-ghost" href="/">
            🗺️ Ver el mapa
          </a>
          <button
            className="btn btn-ghost"
            onClick={() => {
              setDone(false);
              setSeverity(null);
              setNote("");
              setFile(null);
              setPlace("");
            }}
          >
            Reportar otro edificio
          </button>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      {/* Honeypot: off-screen, hidden from humans & screen readers; only bots fill it. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={hp}
        onChange={(e) => setHp(e.target.value)}
        style={{
          position: "absolute",
          left: "-9999px",
          width: 1,
          height: 1,
          opacity: 0,
        }}
      />
      <header style={styles.header}>
        <h1 style={styles.title}>🏚️ Reportar edificio dañado</h1>
        <p style={styles.sub}>Terremoto Caracas · mapa colaborativo</p>
      </header>

      <section>
        <label style={styles.label}>1. Ubicación del edificio</label>

        <input
          type="text"
          value={place}
          maxLength={200}
          onChange={(e) => setPlace(e.target.value)}
          placeholder="Nombre del edificio / casa (ej: Res. El Ávila)"
          style={styles.input}
        />

        <div style={styles.searchWrap}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="🔎 Buscar dirección (calle, urbanización…)"
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

        <p style={styles.hint}>
          Si prefieres no compartir tu ubicación, busca la dirección arriba o
          arrastra el pin rojo en el mapa.
        </p>

        <button
          className="btn btn-ghost"
          onClick={useMyLocation}
          style={{ marginTop: 4 }}
        >
          {geo === "locating" ? "Localizando…" : "📍 Usar mi ubicación"}
        </button>
        {geo === "denied" && (
          <p style={styles.hint}>
            Permiso denegado. Arrastra el pin rojo al edificio en el mapa.
          </p>
        )}
        {geo === "error" && (
          <p style={styles.hint}>
            No se pudo obtener la ubicación. Arrastra el pin rojo en el mapa.
          </p>
        )}
        {geo !== "denied" && geo !== "error" && (
          <p style={styles.hint}>
            Puedes arrastrar el pin rojo para ajustar la ubicación exacta.
          </p>
        )}
        <div ref={containerRef} style={styles.map} />
      </section>

      <section>
        <label style={styles.label}>2. Nivel de daño</label>
        <select
          value={severity ?? ""}
          onChange={(e) =>
            setSeverity(e.target.value ? (Number(e.target.value) as Severity) : null)
          }
          style={{
            ...styles.input,
            marginBottom: 0,
            borderLeft: severity
              ? `6px solid ${SEVERITIES.find((s) => s.value === severity)!.color}`
              : "6px solid transparent",
          }}
        >
          <option value="">Selecciona el nivel…</option>
          {SEVERITIES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.emoji} {s.label}
            </option>
          ))}
        </select>
      </section>

      <section>
        <label style={styles.label}>3. Foto (opcional)</label>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          style={styles.file}
        />
        {file && <p style={styles.hint}>Foto seleccionada: {file.name}</p>}
      </section>

      <section>
        <label style={styles.label}>4. Nota (opcional)</label>
        <textarea
          value={note}
          maxLength={280}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ej: grietas en la fachada, vecinos evacuados…"
          style={styles.textarea}
        />
      </section>

      {error && <p style={{ ...styles.hint, color: "#fca5a5" }}>{error}</p>}

      <button
        className="btn btn-primary"
        disabled={severity == null || submitting}
        onClick={submit}
        style={{ marginTop: 8 }}
      >
        {submitting ? "Enviando…" : "Enviar reporte"}
      </button>

      <a
        className="btn btn-ghost"
        href="/"
        style={{ marginTop: 12 }}
      >
        🗺️ Ver el mapa de daños
      </a>

      <button onClick={() => setHelpOpen(true)} style={styles.madeWith}>
        Hecho con amor 💚🇻🇪 por Coco Wallet
      </button>

      {helpOpen && (
        <div style={styles.overlay} onClick={() => setHelpOpen(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setHelpOpen(false)}
              style={styles.modalClose}
              aria-label="Cerrar"
            >
              ✕
            </button>
            <h2 style={{ margin: "0 0 4px", fontSize: 20 }}>
              Ayuda a los afectados 💚
            </h2>
            <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 16px" }}>
              ¿Cómo quieres ayudar?
            </p>
            <a
              className="btn btn-primary"
              href="https://cocomercado.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ marginBottom: 10 }}
            >
              🍲 Enviar comida
            </a>
            <a
              className="btn btn-whatsapp"
              href="https://cocowallet.app"
              target="_blank"
              rel="noopener noreferrer"
            >
              💸 Enviar dinero
            </a>
          </div>
        </div>
      )}
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 520, margin: "0 auto", padding: 16 },
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
    border: "none",
    color: "var(--text)",
    fontSize: 15,
    colorScheme: "dark", // makes native <select> dropdown render dark + readable
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
  },
  resultItem: {
    padding: "12px 10px",
    borderRadius: 8,
    fontSize: 14,
    cursor: "pointer",
    borderBottom: "1px solid rgba(148,163,184,0.15)",
  },
  resultEmpty: {
    padding: "12px 10px",
    fontSize: 14,
    color: "var(--muted)",
  },
  map: {
    height: 180,
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 8,
  },
  file: {
    width: "100%",
    padding: 12,
    background: "var(--panel)",
    borderRadius: 12,
    border: "none",
    color: "var(--text)",
  },
  textarea: {
    width: "100%",
    minHeight: 60,
    padding: 12,
    background: "var(--panel)",
    borderRadius: 12,
    border: "none",
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
  madeWith: {
    display: "block",
    width: "100%",
    margin: "20px 0 28px",
    padding: 8,
    background: "transparent",
    border: "none",
    color: "var(--muted)",
    fontSize: 14,
    textAlign: "center",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    zIndex: 50,
  },
  modal: {
    position: "relative",
    width: "100%",
    maxWidth: 340,
    background: "var(--panel)",
    borderRadius: 16,
    padding: 24,
    display: "flex",
    flexDirection: "column",
  },
  modalClose: {
    position: "absolute",
    top: 12,
    right: 14,
    background: "transparent",
    border: "none",
    color: "var(--muted)",
    fontSize: 18,
  },
};
