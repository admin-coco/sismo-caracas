"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { supabase, type ReportRow } from "@/lib/supabase";
import { severityInfo } from "@/lib/severity";
import { CARACAS, whatsappShareUrl } from "@/lib/share";

const OPENFREEMAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const SRC = "reports";

function toGeoJSON(rows: ReportRow[]) {
  return {
    type: "FeatureCollection" as const,
    features: rows.map((r) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [r.lng, r.lat] },
      properties: {
        severity: r.severity,
        photo_url: r.photo_url ?? "",
        note: r.note ?? "",
        created_at: r.created_at,
      },
    })),
  };
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
      .select("id,lat,lng,severity,photo_url,note,created_at")
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

      // Tap a single point → popup with photo / severity / time.
      map.on("click", "points", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const p = f.properties as Record<string, string>;
        const info = severityInfo(Number(p.severity));
        const when = new Date(p.created_at).toLocaleString("es-VE");
        const img = p.photo_url
          ? `<img src="${p.photo_url}" style="width:100%;border-radius:8px;margin-top:6px"/>`
          : "";
        const note = p.note
          ? `<div style="margin-top:6px">${p.note}</div>`
          : "";
        new maplibregl.Popup({ maxWidth: "260px" })
          .setLngLat((f.geometry as GeoJSON.Point).coordinates as [number, number])
          .setHTML(
            `<div style="font-family:system-ui;color:#0f172a">
               <strong style="color:${info.color}">${info.emoji} ${info.label}</strong>
               ${note}${img}
               <div style="color:#64748b;font-size:11px;margin-top:6px">${when}</div>
             </div>`
          )
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
    bottom: 0,
    left: 0,
    right: 0,
    display: "flex",
    gap: 10,
    padding: 12,
  },
};
