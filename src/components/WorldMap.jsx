import { useState, useEffect, useMemo } from "react";
import { geoEqualEarth, geoPath } from "d3-geo";
import { topoToFeatures } from "../lib/topo.js";
import { C } from "../lib/theme.js";

// Puerto Rico is rolled into USA in world-atlas 50m, so we render it as a small marker
const PR_COORDS = [-66.5, 18.2];

export function WorldMap({ recipes, log, onSelect, highlightId }) {
  const [features, setFeatures] = useState(null);
  const [error, setError] = useState(null);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
      .then(r => { if (!r.ok) throw new Error("fetch failed"); return r.json(); })
      .then(topo => setFeatures(topoToFeatures(topo, "countries")))
      .catch(err => { console.error(err); setError(err.message); });
  }, []);

  const numericByRecipe = useMemo(() => {
    const m = {};
    recipes.forEach(r => { m[r.numericCode] = r; });
    return m;
  }, [recipes]);

  const cookedSet = useMemo(() =>
    new Set(recipes.filter(r => log[r.id]?.cooked).map(r => r.numericCode)),
    [recipes, log]
  );

  const W = 800, H = 520;

  const { path, projection, viewBox } = useMemo(() => {
    if (!features) return { path: null, projection: null, viewBox: `0 0 ${W} ${H}` };
    const proj = geoEqualEarth().fitSize([W, H], { type: "FeatureCollection", features });
    const p = geoPath(proj);
    const [[x0, y0], [x1, y1]] = p.bounds({ type: "FeatureCollection", features });
    const margin = 6;
    const vb = `${Math.max(0, x0 - margin)} ${Math.max(0, y0 - margin)} ${(x1 - x0) + margin * 2} ${(y1 - y0) + margin * 2}`;
    return { path: p, projection: proj, viewBox: vb };
  }, [features]);

  if (error) {
    return (
      <div style={{ height: "100%", background: C.cardAlt, borderRadius: 10, marginBottom: 14, padding: 20, color: C.ink2, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        Map data couldn't load. The recipe grid below still works — the map just needs internet access to the world-atlas CDN.
      </div>
    );
  }
  if (!features || !path) {
    return <div style={{ height: "100%", background: C.cardAlt, borderRadius: 10, marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "center", color: C.inkMute, fontSize: 13 }}>Loading map…</div>;
  }

  const prCooked = cookedSet.has("630");
  const prRecipe = numericByRecipe["630"];
  const [prX, prY] = projection(PR_COORDS) || [0, 0];

  return (
    <div style={{ borderRadius: 10, overflow: "hidden" }}>
    <div style={{ position: "relative", background: C.mapBg, overflow: "hidden" }}>
      <svg viewBox={viewBox} style={{ width: "100%", maxHeight: "48vh", height: "auto", display: "block" }}>
        {/* Base layer: all countries filled, thin borders */}
        {features.map((f, i) => {
          const id = String(f.id);
          const isCooked = cookedSet.has(id);
          const recipe = numericByRecipe[id];
          const isPlanned = !!recipe;
          const fill = isCooked ? C.cok : (isPlanned ? C.planned : C.land);
          return (
            <path
              key={`${id}-${i}`}
              d={path(f)}
              fill={fill}
              stroke={fill}
              strokeWidth={1.2}
              strokeLinejoin="round"
              style={{ cursor: recipe ? "pointer" : "default", transition: "fill 0.3s, opacity 0.2s", opacity: highlightId ? (recipe?.numericCode === highlightId ? 1 : 0.3) : 1 }}
              onMouseEnter={() => recipe && setHover({ id, recipe, isCooked })}
              onMouseLeave={() => setHover(null)}
              onClick={() => recipe && onSelect(recipe.id)}
            />
          );
        })}
        {/* Outline layer: planned/cooked countries drawn on top with full border — no fill so shared edges aren't doubled */}
        {features.map((f, i) => {
          const id = String(f.id);
          const isCooked = cookedSet.has(id);
          const recipe = numericByRecipe[id];
          if (!recipe) return null;
          const isHighlighted = (highlightId && recipe.numericCode === highlightId) || (hover && hover.id === id);
          const stroke = isHighlighted ? "#FACC15" : (isCooked ? "#1E8A45" : "#9CA3AF");
          return (
            <path
              key={`outline-${id}-${i}`}
              d={path(f)}
              fill={isHighlighted ? "rgba(250,204,21,0.25)" : "none"}
              stroke={stroke}
              strokeWidth={isHighlighted ? 2.5 : 0.9}
              strokeLinejoin="round"
              style={{ pointerEvents: "none" }}
            />
          );
        })}
        {/* Puerto Rico marker (not separately mapped in 110m) */}
        {prRecipe && (
          <g
            style={{ cursor: "pointer", transition: "opacity 0.15s", opacity: highlightId ? (highlightId === "630" ? 1 : 0.3) : 1 }}
            onMouseEnter={() => setHover({ id: "630", recipe: prRecipe, isCooked: prCooked })}
            onMouseLeave={() => setHover(null)}
            onClick={() => onSelect(prRecipe.id)}
          >
            <circle cx={prX} cy={prY} r={prCooked ? 5.5 : 5} fill={(hover?.id === "630" || highlightId === "630") ? "#FACC15" : (prCooked ? C.cok : C.planned)} stroke={(hover?.id === "630" || highlightId === "630") ? "#FACC15" : (prCooked ? "#4F5A38" : "#9CA3AF")} strokeWidth={(hover?.id === "630" || highlightId === "630") ? 2.5 : (prCooked ? 1.4 : 1.2)} />
            <text x={prX + 9} y={prY + 3} fontSize={9} fontWeight={600} fill="#3D5A6C" style={{ pointerEvents: "none" }}>PR</text>
          </g>
        )}
      </svg>
      {/* Hover tooltip */}
      {hover && (
        <div style={{ position: "absolute", top: 14, right: 14, background: C.card, border: `0.5px solid ${C.line}`, borderRadius: 6, padding: "8px 12px", fontSize: 12, color: C.ink, boxShadow: "0 4px 12px rgba(0,0,0,0.08)", pointerEvents: "none" }}>
            <div style={{ fontFamily: "inherit", fontSize: 14, fontWeight: 500 }}>{hover.recipe.dish}</div>
            <div style={{ color: C.ink2, fontSize: 11, marginTop: 2 }}>
              {hover.recipe.country}
              {hover.isCooked && <span style={{ color: C.cok, marginLeft: 6 }}>· cooked ✓</span>}
            </div>
          </div>
      )}
    </div>
      {/* Legend below the overflow div, always visible */}
      <div style={{ display: "flex", justifyContent: "center", gap: 32, padding: "12px 16px 4px", fontSize: 13, color: C.ink2, fontWeight: 600, background: "transparent" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 22, height: 22, background: C.cok, borderRadius: 5, display: "inline-block", flexShrink: 0 }} />
          <span>Cooked</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 22, height: 22, background: C.planned, border: `2px solid #9CA3AF`, borderRadius: 5, display: "inline-block", flexShrink: 0 }} />
          <span>On the list</span>
        </div>
      </div>
    </div>
  );
}
