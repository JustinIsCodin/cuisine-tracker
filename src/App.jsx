import React, { useState, useRef, useEffect } from "react";
import { RECIPES } from "./data/recipes.js";
import { CONTINENTS, CONTINENT_ORDER } from "./data/continents.js";
import { AREA_KM2 } from "./data/areas.js";
import { C, FONT, SHADOW } from "./lib/theme.js";
import { fd } from "./lib/format.jsx";
import { fetchPhoto, fetchCookingLog, saveCookingLog } from "./lib/supabase.js";
import { WorldMap } from "./components/WorldMap.jsx";
import { DetailView } from "./components/DetailView.jsx";
import { DishImage } from "./components/DishImage.jsx";
import { StarFill } from "./components/StarRating.jsx";

export function App() {
  const [log, setLog] = useState({});

  // Load the cooking log from Supabase on startup — it's the only source of truth.
  useEffect(() => {
    fetchCookingLog().then(remote => {
      if (remote) setLog(remote);
    });
  }, []);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const tapTimer = useRef(null);

  const handleTitleTap = () => {
    setTapCount(n => {
      const next = n + 1;
      clearTimeout(tapTimer.current);
      if (next >= 5) {
        const pw = prompt("Admin password:");
        if (pw === "imcookingoodlookin") {
          setIsAdmin(true);
          alert("Admin mode on ✓");
        }
        return 0;
      }
      tapTimer.current = setTimeout(() => setTapCount(0), 1500);
      return next;
    });
  };
  const [sel, setSel] = useState(null);
  const [mapHighlight, setMapHighlight] = useState(null);
  const mousePos = useRef({ x: -1, y: -1 });

  useEffect(() => {
    const onMove = (e) => { mousePos.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  // Update map highlight based on which card is under the cursor as the page scrolls
  useEffect(() => {
    const onScroll = () => {
      const { x, y } = mousePos.current;
      if (x < 0 || y < 0) return;
      const target = document.elementFromPoint(x, y);
      const card = target?.closest?.("[data-numeric]");
      setMapHighlight(card ? card.getAttribute("data-numeric") : null);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  const [query, setQuery] = useState("");
  const [collapsedRegions, setCollapsedRegions] = useState({});
  const toggleRegion = (continent) => setCollapsedRegions(prev => ({ ...prev, [continent]: !prev[continent] }));
  const cookedCount = RECIPES.filter((r) => log[r.id]?.cooked).length;
  const pct = Math.round((cookedCount / RECIPES.length) * 100);
  const selected = sel ? RECIPES.find((r) => r.id === sel) : null;
  const update = (updates) => {
    setLog((prev) => {
      const merged = { ...(prev[sel] || {}), ...updates };
      // Persist to Supabase (fire-and-forget)
      saveCookingLog(sel, merged).catch(e => console.error("Save failed:", e));
      return { ...prev, [sel]: merged };
    });
  };

  // When a recipe is selected, load its Supabase photo if not already set
  React.useEffect(() => {
    if (!sel) return;
    if (log[sel]?.photo) return; // already have one
    fetchPhoto(sel).then(url => {
      if (url) update({ photo: url });
    });
  }, [sel]);

  const filtered = query.trim() === ""
    ? RECIPES
    : RECIPES.filter((r) => {
        const q = query.toLowerCase();
        return r.country.toLowerCase().includes(q) || r.dish.toLowerCase().includes(q);
      });

  if (selected) return (
    <div style={{ fontFamily: FONT, background: C.bg, minHeight: "100vh", padding: 20 }}>
      <DetailView recipe={selected} entry={log[sel] || {}} onBack={() => setSel(null)} onUpdate={update} isAdmin={isAdmin} />
    </div>
  );

  return (
    <div style={{ fontFamily: FONT, background: C.bg, minHeight: "100vh", padding: "30px 32px 34px" }}>

      {/* Header — title + progress chip */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 18 }}>
        <div>
          <h1 onClick={handleTitleTap} style={{ fontSize: 30, fontWeight: 800, color: C.ink, lineHeight: 1, marginBottom: 7, cursor: "default", userSelect: "none" }}>Cuisine Tracker</h1>
          <p style={{ fontSize: 13, color: C.inkMute, fontWeight: 500 }}>One iconic dish per country · no repeats</p>
        </div>
        <div style={{ textAlign: "center", background: C.card, borderRadius: 18, padding: "14px 18px", boxShadow: SHADOW.card, border: `1px solid ${C.line}`, flexShrink: 0 }}>
          <div style={{ lineHeight: 1 }}>
            <span style={{ fontSize: 30, fontWeight: 800, color: C.acc }}>{cookedCount}</span>
            <span style={{ color: C.inkMute, fontSize: 12, fontWeight: 600 }}> / {RECIPES.length}</span>
          </div>
          <div style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.inkMute, marginTop: 5, marginBottom: 8 }}>countries cooked</div>
          <div style={{ width: 148, height: 7, background: C.track, borderRadius: 99, overflow: "hidden", margin: "0 auto" }}>
            <div style={{ height: "100%", background: C.acc, width: `${pct}%`, transition: "width 0.6s cubic-bezier(0.34,1.56,0.64,1)", borderRadius: 99 }} />
          </div>
        </div>
      </div>

      {/* Search bar — white pill */}
      <div style={{ position: "relative", marginBottom: 18 }}>
        <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: C.inkMute, fontSize: 15, pointerEvents: "none" }}>🔍</span>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search countries or dishes…"
          style={{ width: "100%", padding: "12px 40px 12px 42px", background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, fontFamily: "inherit", fontSize: 13.5, fontWeight: 500, color: C.ink, outline: "none", boxSizing: "border-box", boxShadow: SHADOW.card, transition: "border-color 0.15s, box-shadow 0.15s" }}
          onFocus={e => { e.target.style.borderColor = C.acc; e.target.style.boxShadow = `0 0 0 3px ${C.accSoft}, ${SHADOW.card}`; }}
          onBlur={e => { e.target.style.borderColor = C.line; e.target.style.boxShadow = SHADOW.card; }}
        />
        {query && (
          <button onClick={() => setQuery("")} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.inkMute, fontSize: 18, lineHeight: 1, padding: 0 }}>×</button>
        )}
      </div>

      {/* Body: map card, cards below */}
      <div>
        {/* Map card — white surface, deepest shadow */}
        <div style={{ position: "relative", background: C.card, border: `1px solid ${C.line}`, borderRadius: 22, boxShadow: SHADOW.map, padding: "24px 20px 18px", marginBottom: 28, overflow: "hidden" }}>
          <WorldMap recipes={RECIPES} log={log} onSelect={setSel} highlightId={mapHighlight} />
        </div>

        {/* Bottom: scrollable recipe card grid */}
        <div>
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: C.inkMute, fontSize: 13 }}>
              No results for <strong style={{ color: C.ink2 }}>"{query}"</strong>
            </div>
          ) : (
            CONTINENT_ORDER.filter(cont => filtered.some(r => CONTINENTS[r.id] === cont)).map(continent => {
              const group = filtered
                .filter(r => CONTINENTS[r.id] === continent)
                .slice()
                .sort((a, b) => {
                  const cookedDiff = (log[b.id]?.cooked ? 1 : 0) - (log[a.id]?.cooked ? 1 : 0);
                  if (cookedDiff !== 0) return cookedDiff;
                  return (AREA_KM2[b.id] || 0) - (AREA_KM2[a.id] || 0);
                });
              const groupCooked = group.filter(r => log[r.id]?.cooked).length;
              const groupPct = Math.round((groupCooked / group.length) * 100);
              const collapsed = !!collapsedRegions[continent];
              return (
                <div key={continent} style={{ marginBottom: 40 }}>
                  <button
                    onClick={() => toggleRegion(continent)}
                    style={{ width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 16, marginBottom: collapsed ? 0 : 20, paddingBottom: 12 }}
                  >
                    <h2 style={{ fontSize: 22, fontWeight: 800, color: C.ink, flexShrink: 0 }}>{continent}</h2>
                    <div style={{ flex: 1, height: 1, background: C.divider }} />
                    <div style={{ width: 100, height: 6, background: C.track, borderRadius: 99, overflow: "hidden", flexShrink: 0 }}>
                      <div style={{ height: "100%", background: C.acc, width: `${groupPct}%`, transition: "width 0.6s cubic-bezier(0.34,1.56,0.64,1)", borderRadius: 99 }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.inkMute, whiteSpace: "nowrap" }}>{groupCooked} / {group.length}</span>
                    <span style={{ fontSize: 16, color: C.inkMute, transition: "transform 0.2s", transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)", display: "inline-block", flexShrink: 0 }}>▾</span>
                  </button>
                  {!collapsed && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(152px, 1fr))", gap: 14 }}>
                    {group.map((r) => {
                      const cooked = !!log[r.id]?.cooked;
                      return (
                        <button key={r.id} data-numeric={r.numericCode} onClick={() => setSel(r.id)}
                          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = SHADOW.tileHover; setMapHighlight(r.numericCode); }}
                          onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = SHADOW.tile; setMapHighlight(null); }}
                          style={{ position: "relative", aspectRatio: "152 / 128", background: C.card, border: cooked ? `2px solid ${C.acc}` : `1px solid ${C.line}`, borderRadius: 22, overflow: "hidden", cursor: "pointer", textAlign: "left", padding: 0, transition: "transform 0.15s ease-out, box-shadow 0.15s ease-out", fontFamily: "inherit", boxShadow: SHADOW.tile }}>
                          <DishImage recipe={r} photo={log[r.id]?.photo} showLabel={false} />
                          {/* Bottom scrim + country/dish labels (+ rating/date for cooked) */}
                          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "10px 12px", background: "linear-gradient(to top, rgba(0,0,0,0.72), rgba(0,0,0,0.05) 78%, transparent)", pointerEvents: "none" }}>
                            <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "rgba(255,255,255,0.82)", lineHeight: 1.2 }}>{r.country}</span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "white", lineHeight: 1.25, textShadow: "0 1px 3px rgba(0,0,0,0.4)" }}>{r.dish}</span>
                            {cooked && log[r.id]?.rating > 0 && (
                              <div style={{ display: "flex", gap: 1, marginTop: 4 }}>
                                {[1,2,3,4,5].map(n => (
                                  <StarFill key={n} fill={Math.min(1, Math.max(0, log[r.id].rating - (n - 1)))} size={11} emptyColor="rgba(255,255,255,0.35)" />
                                ))}
                              </div>
                            )}
                            {cooked && log[r.id]?.cookedDate && (
                              <div style={{ fontSize: 9, fontWeight: 500, letterSpacing: "0.04em", color: "rgba(255,255,255,0.78)", marginTop: 3 }}>{fd(log[r.id].cookedDate)}</div>
                            )}
                          </div>
                          {/* Cooked checkmark badge */}
                          {cooked && (
                            <span style={{ position: "absolute", top: 8, right: 8, width: 22, height: 22, background: C.secondary, color: "white", borderRadius: "50%", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 5px rgba(0,0,0,0.3)", zIndex: 2 }}>✓</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
