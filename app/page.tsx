"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { supabase, type ReportRow } from "@/lib/supabase";
import { severityInfo, SEVERITIES } from "@/lib/severity";
import { CARACAS, shareApp, SHARE_URL } from "@/lib/share";
import { fetchAcopios, type AcopioRow } from "@/lib/acopios";
import { fetchPersons, type PersonRow } from "@/lib/persons";
import {
  RESUMEN_STATS,
  RESUMEN_SOURCE,
  RESUMEN_DATE,
} from "@/lib/stats";
import {
  fetchContributions,
  addContribution,
  uploadContributionPhoto,
  type ContributionRow,
} from "@/lib/contributions";

const OPENFREEMAP_STYLE = "https://tiles.openfreemap.org/styles/dark";
const SRC = "reports";
const ACOPIO_SRC = "acopios";
const PERSON_SRC = "persons";

function personsToGeoJSON(rows: PersonRow[]) {
  return {
    type: "FeatureCollection" as const,
    features: rows.map((p) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
      properties: {
        name: `${p.first_name} ${p.last_name}`,
        cedula: p.cedula ?? "",
        phone: p.phone ?? "",
        photo_url: p.photo_url ?? "",
        note: p.note ?? "",
        found: p.found ? "1" : "",
      },
    })),
  };
}

function acopiosToGeoJSON(rows: AcopioRow[]) {
  return {
    type: "FeatureCollection" as const,
    features: rows.map((a) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [a.lng, a.lat] },
      properties: {
        name: a.name,
        needs: a.needs ?? "",
        contact: a.contact ?? "",
      },
    })),
  };
}

