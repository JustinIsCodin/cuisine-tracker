import React, { useState, useRef, useEffect } from "react";
import { RECIPES } from "./data/recipes.js";
import { CONTINENTS, CONTINENT_ORDER } from "./data/continents.js";
import { AREA_KM2 } from "./data/areas.js";
import { C } from "./lib/theme.js";
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
    link.href = "https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;700&family=Google+Sans+Display:wght@400;500;700&family=Roboto:wght@400;500&display=swap";
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
    <div style={{ fontFamily: "DM Sans, system-ui, sans-serif", background: C.bg, minHeight: "100vh", padding: 20 }}>
      <DetailView recipe={selected} entry={log[sel] || {}} onBack={() => setSel(null)} onUpdate={update} isAdmin={isAdmin} />
    </div>
  );

  return (
    <div style={{ fontFamily: "'Google Sans', 'Roboto', system-ui, sans-serif", background: C.bg, minHeight: "100vh" }}>

      {/* Header — M3 Top App Bar */}
      <div style={{ background: C.surface1, borderBottom: `1px solid ${C.line}`, padding: "10px 16px 12px", flexShrink: 0 }}>
        {/* Top row: title + progress */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
          <div>
            <h1 onClick={handleTitleTap} style={{ fontSize: 20, fontWeight: 700, color: C.ink, letterSpacing: "-0.01em", marginBottom: 1, cursor: "default", userSelect: "none" }}>Cuisine Tracker</h1>
            <p style={{ fontSize: 11, color: C.inkMute, fontWeight: 500, letterSpacing: "0.02em" }}>One iconic dish per country · no repeats</p>
          </div>
          <div style={{ textAlign: "center", background: C.card, borderRadius: 16, padding: "8px 18px", boxShadow: "0 1px 3px rgba(26,115,232,0.12)", border: `1px solid ${C.accSoft}`, flexShrink: 0 }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: C.acc, lineHeight: 1, letterSpacing: "-0.02em" }}>
              {cookedCount}<span style={{ color: C.inkMute, fontSize: 13, fontWeight: 400 }}> / {RECIPES.length}</span>
            </div>
            <div style={{ fontSize: 9, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: C.inkMute, marginTop: 3, marginBottom: 6 }}>countries cooked</div>
            <div style={{ width: 120, height: 5, background: C.line, borderRadius: 99, overflow: "hidden", margin: "0 auto" }}>
              <div style={{ height: "100%", background: `linear-gradient(90deg, ${C.acc}, ${C.cok})`, width: `${pct}%`, transition: "width 0.6s cubic-bezier(0.34,1.56,0.64,1)", borderRadius: 99 }} />
            </div>
          </div>
        </div>
        {/* Bottom row: full-width search bar */}
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: C.inkMute, fontSize: 15, pointerEvents: "none" }}>🔍</span>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search countries or dishes…"
            style={{ width: "100%", padding: "10px 36px 10px 40px", background: C.card, border: `1.5px solid ${C.cardLine}`, borderRadius: 28, fontFamily: "inherit", fontSize: 14, color: C.ink, outline: "none", boxSizing: "border-box", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", transition: "border-color 0.15s, box-shadow 0.15s" }}
            onFocus={e => { e.target.style.borderColor = C.acc; e.target.style.boxShadow = `0 0 0 3px ${C.accSoft}, 0 1px 3px rgba(0,0,0,0.08)`; }}
            onBlur={e => { e.target.style.borderColor = C.cardLine; e.target.style.boxShadow = "0 1px 3px rgba(0,0,0,0.08)"; }}
          />
          {query && (
            <button onClick={() => setQuery("")} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.inkMute, fontSize: 18, lineHeight: 1, padding: 0 }}>×</button>
          )}
        </div>
      </div>

      {/* Body: map full-width, cards below */}
      <div>
        {/* Top: full-width map */}
        <div style={{ position: "relative", borderBottom: `1px solid ${C.line}`, background: C.bg, overflow: "hidden" }}>
          <WorldMap recipes={RECIPES} log={log} onSelect={setSel} highlightId={mapHighlight} />
        </div>

        {/* Bottom: scrollable recipe card grid */}
        <div style={{ padding: "20px 20px" }}>
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
                <div key={continent} style={{ marginBottom: 44, marginTop: 8 }}>
                  <button
                    onClick={() => toggleRegion(continent)}
                    style={{ width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 14, marginBottom: collapsed ? 0 : 18, paddingBottom: 10, borderBottom: `3px solid ${C.acc}` }}
                  >
                    <h2 style={{ fontSize: 26, fontWeight: 700, color: C.ink, letterSpacing: "-0.015em", flex: 1 }}>{continent}</h2>
                    <div style={{ width: 100, height: 6, background: C.line, borderRadius: 99, overflow: "hidden", flexShrink: 0 }}>
                      <div style={{ height: "100%", background: `linear-gradient(90deg, ${C.acc}, ${C.cok})`, width: `${groupPct}%`, transition: "width 0.6s cubic-bezier(0.34,1.56,0.64,1)", borderRadius: 99 }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500, color: C.inkMute, whiteSpace: "nowrap" }}>{groupCooked} / {group.length}</span>
                    <span style={{ fontSize: 16, color: C.inkMute, transition: "transform 0.2s", transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)", display: "inline-block", flexShrink: 0 }}>▾</span>
                  </button>
                  {!collapsed && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 18 }}>
                    {group.map((r) => {
                      const cooked = !!log[r.id]?.cooked;
                      return (
                        <button key={r.id} data-numeric={r.numericCode} onClick={() => setSel(r.id)}
                          onMouseEnter={e => { e.currentTarget.style.transform = "translate(-2px, -3px)"; e.currentTarget.style.boxShadow = cooked ? `4px 7px 20px -4px rgba(52,168,83,0.3), 2px 4px 8px -2px rgba(0,0,0,0.12)` : "4px 7px 20px -4px rgba(26,115,232,0.22), 2px 4px 8px -2px rgba(0,0,0,0.12)"; e.currentTarget.style.borderColor = cooked ? C.cok : C.acc; setMapHighlight(r.numericCode); }}
                          onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = cooked ? `3px 5px 12px -3px rgba(52,168,83,0.25), 1px 2px 4px -1px rgba(0,0,0,0.08)` : "3px 5px 12px -3px rgba(0,0,0,0.16), 1px 2px 4px -1px rgba(0,0,0,0.08)"; e.currentTarget.style.borderColor = cooked ? C.cok : C.cardLine; setMapHighlight(null); }}
                          style={{ background: C.card, border: cooked ? `4px solid ${C.cok}` : `1.5px solid ${C.cardLine}`, borderRadius: 12, overflow: "hidden", cursor: "pointer", textAlign: "left", display: "flex", flexDirection: "column", transition: "transform 0.15s ease-out, box-shadow 0.15s ease-out, border-color 0.15s", fontFamily: "inherit", padding: 0, boxShadow: cooked ? `3px 5px 12px -3px rgba(52,168,83,0.25), 1px 2px 4px -1px rgba(0,0,0,0.08)` : "3px 5px 12px -3px rgba(0,0,0,0.16), 1px 2px 4px -1px rgba(0,0,0,0.08)" }}>
                          <div style={{ aspectRatio: "16/9", overflow: "hidden", position: "relative", background: C.cardAlt, opacity: cooked ? 1 : 0.7 }}>
                            <DishImage recipe={r} photo={log[r.id]?.photo} />
                            {cooked && <span style={{ position: "absolute", top: 5, right: 5, width: 16, height: 16, background: C.cok, color: "white", borderRadius: "50%", fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>✓</span>}
                          </div>
                          <div style={{ padding: "12px 14px 14px" }}>
                            <span style={{ fontSize: 10, color: C.ink2, display: "block", marginBottom: 3 }}>{r.country}</span>
                            <span style={{ fontSize: 12, fontWeight: 500, color: C.ink, lineHeight: 1.3, display: "block", marginBottom: 6 }}>{r.dish}</span>
                            {cooked && log[r.id]?.rating > 0 && (
                              <div style={{ display: "flex", gap: 1, marginBottom: 5 }}>
                                {[1,2,3,4,5].map(n => (
                                  <StarFill key={n} fill={Math.min(1, Math.max(0, log[r.id].rating - (n - 1)))} size={10} />
                                ))}
                              </div>
                            )}
                            {cooked && log[r.id]?.cookedDate && (
                              <div style={{ fontSize: 9, letterSpacing: "0.06em", color: C.inkMute }}>{fd(log[r.id].cookedDate)}</div>
                            )}
                          </div>
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
