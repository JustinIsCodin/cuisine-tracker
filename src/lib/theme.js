// "3b — Cool Deep" palette: slate-blue page, white floating cards with
// layered soft shadows + hairline borders, blue accent. See the design
// handoff (design tokens) for the source-of-truth values.
export const C = {
  // Surfaces
  bg: "#D8E0F2",        // page background (soft slate-blue)
  card: "#FFFFFF",      // cards / panels / tiles
  cardAlt: "#EEF2FB",   // subtle inset surface (loading states, insets)
  surface1: "#FFFFFF", surface2: "#EEF2FB",

  // Text
  ink: "#1A2233",       // primary text
  ink2: "#3A4257",      // slightly softened primary
  inkMute: "#6E7796",   // secondary / muted text

  // Accent
  acc: "#4C6EF5", accSoft: "#E7ECFE",   // primary actions, numbers, cooked border
  primary: "#4C6EF5", onPrimary: "#FFFFFF",

  // Cooked / status
  cok: "#57B33A",       // "cooked" green (matches the real map fill)
  cokSoft: "#E8F6E2",
  secondary: "#7BC62D", // secondary accent (checkmark badge)
  planned: "#D6D3CE",   // "on the list" / uncooked (neutral warm gray)
  track: "#C4CFE8",     // unfilled progress-bar track

  // Lines / map
  line: "rgba(26, 34, 51, 0.10)",     // hairline border on cards
  divider: "rgba(26, 34, 51, 0.12)",  // divider under headings
  cardLine: "rgba(26, 34, 51, 0.10)",
  mapBg: "#FFFFFF",     // map ocean/background (was light blue)
  land: "#E6E9F0",      // non-recipe countries — light gray, visible on white
  ocean: "#4ECDC4", oceanDeep: "#1A9C93",
};

// Poppins everywhere (loaded from Google Fonts in App.jsx)
export const FONT = "'Poppins', system-ui, -apple-system, sans-serif";

// Layered "3D" depth shadows — white surfaces float above the slate-blue bg.
export const SHADOW = {
  card: "0 6px 16px rgba(26, 34, 51, 0.14)",
  map:  "0 20px 48px rgba(26, 34, 51, 0.20), 0 6px 14px rgba(26, 34, 51, 0.12)",
  tile: "0 10px 22px rgba(26, 34, 51, 0.20), 0 3px 6px rgba(26, 34, 51, 0.14)",
  tileHover: "0 16px 30px rgba(26, 34, 51, 0.24), 0 5px 10px rgba(26, 34, 51, 0.16)",
};