function toGeoJSON(rows: ReportRow[]) {
  return {
    type: "FeatureCollection" as const,
    features: rows.map((r) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [r.lng, r.lat] },
      properties: {
        id: r.id,
        severity: r.severity,
        place: r.place ?? "",
        photo_url: r.photo_url ?? "",
        note: r.note ?? "",
        created_at: r.created_at,
      },
    })),
  };
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Builds the interactive popup DOM node: report details + live community
// votes + extra photos/comments + an inline "add" form. Everything is public.
function buildPopupNode(p: Record<string, string>): HTMLElement {
  const reportId = p.id;
  const info = severityInfo(Number(p.severity));
  const when = new Date(p.created_at).toLocaleString("es-VE");

  const root = document.createElement("div");
  root.style.cssText =
    "font-family:system-ui;color:#0f172a;max-width:260px;font-size:14px;max-height:60vh;overflow-y:auto";

  const place = p.place
    ? `<div style="font-weight:600;margin-top:4px">${esc(p.place)}</div>`
    : "";
  const note = p.note
    ? `<div style="margin-top:6px">${esc(p.note)}</div>`
    : "";
  const img = p.photo_url
    ? `<img src="${esc(p.photo_url)}" style="width:100%;border-radius:8px;margin-top:6px"/>`
    : "";

  const where = p.place ? p.place.split(",")[0] : "un edificio";
  // Share the per-building URL so X/WhatsApp scrape THIS building's photo.
  const buildingUrl = `https://sismovenezuela.org/edificio/${reportId}`;
  const shareText = `🏚️ ${where} reportado como ${info.label} — Terremoto Venezuela ${buildingUrl}`;
  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  root.innerHTML = `
    <strong style="color:${info.color}">${info.emoji} ${info.label}</strong>
    ${place}${note}${img}
    <div style="color:#64748b;font-size:11px;margin-top:6px">${when}</div>
    <div style="display:flex;gap:6px;margin-top:8px">
      <a href="${xUrl}" target="_blank" rel="noopener noreferrer" style="flex:1;text-align:center;padding:8px;border-radius:8px;background:#000;color:#fff;font-weight:700;text-decoration:none;font-size:13px">𝕏 Compartir</a>
      <a href="${waUrl}" target="_blank" rel="noopener noreferrer" style="flex:1;text-align:center;padding:8px;border-radius:8px;background:#25d366;color:#04341c;font-weight:700;text-decoration:none;font-size:13px">WhatsApp</a>
    </div>
    <div data-contrib style="margin-top:8px"></div>
    <button data-addbtn style="width:100%;margin-top:8px;padding:8px;border:none;border-radius:8px;background:#1e293b;color:#fff;font-weight:600;cursor:pointer">➕ Añadir foto o comentario</button>
    <div data-form style="display:none;margin-top:8px"></div>
    <a href="https://venezuelareporta.org/reportar" target="_blank" rel="noopener noreferrer" style="display:block;text-align:center;margin-top:8px;padding:8px;border-radius:8px;background:#7c3aed;color:#fff;font-weight:700;text-decoration:none;font-size:13px">🧍 Reportar desaparecido</a>
  `;

  const contribEl = root.querySelector("[data-contrib]") as HTMLElement;
  const addBtn = root.querySelector("[data-addbtn]") as HTMLButtonElement;
  const formEl = root.querySelector("[data-form]") as HTMLElement;

  // --- render public photos & comments ---
  function renderContribs(rows: ContributionRow[]) {
    const items = rows.filter(
      (r) => r.kind === "comment" || r.kind === "photo"
    );
    contribEl.innerHTML = items
      .map((r) => {
        if (r.kind === "photo" && r.photo_url)
          return `<img src="${esc(r.photo_url)}" style="width:100%;border-radius:8px;margin-top:6px"/>`;
        if (r.kind === "comment" && r.comment)
          return `<div style="background:#f1f5f9;border-radius:8px;padding:6px 8px;margin-top:6px">💬 ${esc(r.comment)}</div>`;
        return "";
      })
      .join("");
  }

  async function load() {
    const rows = await fetchContributions(reportId);
    renderContribs(rows);
  }

  // --- inline add form (photo + comment) ---
  let formOpen = false;
  addBtn.onclick = () => {
    formOpen = !formOpen;
    formEl.style.display = formOpen ? "block" : "none";
    if (formOpen && !formEl.innerHTML) {
      formEl.innerHTML = `
        <input data-file type="file" accept="image/*" capture="environment" style="width:100%;font-size:13px;margin-bottom:6px"/>
        <textarea data-text maxlength="280" placeholder="Comentario (opcional)…" style="width:100%;min-height:54px;padding:8px;border-radius:8px;border:1px solid #cbd5e1;font-size:13px"></textarea>
        <button data-send style="width:100%;margin-top:6px;padding:8px;border:none;border-radius:8px;background:#dc2626;color:#fff;font-weight:700;cursor:pointer">Enviar</button>
        <div data-msg style="font-size:12px;color:#64748b;margin-top:4px"></div>
      `;
      const fileInput = formEl.querySelector("[data-file]") as HTMLInputElement;
      const textInput = formEl.querySelector("[data-text]") as HTMLTextAreaElement;
      const sendBtn = formEl.querySelector("[data-send]") as HTMLButtonElement;
      const msg = formEl.querySelector("[data-msg]") as HTMLElement;
      sendBtn.onclick = async () => {
        const file = fileInput.files?.[0];
        const text = textInput.value.trim();
        if (!file && !text) {
          msg.textContent = "Añade una foto o un comentario.";
          return;
        }
        sendBtn.disabled = true;
        msg.textContent = "Enviando…";
        try {
          if (file) {
            const url = await uploadContributionPhoto(file);
            await addContribution({ reportId, kind: "photo", photoUrl: url });
          }
          if (text) {
            await addContribution({ reportId, kind: "comment", comment: text });
          }
          formEl.style.display = "none";
          formOpen = false;
          formEl.innerHTML = "";
          load();
        } catch (e) {
          console.error(e);
          msg.textContent = "No se pudo enviar. Intenta de nuevo.";
          sendBtn.disabled = false;
        }
      };
    }
  };

  load();
  return root;
}

// Short, shareable label for a building (severity + first part of place).
function shareLabel(r: ReportRow): string {
  const sev = severityInfo(r.severity).label;
  const where = r.place ? r.place.split(",")[0] : "un edificio";
  return `🏚️ ${where} reportado como ${sev}`;
}

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  return `hace ${Math.floor(hrs / 24)} d`;
}

