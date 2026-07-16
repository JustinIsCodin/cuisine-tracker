import React, { useRef } from "react";
import { C } from "../lib/theme.js";
import { fd } from "../lib/format.jsx";
import { uploadPhoto, deletePhoto } from "../lib/supabase.js";
import { StarRating } from "./StarRating.jsx";

export function CookingLog({ recipe, entry, onUpdate }) {
  const fileRef = useRef(null);
  const toggle = () => onUpdate({ cooked: !entry.cooked, cookedDate: !entry.cooked ? (entry.cookedDate || new Date().toISOString()) : null });
  const [uploading, setUploading] = React.useState(false);
  const handlePhoto = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const img = new Image();
      img.onload = async () => {
        const s = Math.min(1, 1200 / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        const dataUrl = c.toDataURL("image/jpeg", 0.85);
        // Show preview immediately
        onUpdate({ photo: dataUrl });
        // Upload to Supabase in background
        try {
          setUploading(true);
          const url = await uploadPhoto(recipe.id, dataUrl);
          onUpdate({ photo: url });
        } catch (err) {
          console.error("Photo upload failed:", err);
        } finally {
          setUploading(false);
        }
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file); e.target.value = "";
  };
  const handleRemovePhoto = async () => {
    const url = entry.photo;
    onUpdate({ photo: null });
    try { await deletePhoto(url); } catch(e) { console.error(e); }
  };
  return (
    <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 18, marginTop: 18 }}>
      <div style={{ fontSize: 9.5, letterSpacing: "0.16em", textTransform: "uppercase", color: C.inkMute, marginBottom: 14 }}>Your cooking log</div>
      <button onClick={toggle} style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 14px", background: entry.cooked ? C.cokSoft : C.card, border: `0.5px solid ${entry.cooked ? C.cok : C.line}`, borderRadius: 8, cursor: "pointer", marginBottom: 18, fontFamily: "inherit", fontSize: 14, fontWeight: 500, color: entry.cooked ? C.cok : C.ink, width: "100%", textAlign: "left" }}>
        <span style={{ width: 18, height: 18, borderRadius: "50%", border: `1.5px solid ${entry.cooked ? C.cok : C.inkMute}`, background: entry.cooked ? C.cok : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 10, color: "white" }}>{entry.cooked ? "✓" : ""}</span>
        {entry.cooked ? "I've cooked this" : "Mark as cooked"}
        {entry.cooked && entry.cookedDate && <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 400, color: C.cok }}>{fd(entry.cookedDate)}</span>}
      </button>
      {entry.cooked && (
        <div style={{ marginBottom: 18 }}>
          <p style={{ fontFamily: "inherit", fontSize: 15, fontWeight: 500, color: C.ink, marginBottom: 10 }}>How did it turn out?</p>
          <StarRating rating={entry.rating ?? 0} onRate={(val) => onUpdate({ rating: val })} />
        </div>
      )}
      <p style={{ fontFamily: "inherit", fontSize: 15, fontWeight: 500, color: C.ink, marginBottom: 9 }}>Your dish</p>
      {entry.photo
        ? <div style={{ position: "relative", borderRadius: 8, overflow: "hidden", marginBottom: 16 }}><img src={entry.photo} alt="my dish" style={{ width: "100%", display: "block" }} /><button onClick={handleRemovePhoto} style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.65)", color: "white", border: "none", borderRadius: 4, padding: "4px 8px", fontSize: 11, cursor: "pointer" }}>Remove</button></div>
        : <button onClick={() => fileRef.current?.click()} style={{ width: "100%", aspectRatio: "16/9", background: C.cardAlt, border: `1px dashed ${C.inkMute}`, borderRadius: 8, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5, color: C.inkMute, fontFamily: "inherit", fontSize: 12, marginBottom: 16 }}><span style={{ fontSize: 20 }}>+</span><span>{uploading ? "Uploading…" : "Add a photo of your dish"}</span></button>
      }
      <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: "none" }} />
      <p style={{ fontFamily: "inherit", fontSize: 15, fontWeight: 500, color: C.ink, marginBottom: 9 }}>Notes for next time</p>
      <textarea value={entry.notes || ""} onChange={(e) => onUpdate({ notes: e.target.value })} placeholder="What worked, what to change, timing tweaks…" style={{ width: "100%", minHeight: 100, background: C.card, border: `0.5px solid ${C.line}`, borderRadius: 8, padding: "10px 12px", fontFamily: "inherit", fontSize: 13, lineHeight: 1.6, color: C.ink, resize: "vertical" }} />
    </div>
  );
}
