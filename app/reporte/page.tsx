"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import imageCompression from "browser-image-compression";
import { supabase, PHOTOS_BUCKET, type Severity } from "@/lib/supabase";
import { SEVERITIES } from "@/lib/severity";
import { CARACAS, shareApp } from "@/lib/share";
import { searchAddress, type GeoResult } from "@/lib/geocode";
import { subscribeToPush, pushSupported } from "@/lib/push";
import { addPerson } from "@/lib/persons";
import { TopNav } from "@/components/TopNav";

const OPENFREEMAP_STYLE = "https://tiles.openfreemap.org/styles/dark";

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
  const [copied, setCopied] = useState(false); // "link copied" toast
  const [mapError, setMapError] = useState(false); // WebGL/mini-map unavailable
  const [notify, setNotify] = useState(false); // opt-in to push on new reports
  const [error, setError] = useState<string | null>(null);

  // Report type: building damage vs missing person. (Centro de ayuda routes
  // to /acopio.) Optional ?building=<id> links a person to a building.
  const [reportType, setReportType] = useState<"edificio" | "persona">("edificio");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [cedula, setCedula] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedBuilding, setLinkedBuilding] = useState<string | null>(null);
  // Optional building photo on the persona form → creates a linked building.
  const [buildingFile, setBuildingFile] = useState<File | null>(null);
  const [mapBig, setMapBig] = useState(false); // expanded map modal
  const bigContainerRef = useRef<HTMLDivElement | null>(null);
  const bigMapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tipo") === "persona") setReportType("persona");
    const b = params.get("building");
    if (b) {
      setReportType("persona");
      setLinkedBuilding(b);
    }
  }, []);

  // Initialize the draggable-pin map once. Guard against WebGL being
  // unavailable (some in-app browsers / old devices) so the whole form
  // doesn't crash — address search + geolocation still set the coordinates.
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

  // Expanded map modal: build a big map when opened, sync coords on drag,
  // and push the final position back to the small map on close.
  useEffect(() => {
    if (!mapBig || !bigContainerRef.current) return;
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: bigContainerRef.current,
        style: OPENFREEMAP_STYLE,
        center: [coords.lng, coords.lat],
        zoom: 16,
        attributionControl: { compact: true },
      });
    } catch (e) {
      console.error("Big map init failed:", e);
      setMapBig(false);
      return;
    }
    const marker = new maplibregl.Marker({ color: "#dc2626", draggable: true })
      .setLngLat([coords.lng, coords.lat])
      .addTo(map);
    marker.on("dragend", () => {
      const ll = marker.getLngLat();
      setCoords({ lat: ll.lat, lng: ll.lng });
      markerRef.current?.setLngLat(ll); // keep the small map in sync
    });
    // Also let tapping the map move the pin (easier on a big map).
    map.on("click", (e) => {
      marker.setLngLat(e.lngLat);
      setCoords({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      markerRef.current?.setLngLat(e.lngLat);
    });
    bigMapRef.current = map;
    setTimeout(() => map.resize(), 50); // ensure it fills the modal
    return () => {
      map.remove();
      bigMapRef.current = null;
    };
  }, [mapBig]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Compress (best-effort) + upload a photo, return its public URL.
  async function uploadPhoto(f: File): Promise<string> {
    let toUpload: File | Blob = f;
    let contentType = f.type || "image/jpeg";
    try {
      toUpload = await imageCompression(f, {
        maxSizeMB: 0.6,
        maxWidthOrHeight: 1280,
        useWebWorker: true,
      });
      contentType = "image/jpeg";
    } catch (compErr) {
      console.warn("Compression failed, uploading original:", compErr);
    }
    const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(PHOTOS_BUCKET)
      .upload(path, toUpload, { contentType });
    if (upErr) throw upErr;
    return supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(path).data.publicUrl;
  }

  async function submit() {
    // Honeypot tripped → bot. Pretend success, write nothing.
    if (hp.trim() !== "") {
      setDone(true);
      return;
    }

    if (reportType === "persona") {
      if (!firstName.trim() || !lastName.trim()) {
        setError("Escribe el nombre y apellido de la persona.");
        return;
      }
      setSubmitting(true);
      setError(null);
      try {
        const photo_url = file ? await uploadPhoto(file) : undefined;

        // If a building photo was added (and we're not already linked to an
        // existing building), create a building report too and link to it.
        // We generate the id client-side so we can link without reading back.
        let reportId = linkedBuilding ?? undefined;
        if (!reportId && buildingFile) {
          const buildingPhoto = await uploadPhoto(buildingFile);
          const newId = crypto.randomUUID();
          const { error: bErr } = await supabase.from("reports").insert({
            id: newId,
            lat: coords.lat,
            lng: coords.lng,
            severity: severity ?? 3, // default to "severo" if not chosen
            place: place.trim() ? place.trim().slice(0, 200) : null,
            note: note.trim() ? note.trim().slice(0, 280) : null,
            photo_url: buildingPhoto,
          });
          if (bErr) throw bErr;
          reportId = newId;
        }

        await addPerson({
          lat: coords.lat,
          lng: coords.lng,
          first_name: firstName.trim().slice(0, 80),
          last_name: lastName.trim().slice(0, 80),
          cedula: cedula.trim() ? cedula.trim().slice(0, 20) : undefined,
          phone: phone.trim() ? phone.trim().slice(0, 30) : undefined,
          note: note.trim() ? note.trim().slice(0, 280) : undefined,
          photo_url,
          report_id: reportId,
        });
        if (notify) subscribeToPush().catch(() => {});
        setDone(true);
      } catch (e) {
        console.error(e);
        setError("No se pudo enviar. Verifica tu conexión e intenta de nuevo.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // --- Building report ---
    if (severity == null) return;
    if (!file) {
      setError("Agrega una foto del edificio para enviar el reporte.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const photo_url = await uploadPhoto(file);
      // No .select() chained on purpose: the restrictive RLS SELECT policy
      // would block the read-back and surface a spurious error.
      const { error: insErr } = await supabase.from("reports").insert({
        lat: coords.lat,
        lng: coords.lng,
        severity,
        place: place.trim() ? place.trim().slice(0, 200) : null,
        note: note.trim() ? note.trim().slice(0, 280) : null,
        photo_url,
      });
      if (insErr) throw insErr;
      if (notify) {
        subscribeToPush().catch(() => {});
      }
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

  async function handleShare() {
    const result = await shareApp();
    if (result === "copied") {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  if (done) {
    return (
      <main style={styles.success}>
        <TopNav showMapaLink />
        <div style={{ fontSize: 56 }}>✅</div>
        <h1 style={{ margin: "8px 0" }}>¡Gracias!</h1>
        <p style={{ color: "var(--muted)", maxWidth: 320 }}>
          Tu reporte ayuda a entender dónde se necesita ayuda. Compártelo para
          que más gente reporte.
        </p>
        <div style={styles.actions}>
          <button className="btn btn-whatsapp" onClick={handleShare}>
            {copied ? "✅ ¡Enlace copiado!" : "📲 Compartir"}
          </button>
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
      <TopNav showMapaLink />
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
        <div>
          <h1 style={styles.title}>📝 Reportar</h1>
          <p style={styles.sub}>Terremoto Venezuela · mapa colaborativo</p>
        </div>
        <a href="/" style={styles.verMapa}>
          🗺️ Ver mapa
        </a>
      </header>

      {/* Type selector */}
      <div style={styles.typeRow}>
        <button
          onClick={() => setReportType("edificio")}
          style={{
            ...styles.typeBtn,
            ...(reportType === "edificio" ? styles.typeBtnActive : {}),
          }}
        >
          🏚️ Edificio
        </button>
        <a
          href="https://venezuelareporta.org/reportar"
          target="_blank"
          rel="noopener noreferrer"
          style={styles.typeBtn}
        >
          🧍 Desaparecido
        </a>
        <a href="/acopio" style={styles.typeBtn}>
          📦 Centro de ayuda
        </a>
      </div>

      {linkedBuilding && reportType === "persona" && (
        <p style={{ ...styles.hint, color: "#15803d" }}>
          📍 Esta persona se vinculará al edificio seleccionado en el mapa.
        </p>
      )}

      <div style={styles.grid}>
        {/* Left column: location */}
        <div>
          <label style={styles.label}>1. Ubicación</label>
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
          <button
            className="btn btn-ghost"
            onClick={useMyLocation}
            style={{ padding: 11, fontSize: 15 }}
          >
            {geo === "locating" ? "Localizando…" : "📍 Usar mi ubicación"}
          </button>
          <div style={{ position: "relative" }}>
            <div
              ref={containerRef}
              style={mapError ? { display: "none" } : styles.map}
            />
            {!mapError && (
              <button
                type="button"
                onClick={() => setMapBig(true)}
                style={styles.expandBtn}
                aria-label="Expandir mapa"
              >
                ⤢ Expandir
              </button>
            )}
          </div>
          <p style={styles.hint}>
            {mapError
              ? "Busca la dirección o usa tu ubicación."
              : "Arrastra el pin o toca «Expandir» para ajustar mejor."}
          </p>
        </div>

        {/* Right column: type-specific fields */}
        <div>
          {reportType === "edificio" ? (
            <>
              <label style={styles.label}>2. Nivel de daño</label>
              <select
                value={severity ?? ""}
                onChange={(e) =>
                  setSeverity(e.target.value ? (Number(e.target.value) as Severity) : null)
                }
                style={{
                  ...styles.input,
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

              <label style={styles.label}>3. Foto (obligatoria)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                style={styles.file}
              />
              {file && <p style={styles.hint}>✓ {file.name}</p>}
            </>
          ) : (
            <>
              <label style={styles.label}>2. Datos de la persona</label>
              <input
                type="text"
                value={firstName}
                maxLength={80}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Nombre"
                style={styles.input}
              />
              <input
                type="text"
                value={lastName}
                maxLength={80}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Apellido"
                style={styles.input}
              />
              <input
                type="text"
                value={cedula}
                maxLength={20}
                onChange={(e) => setCedula(e.target.value)}
                placeholder="Cédula (opcional)"
                style={styles.input}
              />
              <input
                type="tel"
                value={phone}
                maxLength={30}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Teléfono de contacto (opcional)"
                style={styles.input}
              />
              <label style={styles.label}>3. Foto de la persona</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                style={styles.file}
              />
              {file && <p style={styles.hint}>✓ {file.name}</p>}

              {!linkedBuilding && (
                <>
                  <label style={styles.label}>
                    4. Foto del edificio (opcional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setBuildingFile(e.target.files?.[0] ?? null)}
                    style={styles.file}
                  />
                  {buildingFile && (
                    <>
                      <p style={styles.hint}>✓ {buildingFile.name}</p>
                      <select
                        value={severity ?? ""}
                        onChange={(e) =>
                          setSeverity(
                            e.target.value
                              ? (Number(e.target.value) as Severity)
                              : null
                          )
                        }
                        style={{ ...styles.input, marginTop: 8 }}
                      >
                        <option value="">Nivel de daño del edificio…</option>
                        {SEVERITIES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.emoji} {s.label}
                          </option>
                        ))}
                      </select>
                      <p style={styles.hint}>
                        Se creará también un reporte del edificio en el mapa.
                      </p>
                    </>
                  )}
                </>
              )}
            </>
          )}

          <label style={styles.label}>Nota (opcional)</label>
          <textarea
            value={note}
            maxLength={280}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              reportType === "persona"
                ? "Ej: última vez visto, ropa que llevaba…"
                : "Ej: grietas en la fachada…"
            }
            style={styles.textarea}
          />
        </div>
      </div>

      {error && <p style={{ ...styles.hint, color: "#b91c1c" }}>{error}</p>}

      {pushSupported() && (
        <label style={styles.checkRow}>
          <input
            type="checkbox"
            checked={notify}
            onChange={(e) => setNotify(e.target.checked)}
            style={{ width: 18, height: 18 }}
          />
          🔔 Avísame cuando se reporten nuevos edificios
        </label>
      )}

      <button
        className="btn btn-primary"
        disabled={
          submitting ||
          (reportType === "edificio"
            ? severity == null || !file
            : !firstName.trim() || !lastName.trim())
        }
        onClick={submit}
        style={{ marginTop: 8, padding: 13 }}
      >
        {submitting
          ? "Enviando…"
          : reportType === "persona"
          ? "Reportar persona desaparecida"
          : "Enviar reporte"}
      </button>

      <button
        onClick={() => setHelpOpen(true)}
        style={{ ...styles.madeWith, margin: "10px 0 8px" }}
      >
        Hecho con amor 💚🇻🇪 por Coco Wallet
      </button>

      {mapBig && (
        <div style={styles.mapModalOverlay}>
          <div style={styles.mapModalBar}>
            <span style={{ fontWeight: 700 }}>📍 Ajusta la ubicación</span>
            <button onClick={() => setMapBig(false)} style={styles.mapModalDone}>
              ✓ Listo
            </button>
          </div>
          <div ref={bigContainerRef} style={{ flex: 1 }} />
          <p style={styles.mapModalHint}>
            Arrastra el pin o toca el mapa para marcar el lugar exacto.
          </p>
        </div>
      )}

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
  // Top padding leaves room for the fixed-position TopNav pills.
  page: { maxWidth: 480, margin: "0 auto", padding: "84px 16px 16px" },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 6,
  },
  title: { fontSize: 19, margin: "0 0 2px" },
  sub: { color: "var(--muted)", margin: 0, fontSize: 12 },
  verMapa: {
    flexShrink: 0,
    background: "var(--panel)",
    border: "1px solid var(--border)",
    color: "var(--text)",
    textDecoration: "none",
    fontWeight: 700,
    fontSize: 13,
    padding: "8px 14px",
    borderRadius: 999,
    whiteSpace: "nowrap",
  },
  // Single column — clean and easy to fill top to bottom.
  grid: {
    display: "block",
  },
  typeRow: {
    display: "flex",
    gap: 6,
    margin: "8px 0 10px",
    flexWrap: "wrap",
  },
  typeBtn: {
    flex: "1 1 30%",
    textAlign: "center",
    padding: "10px 6px",
    borderRadius: 10,
    border: "1px solid var(--border)",
    background: "var(--panel)",
    color: "var(--text)",
    fontWeight: 700,
    fontSize: 13,
    textDecoration: "none",
    cursor: "pointer",
  },
  typeBtnActive: {
    background: "var(--rojo)",
    color: "#fff",
    borderColor: "var(--rojo)",
  },
  checkRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    margin: "12px 0 0",
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
  },
  label: { display: "block", fontWeight: 700, margin: "10px 0 5px" },
  hint: { color: "var(--muted)", fontSize: 12, margin: "5px 0 0" },
  input: {
    width: "100%",
    padding: 12,
    marginBottom: 8,
    background: "var(--panel)",
    borderRadius: 12,
    border: "none",
    color: "var(--text)",
    fontSize: 15,
    colorScheme: "light", // native <select> dropdown matches the light theme
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
    height: 110,
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 6,
  },
  expandBtn: {
    position: "absolute",
    right: 8,
    bottom: 8,
    background: "rgba(250,246,236,0.95)",
    color: "#1f2937",
    border: "none",
    borderRadius: 999,
    padding: "6px 12px",
    fontWeight: 700,
    fontSize: 12,
    cursor: "pointer",
    boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
    zIndex: 2,
  },
  mapModalOverlay: {
    position: "fixed",
    inset: 0,
    background: "var(--bg)",
    display: "flex",
    flexDirection: "column",
    zIndex: 100,
  },
  mapModalBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    borderBottom: "1px solid var(--border)",
  },
  mapModalDone: {
    background: "var(--rojo)",
    color: "#fff",
    border: "none",
    borderRadius: 999,
    padding: "8px 18px",
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
  },
  mapModalHint: {
    margin: 0,
    padding: "10px 16px calc(env(safe-area-inset-bottom, 0px) + 12px)",
    textAlign: "center",
    color: "var(--muted)",
    fontSize: 13,
  },
  file: {
    width: "100%",
    padding: 10,
    background: "var(--panel)",
    borderRadius: 12,
    border: "1px solid var(--border)",
    color: "var(--text)",
    fontSize: 14,
  },
  textarea: {
    width: "100%",
    minHeight: 48,
    padding: 10,
    background: "var(--panel)",
    borderRadius: 12,
    border: "1px solid var(--border)",
    color: "var(--text)",
    fontSize: 14,
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