// Preview grid of recently reported buildings, shown below the map.
// Clicking a card opens a detail modal (photos, comments, add more) and a
// "Ver en el mapa" deep-link. onLocate flies the map to the building's pin.
function BuildingGrid({
  reports,
  onLocate,
}: {
  reports: ReportRow[];
  onLocate: (r: ReportRow) => void;
}) {
  // Show reports WITH a photo first (more useful/visual), newest-first within
  // each group; `reports` is already ordered newest-first so a stable sort
  // only needs to push photo-less ones to the back.
  const recent = [...reports]
    .sort((a, b) => (a.photo_url ? 0 : 1) - (b.photo_url ? 0 : 1))
    .slice(0, 24);
  const [selected, setSelected] = useState<ReportRow | null>(null);
  return (
    <section id="grid" style={gridStyles.wrap}>
      <h2 style={gridStyles.heading}>🏚️ Edificios reportados recientemente</h2>
      {recent.length === 0 ? (
        <p style={gridStyles.empty}>
          Aún no hay reportes. Sé el primero en reportar un edificio.
        </p>
      ) : (
        <div style={gridStyles.grid}>
          {recent.map((r) => {
            const info = severityInfo(r.severity);
            return (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                style={gridStyles.card}
              >
                <div style={gridStyles.thumb}>
                  {r.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.photo_url}
                      alt={r.place ?? "Edificio reportado"}
                      style={gridStyles.img}
                      loading="lazy"
                    />
                  ) : (
                    <div style={gridStyles.noImg}>🏚️</div>
                  )}
                </div>
                <div style={gridStyles.body}>
                  <div style={gridStyles.metaRow}>
                    <span
                      style={{ ...gridStyles.badge, background: info.color }}
                    >
                      {info.label}
                    </span>
                    <span style={gridStyles.time}>{timeAgo(r.created_at)}</span>
                  </div>
                  {r.place && <div style={gridStyles.place}>{r.place}</div>}
                  {r.note && <div style={gridStyles.note}>{r.note}</div>}
                </div>
              </button>
            );
          })}
        </div>
      )}
      <a className="btn btn-primary" href="/reporte" style={{ marginTop: 16 }}>
        ➕ Reportar
      </a>

      {selected && (
        <BuildingModal
          report={selected}
          onClose={() => setSelected(null)}
          onLocate={() => {
            onLocate(selected);
            setSelected(null);
          }}
        />
      )}
    </section>
  );
}

