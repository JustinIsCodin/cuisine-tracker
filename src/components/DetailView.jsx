import { C } from "../lib/theme.js";
import { p2 } from "../lib/format.jsx";
import { DishImage } from "./DishImage.jsx";
import { RecipeSection } from "./RecipeSection.jsx";
import { CookingLog } from "./CookingLog.jsx";
import { LikesAndComments } from "./LikesAndComments.jsx";

export function DetailView({ recipe, entry, onBack, onUpdate, isAdmin }) {
  return (
    <div data-detail-view="true">
      <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: C.ink2, padding: 0, marginBottom: 14, fontFamily: "inherit" }}>← All countries</button>
      <div style={{ width: "100%", aspectRatio: "21/9", borderRadius: 10, overflow: "hidden", marginBottom: 18 }}>
        <DishImage recipe={recipe} photo={entry?.photo} />
      </div>
      <div style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: C.inkMute, marginBottom: 7 }}>Week {p2(recipe.week)} · {recipe.country}</div>
      <div style={{ fontFamily: "inherit", fontSize: 34, fontWeight: 800, letterSpacing: "-0.02em", color: C.ink, lineHeight: 1.0, marginBottom: 12 }}>{recipe.dish}</div>
      <p style={{ fontSize: 14, lineHeight: 1.65, color: C.ink2, marginBottom: 24 }}>{recipe.description}</p>
      <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 18, marginTop: 18 }}>
        <div style={{ fontSize: 9.5, letterSpacing: "0.16em", textTransform: "uppercase", color: C.inkMute, marginBottom: 14 }}>Recipe</div>
        <RecipeSection recipe={recipe} entry={entry} onUpdate={onUpdate} />
      </div>
      {isAdmin && <CookingLog recipe={recipe} entry={entry} onUpdate={onUpdate} />}
      <LikesAndComments recipeId={recipe.id} />
    </div>
  );
}
