import { useState } from "react";
import { C } from "../lib/theme.js";

export function StarFill({ fill, size = 26, emptyColor = C.line }) {
  return (
    <span style={{ position: "relative", display: "inline-block", lineHeight: 1, fontSize: size }}>
      <span style={{ color: emptyColor }}>★</span>
      {fill > 0 && (
        <span style={{ position: "absolute", left: 0, top: 0, overflow: "hidden", width: `${fill * 100}%`, color: "#C4852A", whiteSpace: "nowrap", pointerEvents: "none" }}>★</span>
      )}
    </span>
  );
}

export function StarRating({ rating, onRate }) {
  const [hovered, setHovered] = useState(null);
  const active = hovered ?? rating ?? 0;
  const labels = {
    0.5: "Barely edible", 1: "Not great", 1.5: "Meh",
    2: "Decent", 2.5: "Pretty okay", 3: "Pretty good",
    3.5: "Good", 4: "Really good", 4.5: "Excellent", 5: "Outstanding"
  };
  const getVal = (e, n) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return e.clientX - rect.left < rect.width / 2 ? n - 0.5 : n;
  };
  return (
    <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onMouseMove={(e) => setHovered(getVal(e, n))}
          onMouseLeave={() => setHovered(null)}
          onClick={(e) => { const val = getVal(e, n); onRate(rating === val ? 0 : val); }}
          style={{ background: "none", border: "none", padding: "0 1px", cursor: "pointer", lineHeight: 1, transition: "transform 0.1s", transform: hovered >= n - 0.25 && hovered <= n ? "scale(1.18)" : "scale(1)" }}
        >
          <StarFill fill={Math.min(1, Math.max(0, active - (n - 1)))} size={28} />
        </button>
      ))}
      {active > 0 && (
        <span style={{ fontSize: 11, color: C.inkMute, marginLeft: 6 }}>{labels[active] || ""}</span>
      )}
    </div>
  );
}