// Detail modal for a building: report info + community photos/comments +
// an "add" form + "Ver en el mapa".
function BuildingModal({
  report,
  onClose,
  onLocate,
}: {
  report: ReportRow;
  onClose: () => void;
  onLocate: () => void;
}) {
  const info = severityInfo(report.severity);
  const [contribs, setContribs] = useState<ContributionRow[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState("");

  function load() {
    fetchContributions(report.id).then(setContribs);
  }
  useEffect(load, [report.id]);

  const photos = contribs.filter((c) => c.kind === "photo" && c.photo_url);
  const comments = contribs.filter((c) => c.kind === "comment" && c.comment);

  async function send() {
    if (!file && !text.trim()) {
      setMsg("Añade una foto o un comentario.");
      return;
    }
    setSending(true);
    setMsg("Enviando…");
    try {
      if (file) {
        const url = await uploadContributionPhoto(file);
        await addContribution({ reportId: report.id, kind: "photo", photoUrl: url });
      }
      if (text.trim()) {
        await addContribution({ reportId: report.id, kind: "comment", comment: text.trim() });
      }
      setFile(null);
      setText("");
      setMsg("");
      load();
    } catch (e) {
      console.error(e);
      setMsg("No se pudo enviar. Intenta de nuevo.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={modalStyles.close} aria-label="Cerrar">
          ✕
        </button>

        <span style={{ ...gridStyles.badge, background: info.color }}>
          {info.emoji} {info.label}
        </span>
        {report.place && <div style={modalStyles.place}>{report.place}</div>}
        {report.note && <div style={modalStyles.note}>{report.note}</div>}
        <div style={modalStyles.time}>{timeAgo(report.created_at)}</div>

        {report.photo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={report.photo_url} alt="" style={modalStyles.mainPhoto} />
        )}

        {photos.length > 0 && (
          <div style={modalStyles.photoRow}>
            {photos.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p.id} src={p.photo_url!} alt="" style={modalStyles.extraPhoto} />
            ))}
          </div>
        )}
        {comments.map((c) => (
          <div key={c.id} style={modalStyles.comment}>💬 {c.comment}</div>
        ))}

        <button className="btn btn-ghost" onClick={onLocate} style={{ marginTop: 14 }}>
          📍 Ver en el mapa
        </button>

        {/* Share this specific building — link to its own page so the
            building's photo is the social preview image. */}
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <a
            className="btn"
            style={{ background: "#000", color: "#fff", fontSize: 14, padding: 12 }}
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
              `${shareLabel(report)} — Terremoto Venezuela ${SHARE_URL}/edificio/${report.id}`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            𝕏 Compartir
          </a>
          <a
            className="btn btn-whatsapp"
            style={{ fontSize: 14, padding: 12 }}
            href={`https://wa.me/?text=${encodeURIComponent(
              `${shareLabel(report)} — Terremoto Venezuela ${SHARE_URL}/edificio/${report.id}`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp
          </a>
        </div>

        {/* Add more photos / comments */}
        <div style={modalStyles.addBox}>
          <div style={modalStyles.addTitle}>➕ Añadir más fotos o comentarios</div>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            style={modalStyles.file}
          />
          <textarea
            value={text}
            maxLength={280}
            onChange={(e) => setText(e.target.value)}
            placeholder="Comentario (opcional)…"
            style={modalStyles.textarea}
          />
          <button className="btn btn-primary" onClick={send} disabled={sending}>
            {sending ? "Enviando…" : "Enviar"}
          </button>
          {msg && <div style={modalStyles.msg}>{msg}</div>}
        </div>
      </div>
    </div>
  );
}

const modalStyles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    zIndex: 60,
  },
  modal: {
    position: "relative",
    width: "100%",
    maxWidth: 380,
    maxHeight: "88vh",
    overflowY: "auto",
    background: "var(--panel)",
    borderRadius: 16,
    padding: 20,
  },
  close: {
    position: "absolute",
    top: 12,
    right: 14,
    background: "transparent",
    border: "none",
    color: "var(--muted)",
    fontSize: 18,
  },
  place: { fontWeight: 800, fontSize: 16, margin: "10px 0 4px" },
  note: { color: "var(--muted)", fontSize: 14 },
  time: { color: "var(--muted)", fontSize: 12, marginTop: 4 },
  mainPhoto: { width: "100%", borderRadius: 10, marginTop: 12 },
  photoRow: { display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 },
  extraPhoto: { width: "calc(50% - 3px)", borderRadius: 8 },
  comment: {
    background: "rgba(0,0,0,0.05)",
    borderRadius: 8,
    padding: "6px 8px",
    marginTop: 6,
    fontSize: 14,
  },
  addBox: {
    marginTop: 16,
    paddingTop: 14,
    borderTop: "1px solid var(--border)",
  },
  addTitle: { fontWeight: 700, fontSize: 14, marginBottom: 8 },
  file: { width: "100%", fontSize: 13, marginBottom: 8 },
  textarea: {
    width: "100%",
    minHeight: 54,
    padding: 10,
    borderRadius: 8,
    border: "1px solid var(--border)",
    background: "#fff",
    color: "var(--text)",
    fontSize: 14,
    marginBottom: 8,
    resize: "vertical",
  },
  msg: { fontSize: 12, color: "var(--muted)", marginTop: 6 },
};

const gridStyles: Record<string, React.CSSProperties> = {
  wrap: { maxWidth: 760, margin: "0 auto", padding: "24px 16px 40px" },
  heading: { fontSize: 18, margin: "0 0 16px" },
  empty: { color: "var(--muted)", textAlign: "center", padding: "24px 0" },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
    gap: 12,
  },
  card: {
    display: "block",
    width: "100%",
    background: "var(--panel)",
    borderRadius: 14,
    overflow: "hidden",
    textDecoration: "none",
    color: "var(--text)",
    border: "1px solid var(--border)",
    padding: 0,
    textAlign: "left",
    cursor: "pointer",
    font: "inherit",
  },
  thumb: {
    width: "100%",
    aspectRatio: "4 / 3",
    background: "#ede7d8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  img: { width: "100%", height: "100%", objectFit: "cover" },
  noImg: { fontSize: 36, opacity: 0.5 },
  body: { padding: 10 },
  metaRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    marginBottom: 6,
  },
  badge: {
    fontSize: 11,
    fontWeight: 700,
    color: "#fff",
    padding: "3px 8px",
    borderRadius: 999,
  },
  time: { fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap" },
  place: {
    fontWeight: 700,
    fontSize: 14,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  note: {
    fontSize: 12,
    color: "var(--muted)",
    marginTop: 2,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
};

export default function MapPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const loadedRef = useRef(false);
  const [count, setCount] = useState<number | null>(null);
  const [reports, setReports] = useState<ReportRow[]>([]); // for the grid below
  const [acopioCount, setAcopioCount] = useState(0);
  const [personCount, setPersonCount] = useState(0);
  const [heatmap, setHeatmap] = useState(false);
  const [copied, setCopied] = useState(false); // "link copied" toast
  const [resumenOpen, setResumenOpen] = useState(false); // stats modal
  // True when the browser can't create a WebGL context (some in-app browsers,
  // old devices). We then show a no-map fallback instead of a blank crash.
  const [mapError, setMapError] = useState(false);

  async function fetchReports(): Promise<ReportRow[]> {
    const { data, error } = await supabase
      .from("reports")
      .select("id,lat,lng,severity,place,photo_url,note,created_at")
      .order("created_at", { ascending: false })
      .limit(5000);
    if (error) {
      console.error(error);
      return [];
    }
    return (data ?? []) as ReportRow[];
  }

  function refresh() {
    fetchReports().then((rows) => {
      setCount(rows.length);
      setReports(rows);
      const src = mapRef.current?.getSource(SRC) as
        | maplibregl.GeoJSONSource
        | undefined;
      src?.setData(toGeoJSON(rows));
    });
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    // WebGL can be unavailable in some in-app browsers / old devices. MapLibre
    // v4 throws on construction in that case, so we catch and degrade to a
    // fallback instead of letting an uncaught error blank the page.
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: OPENFREEMAP_STYLE,
        center: [CARACAS.lng, CARACAS.lat],
        zoom: CARACAS.zoom,
        // Compact attribution collapses to a small ⓘ; the action buttons float
        // above it (see bottomBar style) so nothing is covered.
        attributionControl: { compact: true },
      });
    } catch (e) {
      console.error("Map init failed:", e);
      setMapError(true);
      fetchReports().then((rows) => {
        setCount(rows.length);
        setReports(rows);
      });
      return;
    }
    map.on("error", (e) => {
      // A WebGL context failure surfaces here too.
      if (String(e?.error?.message || "").includes("WebGL")) setMapError(true);
    });
    mapRef.current = map;

    map.on("load", async () => {
      // Collapse the compact attribution to just the ⓘ icon (it loads
      // expanded). Tapping the icon still reveals full attribution.
      const attrib = containerRef.current?.querySelector(
        ".maplibregl-ctrl-attrib.maplibregl-compact-show"
      );
      attrib?.classList.remove("maplibregl-compact-show");
      if (attrib instanceof HTMLDetailsElement) attrib.open = false;

      const rows = await fetchReports();
      setCount(rows.length);
      setReports(rows);

      // No clustering: every building pin stays visible at every zoom level.
      map.addSource(SRC, {
        type: "geojson",
        data: toGeoJSON(rows),
      });
      // Every report as its own circle, colored by severity. Radius scales
      // with zoom so pins are visible when zoomed out and tappable when in.
      map.addLayer({
        id: "points",
        type: "circle",
        source: SRC,
        paint: {
          "circle-color": [
            "step",
            ["get", "severity"],
            "#22c55e",
            2,
            "#eab308",
            3,
            "#f97316",
            4,
            "#dc2626",
          ],
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            8,
            5,
            12,
            8,
            16,
            12,
          ],
          "circle-stroke-width": 2,
          "circle-stroke-color": "rgba(255,255,255,0.9)",
        },
      });

      // Centros de acopio: green pins, separate source.
      const acopios = await fetchAcopios();
      setAcopioCount(acopios.length);
      map.addSource(ACOPIO_SRC, {
        type: "geojson",
        data: acopiosToGeoJSON(acopios),
      });
      map.addLayer({
        id: "acopios",
        type: "circle",
        source: ACOPIO_SRC,
        paint: {
          "circle-color": "#15803d",
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            8,
            6,
            12,
            9,
            16,
            13,
          ],
          "circle-stroke-width": 3,
          "circle-stroke-color": "#bbf7d0",
        },
      });
      map.on("click", "acopios", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const p = f.properties as Record<string, string>;
        const needs = p.needs
          ? `<div style="margin-top:6px">${p.needs}</div>`
          : "";
        const contact = p.contact
          ? `<div style="margin-top:6px;color:#15803d;font-weight:600">📞 ${p.contact}</div>`
          : "";
        new maplibregl.Popup({ maxWidth: "260px" })
          .setLngLat((f.geometry as GeoJSON.Point).coordinates as [number, number])
          .setHTML(
            `<div style="font-family:system-ui;color:#0f172a">
               <strong style="color:#15803d">📦 ${p.name}</strong>
               ${needs}${contact}
             </div>`
          )
          .addTo(map);
      });

      // Missing persons: purple pins, separate source.
      const persons = await fetchPersons();
      setPersonCount(persons.length);
      map.addSource(PERSON_SRC, {
        type: "geojson",
        data: personsToGeoJSON(persons),
      });
      map.addLayer({
        id: "persons",
        type: "circle",
        source: PERSON_SRC,
        paint: {
          "circle-color": "#7c3aed",
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            8,
            6,
            12,
            9,
            16,
            13,
          ],
          "circle-stroke-width": 3,
          "circle-stroke-color": "#ddd6fe",
        },
      });
      map.on("click", "persons", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const p = f.properties as Record<string, string>;
        const img = p.photo_url
          ? `<img src="${p.photo_url}" style="width:100%;border-radius:8px;margin-top:6px"/>`
          : "";
        const cedula = p.cedula
          ? `<div style="margin-top:4px">C.I.: ${p.cedula}</div>`
          : "";
        const phone = p.phone
          ? `<div style="margin-top:4px;color:#7c3aed;font-weight:600">📞 ${p.phone}</div>`
          : "";
        const note = p.note ? `<div style="margin-top:6px">${p.note}</div>` : "";
        new maplibregl.Popup({ maxWidth: "260px" })
          .setLngLat((f.geometry as GeoJSON.Point).coordinates as [number, number])
          .setHTML(
            `<div style="font-family:system-ui;color:#0f172a">
               <strong style="color:#7c3aed">🧍 Desaparecido${p.found ? " · ENCONTRADO ✅" : ""}</strong>
               <div style="font-weight:700;margin-top:4px">${p.name}</div>
               ${cedula}${phone}${note}${img}
             </div>`
          )
          .addTo(map);
      });

      // Heatmap layer (hidden until toggled), weighted by severity.
      map.addLayer({
        id: "heat",
        type: "heatmap",
        source: SRC,
        layout: { visibility: "none" },
        paint: {
          "heatmap-weight": [
            "interpolate",
            ["linear"],
            ["get", "severity"],
            1,
            0.4,
            4,
            1,
          ],
          "heatmap-radius": 30,
          "heatmap-opacity": 0.8,
        },
      });

      loadedRef.current = true;

      // Tap a single point → interactive popup (details + votes + photos/comments).
      map.on("click", "points", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const p = f.properties as Record<string, string>;
        new maplibregl.Popup({ maxWidth: "280px" })
          .setLngLat((f.geometry as GeoJSON.Point).coordinates as [number, number])
          .setDOMContent(buildPopupNode(p))
          .addTo(map);
      });

      map.on("mouseenter", "points", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "points", () => {
        map.getCanvas().style.cursor = "";
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
      loadedRef.current = false;
    };
  }, []);

  // Live counter: refresh every 20s for social proof.
  useEffect(() => {
    const id = setInterval(() => {
      if (loadedRef.current) refresh();
    }, 20000);
    return () => clearInterval(id);
  }, []);

  function toggleHeatmap() {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    const next = !heatmap;
    setHeatmap(next);
    const showHeat = next ? "visible" : "none";
    const showPts = next ? "none" : "visible";
    map.setLayoutProperty("heat", "visibility", showHeat);
    map.setLayoutProperty("points", "visibility", showPts);
  }

  async function handleShare() {
    const result = await shareApp();
    if (result === "copied") {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  // Scroll back to the map and fly to a building's pin + open its popup.
  function flyToReport(r: ReportRow) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({ center: [r.lng, r.lat], zoom: 17 });
    new maplibregl.Popup({ maxWidth: "280px" })
      .setLngLat([r.lng, r.lat])
      .setDOMContent(
        buildPopupNode({
          id: r.id,
          severity: String(r.severity),
          place: r.place ?? "",
          photo_url: r.photo_url ?? "",
          note: r.note ?? "",
          created_at: r.created_at,
        })
      )
      .addTo(map);
  }

  // Deep-link: /?b=<id> (e.g. from a shared /edificio/<id> link) → open that
  // building's pin once reports + map are ready. Fire once.
  const deepLinkedRef = useRef(false);
  useEffect(() => {
    if (deepLinkedRef.current || !loadedRef.current || reports.length === 0) return;
    const id = new URLSearchParams(window.location.search).get("b");
    if (!id) return;
    const r = reports.find((x) => x.id === id);
    if (r) {
      deepLinkedRef.current = true;
      flyToReport(r);
    }
  }, [reports]); // eslint-disable-line react-hooks/exhaustive-deps

  if (mapError) {
    // No WebGL: skip the map but still show the count, actions, and the grid.
    return (
      <main>
        <section
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            padding: "40px 24px 24px",
            gap: 16,
          }}
        >
          <div style={{ fontSize: 48 }}>🗺️</div>
          <h1 style={{ margin: 0, fontSize: 22 }}>
            {count == null ? "…" : count.toLocaleString("es-VE")} edificios
            reportados
          </h1>
          <p style={{ color: "var(--muted)", maxWidth: 340, margin: 0 }}>
            Tu navegador no puede mostrar el mapa, pero abajo puedes ver los
            reportes recientes.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 320 }}>
            <a className="btn btn-primary" href="/reporte">
              ➕ Reportar
            </a>
            <button className="btn btn-whatsapp" onClick={handleShare}>
              {copied ? "✅ ¡Enlace copiado!" : "📲 Compartir"}
            </button>
            <a className="btn btn-ghost" href="/ayuda">
              💚 Ayuda y recursos
            </a>
          </div>
        </section>
        <BuildingGrid reports={reports} onLocate={flyToReport} />
      </main>
    );
  }

  return (
    <main>
      {/* Full-screen map hero. Overlays are positioned relative to this. */}
      <section style={{ position: "relative", height: "100dvh" }}>
        <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />

        <div style={styles.topBar}>
          <button
            style={{ ...styles.counter, border: "none", cursor: "pointer" }}
            onClick={() =>
              document
                .getElementById("grid")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            📊 {count == null ? "…" : count.toLocaleString("es-VE")} edificios ›
          </button>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <a
              style={styles.toggle}
              href="https://venezuelareporta.org/"
              target="_blank"
              rel="noopener noreferrer"
            >
              🧍 Busca Persona
            </a>
            <a style={styles.toggle} href="/ayuda">
              💚 Ayuda
            </a>
            <button style={styles.toggle} onClick={toggleHeatmap}>
              {heatmap ? "📍 Puntos" : "🔥 Mapa de Calor"}
            </button>
          </div>
        </div>

        <div style={styles.bottomBar}>
          <a className="btn btn-primary" href="/reporte">
            ➕ Reportar
          </a>
          <button className="btn btn-whatsapp" onClick={handleShare}>
            {copied ? "✅ ¡Copiado!" : "📲 Compartir"}
          </button>
        </div>

        {resumenOpen && (
          <div style={styles.overlay} onClick={() => setResumenOpen(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setResumenOpen(false)}
                style={styles.modalClose}
                aria-label="Cerrar"
              >
                ✕
              </button>
              <h2 style={{ margin: "0 0 2px", fontSize: 18 }}>
                📊 Resumen · {RESUMEN_DATE}
              </h2>
              <p style={{ color: "var(--muted)", fontSize: 12, margin: "0 0 14px" }}>
                {RESUMEN_SOURCE}
              </p>

              {RESUMEN_STATS.map((s) => (
                <div key={s.label} style={styles.statRow}>
                  <span style={{ color: "var(--muted)" }}>{s.label}</span>
                  <span style={{ color: s.color, fontWeight: 800 }}>{s.value}</span>
                </div>
              ))}
              <div style={styles.statRow}>
                <span style={{ color: "var(--muted)" }}>Edificios reportados</span>
                <span style={{ color: "#fbbf24", fontWeight: 800 }}>
                  {count == null ? "…" : count.toLocaleString("es-VE")}
                </span>
              </div>
              <div style={styles.statRow}>
                <span style={{ color: "var(--muted)" }}>Centros de acopio</span>
                <span style={{ color: "#15803d", fontWeight: 800 }}>
                  {acopioCount.toLocaleString("es-VE")}
                </span>
              </div>
              <div style={styles.statRow}>
                <span style={{ color: "var(--muted)" }}>Desaparecidos reportados</span>
                <span style={{ color: "#7c3aed", fontWeight: 800 }}>
                  {personCount.toLocaleString("es-VE")}
                </span>
              </div>

              {/* Severity breakdown from our own data */}
              <div style={styles.breakdown}>
                {SEVERITIES.map((sev) => {
                  const n = reports.filter((r) => r.severity === sev.value).length;
                  return (
                    <div key={sev.value} style={styles.breakRow}>
                      <span style={{ ...styles.dot, background: sev.color }} />
                      <span style={{ flex: 1, color: "var(--muted)", fontSize: 13 }}>
                        {sev.label}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{n}</span>
                    </div>
                  );
                })}
              </div>

              <a className="btn btn-ghost" href="/ayuda" style={{ marginTop: 14 }}>
                💚 Ver ayuda y recursos
              </a>
            </div>
          </div>
        )}
      </section>

      <BuildingGrid reports={reports} onLocate={flyToReport} />
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    display: "flex",
    gap: 8,
    padding: 12,
    alignItems: "center",
    justifyContent: "space-between",
  },
  overlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    zIndex: 20,
  },
  modal: {
    position: "relative",
    width: "100%",
    maxWidth: 340,
    background: "var(--panel)",
    borderRadius: 16,
    padding: 22,
    maxHeight: "80vh",
    overflowY: "auto",
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
  statRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 0",
    borderBottom: "1px solid rgba(148,163,184,0.12)",
    fontSize: 15,
  },
  breakdown: { marginTop: 14 },
  breakRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "5px 0",
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    display: "inline-block",
  },
  counter: {
    // Light cream pill so it stands out against the dark map.
    background: "rgba(250,246,236,0.95)",
    color: "#1f2937",
    padding: "10px 14px",
    borderRadius: 999,
    fontWeight: 700,
    fontSize: 14,
    boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
  },
  toggle: {
    background: "rgba(250,246,236,0.95)",
    color: "#1f2937",
    border: "none",
    padding: "10px 14px",
    borderRadius: 999,
    fontWeight: 700,
    fontSize: 14,
    textDecoration: "none",
    display: "inline-block",
    whiteSpace: "nowrap",
    boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
  },
  bottomBar: {
    position: "absolute",
    // Sit above MapLibre's attribution strip (~22px) plus the iOS home-bar
    // safe area, so the buttons are never covered.
    bottom: "calc(env(safe-area-inset-bottom, 0px) + 22px)",
    left: 0,
    right: 0,
    display: "flex",
    gap: 10,
    padding: 12,
    zIndex: 5,
  },
};
