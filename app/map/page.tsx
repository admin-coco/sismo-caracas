"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { supabase, type ReportRow } from "@/lib/supabase";
import { severityInfo } from "@/lib/severity";
import { CARACAS, whatsappShareUrl } from "@/lib/share";
import {
  fetchContributions,
  addContribution,
  uploadContributionPhoto,
  hasVoted,
  recordVote,
  type ContributionRow,
} from "@/lib/contributions";

const OPENFREEMAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const SRC = "reports";

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

  root.innerHTML = `
    <strong style="color:${info.color}">${info.emoji} ${info.label}</strong>
    ${place}${note}${img}
    <div style="color:#64748b;font-size:11px;margin-top:6px">${when}</div>
    <div data-votes style="display:flex;gap:8px;margin-top:10px"></div>
    <div data-contrib style="margin-top:8px"></div>
    <button data-addbtn style="width:100%;margin-top:8px;padding:8px;border:none;border-radius:8px;background:#1e293b;color:#fff;font-weight:600;cursor:pointer">➕ Añadir foto o comentario</button>
    <div data-form style="display:none;margin-top:8px"></div>
  `;

  const votesEl = root.querySelector("[data-votes]") as HTMLElement;
  const contribEl = root.querySelector("[data-contrib]") as HTMLElement;
  const addBtn = root.querySelector("[data-addbtn]") as HTMLButtonElement;
  const formEl = root.querySelector("[data-form]") as HTMLElement;

  // --- render the vote row (with live tallies) ---
  function renderVotes(rows: ContributionRow[]) {
    const real = rows.filter((r) => r.kind === "vote_real").length;
    const fake = rows.filter((r) => r.kind === "vote_fake").length;
    const voted = hasVoted(reportId);
    const pill = (bg: string) =>
      `flex:1;padding:8px;border:none;border-radius:8px;background:${bg};color:#fff;font-weight:700;cursor:${voted ? "default" : "pointer"};opacity:${voted ? 0.7 : 1}`;
    votesEl.innerHTML = `
      <button data-real style="${pill("#16a34a")}" ${voted ? "disabled" : ""}>👍 Real · ${real}</button>
      <button data-fake style="${pill("#dc2626")}" ${voted ? "disabled" : ""}>👎 Falso · ${fake}</button>
    `;
    if (!voted) {
      const vote = async (kind: "vote_real" | "vote_fake") => {
        recordVote(reportId, kind);
        try {
          await addContribution({ reportId, kind });
        } catch (e) {
          console.error(e);
        }
        load();
      };
      (votesEl.querySelector("[data-real]") as HTMLButtonElement).onclick = () =>
        vote("vote_real");
      (votesEl.querySelector("[data-fake]") as HTMLButtonElement).onclick = () =>
        vote("vote_fake");
    }
  }

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
    renderVotes(rows);
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

export default function MapPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const loadedRef = useRef(false);
  const [count, setCount] = useState<number | null>(null);
  const [heatmap, setHeatmap] = useState(false);

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
      const src = mapRef.current?.getSource(SRC) as
        | maplibregl.GeoJSONSource
        | undefined;
      src?.setData(toGeoJSON(rows));
    });
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OPENFREEMAP_STYLE,
      center: [CARACAS.lng, CARACAS.lat],
      zoom: CARACAS.zoom,
      // Compact attribution collapses to a small ⓘ; the action buttons float
      // above it (see bottomBar style) so nothing is covered.
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    map.on("load", async () => {
      const rows = await fetchReports();
      setCount(rows.length);

      map.addSource(SRC, {
        type: "geojson",
        data: toGeoJSON(rows),
        cluster: true,
        clusterRadius: 50,
        clusterProperties: {
          // Track the worst severity in each cluster to color it.
          maxsev: ["max", ["get", "severity"]],
        },
      });

      // Clustered circles, colored by worst severity in the cluster.
      map.addLayer({
        id: "clusters",
        type: "circle",
        source: SRC,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step",
            ["get", "maxsev"],
            "#22c55e",
            2,
            "#eab308",
            3,
            "#f97316",
            4,
            "#dc2626",
          ],
          "circle-radius": [
            "step",
            ["get", "point_count"],
            16,
            10,
            22,
            50,
            30,
          ],
          "circle-stroke-width": 2,
          "circle-stroke-color": "rgba(255,255,255,0.6)",
        },
      });
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: SRC,
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-size": 13,
        },
        paint: { "text-color": "#0f172a" },
      });

      // Unclustered single points.
      map.addLayer({
        id: "points",
        type: "circle",
        source: SRC,
        filter: ["!", ["has", "point_count"]],
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
          "circle-radius": 9,
          "circle-stroke-width": 2,
          "circle-stroke-color": "rgba(255,255,255,0.8)",
        },
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

      // Zoom into a cluster on tap.
      map.on("click", "clusters", async (e) => {
        const f = map.queryRenderedFeatures(e.point, { layers: ["clusters"] })[0];
        const clusterId = f.properties?.cluster_id;
        const source = map.getSource(SRC) as maplibregl.GeoJSONSource;
        const zoom = await source.getClusterExpansionZoom(clusterId);
        map.easeTo({
          center: (f.geometry as GeoJSON.Point).coordinates as [number, number],
          zoom,
        });
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
    map.setLayoutProperty("clusters", "visibility", showPts);
    map.setLayoutProperty("cluster-count", "visibility", showPts);
    map.setLayoutProperty("points", "visibility", showPts);
  }

  const shareUrl =
    typeof window !== "undefined"
      ? whatsappShareUrl(window.location.origin)
      : "#";

  return (
    <main style={{ position: "relative", height: "100dvh" }}>
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />

      <div style={styles.topBar}>
        <div style={styles.counter}>
          🏚️ {count == null ? "…" : count.toLocaleString("es-VE")} edificios
          reportados
        </div>
        <button style={styles.toggle} onClick={toggleHeatmap}>
          {heatmap ? "📍 Puntos" : "🔥 Mapa de calor"}
        </button>
      </div>

      <div style={styles.bottomBar}>
        <a className="btn btn-primary" href="/">
          ➕ Reportar edificio
        </a>
        <a className="btn btn-whatsapp" href={shareUrl}>
          📲 Compartir
        </a>
      </div>
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
  counter: {
    background: "rgba(15,23,42,0.9)",
    color: "#f8fafc",
    padding: "10px 14px",
    borderRadius: 999,
    fontWeight: 700,
    fontSize: 14,
  },
  toggle: {
    background: "rgba(15,23,42,0.9)",
    color: "#f8fafc",
    border: "none",
    padding: "10px 14px",
    borderRadius: 999,
    fontWeight: 700,
    fontSize: 14,
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
