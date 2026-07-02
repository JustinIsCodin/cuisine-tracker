import { C } from "../lib/theme.js";
import {
  EQUIPMENT_ICONS,
  minutesToTimeString,
  parseTimeToMinutes,
  numToNiceString,
  scaleIngredient,
  renderIngredientWithUnits,
} from "../lib/format.jsx";

export function RecipeSection({ recipe, entry, onUpdate }) {
  const baseServings = recipe.servings || 4;
  const doubled = !!entry?.doubled;
  const multiplier = doubled ? 2 : 1;
  const checked = entry?.checkedIngredients || {};
  const miseChecked = entry?.checkedMise || {};

  const toggleChecked = (i) => {
    onUpdate({ checkedIngredients: { ...checked, [i]: !checked[i] } });
  };
  const clearChecked = () => onUpdate({ checkedIngredients: {} });
  const toggleMise = (i) => {
    onUpdate({ checkedMise: { ...miseChecked, [i]: !miseChecked[i] } });
  };

  if (!recipe.ingredients.length) {
    return (
      <div style={{ background: C.cardAlt, border: `0.5px dashed ${C.inkMute}`, borderRadius: 8, padding: 18, fontSize: 13, color: C.ink2, lineHeight: 1.6 }}>
        <strong>Recipe not added yet.</strong><br />
        Send Claude a recipe link and paste the returned JSON into <code style={{ fontFamily: "monospace", background: C.line, padding: "1px 4px", borderRadius: 3, fontSize: 11.5 }}>recipes.js</code> to populate this.
      </div>
    );
  }

  const checkedCount = recipe.ingredients.filter((_, i) => checked[i]).length;

  return (
    <>
      <span style={{ display: "inline-block", background: "#FFF3CD", color: "#856404", fontSize: 10, padding: "2px 7px", borderRadius: 6, marginBottom: 14, fontWeight: 500 }}>Preview data — real recipe goes here</span>

      {/* Meta bar: cook time + servings toggle + equipment */}
      <div style={{ marginBottom: 22, padding: "12px 16px", background: C.cardAlt, borderRadius: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 22, flexWrap: "wrap" }}>
          {recipe.prepTime && (
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ fontSize: 16 }}>🔪</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, lineHeight: 1.1 }}>{recipe.prepTime}</div>
                <div style={{ fontSize: 9.5, color: C.inkMute, textTransform: "uppercase", letterSpacing: "0.06em" }}>Prep time</div>
              </div>
            </div>
          )}
          {recipe.cookTime && (
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ fontSize: 16 }}>🔥</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, lineHeight: 1.1 }}>{recipe.cookTime}</div>
                <div style={{ fontSize: 9.5, color: C.inkMute, textTransform: "uppercase", letterSpacing: "0.06em" }}>Cook time</div>
              </div>
            </div>
          )}
          {(recipe.prepTime || recipe.cookTime) && (
            <div style={{ display: "flex", alignItems: "center", gap: 7, paddingLeft: 22, borderLeft: `1px solid ${C.cardLine}` }}>
              <span style={{ fontSize: 16 }}>⏱️</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, lineHeight: 1.1 }}>{minutesToTimeString(parseTimeToMinutes(recipe.prepTime) + parseTimeToMinutes(recipe.cookTime))}</div>
                <div style={{ fontSize: 9.5, color: C.inkMute, textTransform: "uppercase", letterSpacing: "0.06em" }}>Total time</div>
              </div>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 16 }}>🍽️</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, lineHeight: 1.1 }}>{baseServings * multiplier} servings</div>
              <div style={{ fontSize: 9.5, color: C.inkMute, textTransform: "uppercase", letterSpacing: "0.06em" }}>Yield</div>
            </div>
          </div>
          {/* Double recipe toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginLeft: "auto" }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: doubled ? C.inkMute : C.ink }}>1×</span>
            <button
              onClick={() => onUpdate({ doubled: !doubled })}
              style={{ position: "relative", width: 40, height: 22, borderRadius: 99, border: "none", cursor: "pointer", background: doubled ? C.acc : C.cardLine, transition: "background 0.2s", padding: 0 }}
            >
              <span style={{ position: "absolute", top: 2, left: doubled ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.25)", transition: "left 0.2s" }} />
            </button>
            <span style={{ fontSize: 12, fontWeight: 500, color: doubled ? C.ink : C.inkMute }}>2×</span>
          </div>
        </div>

        {/* Equipment needed */}
        {recipe.equipment && recipe.equipment.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
            <span style={{ fontSize: 9.5, color: C.inkMute, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginRight: 2 }}>You'll need</span>
            {recipe.equipment.map((entryItem, i) => {
              // Equipment entries can be a string key into EQUIPMENT_ICONS, or an inline
              // { icon, label } object for a specific size/material combo (e.g. a 12-in cast
              // iron skillet) that doesn't warrant its own permanent table entry.
              const item = typeof entryItem === "string"
                ? (EQUIPMENT_ICONS[entryItem] || { icon: "🍳", label: entryItem })
                : entryItem;
              if (!item) return null;
              return (
                <div key={item.label + i} title={item.label} style={{ display: "flex", alignItems: "center", gap: 6, background: C.card, border: `1px solid ${C.cardLine}`, borderRadius: 20, padding: "5px 11px 5px 8px" }}>
                  <span style={{ fontSize: 15 }}>{item.icon}</span>
                  <span style={{ fontSize: 11.5, fontWeight: 500, color: C.ink }}>{item.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 22 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <h3 style={{ fontFamily: "inherit", fontSize: 16, fontWeight: 500, color: C.ink }}>Shopping list{doubled ? " (2×)" : ""}</h3>
            {checkedCount > 0 && (
              <button onClick={clearChecked} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: C.acc, fontWeight: 500, padding: 0, fontFamily: "inherit" }}>Clear ({checkedCount})</button>
            )}
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {recipe.ingredients.map((ing, i) => {
              const isChecked = !!checked[i];
              const ingStr = typeof ing === "string" ? ing : (() => {
                const amt = ing.amount != null ? numToNiceString(ing.amount) : "";
                const unit = ing.unit ? ing.unit + " " : "";
                return `${amt}${amt ? " " : ""}${unit}${ing.name}`.trim();
              })();
              const displayText = scaleIngredient(ingStr, multiplier);
              return (
                <li key={i} style={{ borderBottom: i < recipe.ingredients.length - 1 ? `0.5px solid ${C.line}` : "none" }}>
                  <button
                    onClick={() => toggleChecked(i)}
                    style={{ display: "flex", alignItems: "flex-start", gap: 10, width: "100%", padding: "9px 2px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
                  >
                    <span style={{ flexShrink: 0, width: 18, height: 18, marginTop: 1, borderRadius: 5, border: `1.5px solid ${isChecked ? C.cok : C.cardLine}`, background: isChecked ? C.cok : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
                      {isChecked && <span style={{ color: "white", fontSize: 11, lineHeight: 1 }}>✓</span>}
                    </span>
                    <span style={{ fontSize: 13, color: isChecked ? C.inkMute : C.ink, textDecoration: isChecked ? "line-through" : "none", lineHeight: 1.4 }}>{renderIngredientWithUnits(displayText)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        <div>
          {recipe.miseEnPlace && recipe.miseEnPlace.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontFamily: "inherit", fontSize: 16, fontWeight: 500, color: C.ink, marginBottom: 4 }}>Mise en place</h3>
              <p style={{ fontSize: 11.5, color: C.inkMute, marginBottom: 10 }}>Knock these out ahead of time so cooking is just assembly. Bracketed items go into the dish at the same moment — prep them straight into one bowl.</p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {(() => {
                  // Normalize: each item is either a plain string or { text, combineGroup }
                  const items = recipe.miseEnPlace.map(it => typeof it === "string" ? { text: it } : it);
                  // Figure out group boundaries so we know when to draw the bracket's top/middle/bottom
                  const groupCounts = {};
                  items.forEach(it => { if (it.combineGroup) groupCounts[it.combineGroup] = (groupCounts[it.combineGroup] || 0) + 1; });
                  const groupSeen = {};
                  return items.map((it, i) => {
                    const isChecked = !!miseChecked[i];
                    const inGroup = !!it.combineGroup;
                    let bracketPos = null;
                    if (inGroup) {
                      groupSeen[it.combineGroup] = (groupSeen[it.combineGroup] || 0) + 1;
                      const seenCount = groupSeen[it.combineGroup];
                      const total = groupCounts[it.combineGroup];
                      bracketPos = seenCount === 1 ? "top" : seenCount === total ? "bottom" : "middle";
                    }
                    return (
                      <li key={i} style={{ borderBottom: i < items.length - 1 && bracketPos !== "top" && bracketPos !== "middle" ? `0.5px solid ${C.line}` : "none", position: "relative" }}>
                        <div style={{ display: "flex", alignItems: "stretch" }}>
                          {inGroup && (
                            <div style={{ width: 18, flexShrink: 0, position: "relative" }}>
                              <div style={{
                                position: "absolute", left: 7, width: 8,
                                top: bracketPos === "top" ? "50%" : 0,
                                bottom: bracketPos === "bottom" ? "50%" : 0,
                                borderLeft: `2px solid ${C.acc}`,
                                borderTop: bracketPos === "top" ? `2px solid ${C.acc}` : "none",
                                borderBottom: bracketPos === "bottom" ? `2px solid ${C.acc}` : "none",
                                borderTopLeftRadius: bracketPos === "top" ? 6 : 0,
                                borderBottomLeftRadius: bracketPos === "bottom" ? 6 : 0,
                              }} />
                            </div>
                          )}
                          <button
                            onClick={() => toggleMise(i)}
                            style={{ display: "flex", alignItems: "flex-start", gap: 10, width: "100%", padding: "8px 2px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
                          >
                            <span style={{ flexShrink: 0, width: 18, height: 18, marginTop: 1, borderRadius: 5, border: `1.5px solid ${isChecked ? C.acc : C.cardLine}`, background: isChecked ? C.acc : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
                              {isChecked && <span style={{ color: "white", fontSize: 11, lineHeight: 1 }}>✓</span>}
                            </span>
                            <span style={{ fontSize: 13, color: isChecked ? C.inkMute : C.ink, textDecoration: isChecked ? "line-through" : "none", lineHeight: 1.4 }}>{it.text}</span>
                          </button>
                        </div>
                      </li>
                    );
                  });
                })()}
              </ul>
            </div>
          )}
          <h3 style={{ fontFamily: "inherit", fontSize: 16, fontWeight: 500, color: C.ink, marginBottom: 10 }}>Method</h3>
          <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {recipe.steps.map((step, i) => {
              const isObj = typeof step === "object" && step !== null;
              const rawContent = isObj ? step.content : step;
              // Resolve {0001} ingredient refs → ingredient name+unit string
              const resolvedContent = rawContent.replace(/\{(\d{4})\}/g, (_, idx) => {
                const ing = recipe.ingredients[parseInt(idx, 10)];
                if (!ing) return "";
                if (typeof ing === "string") return ing;
                const amt = ing.amount != null ? numToNiceString(ing.amount) : "";
                const unit = ing.unit ? ing.unit + " " : "";
                return `${amt}${amt ? " " : ""}${unit}${ing.name}`.trim();
              });
              return (
                <li key={i} style={{ position: "relative", padding: "9px 0 9px 32px", borderBottom: i < recipe.steps.length - 1 ? `0.5px solid ${C.line}` : "none", fontSize: 13, lineHeight: 1.6, color: C.ink }}>
                  <span style={{ position: "absolute", left: 0, top: 9, fontFamily: "inherit", fontSize: 15, fontWeight: 500, color: C.acc }}>{i + 1}</span>
                  {isObj && step.title && (
                    <span style={{ fontWeight: 600, display: "block", marginBottom: 2, color: C.ink }}>{step.title}</span>
                  )}
                  {renderIngredientWithUnits(resolvedContent)}
                  {isObj && step.timer_seconds && (
                    <span style={{ display: "inline-block", marginTop: 4, marginLeft: 0, fontSize: 11, color: C.inkMute, fontWeight: 500 }}>
                      ⏱ {step.timer_seconds >= 3600
                        ? `${Math.floor(step.timer_seconds/3600)}h ${Math.round((step.timer_seconds%3600)/60)}m`
                        : `${Math.round(step.timer_seconds/60)} min`}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </>
  );
}
