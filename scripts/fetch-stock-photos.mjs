// Fills in the missing `dishImageUrl` field for recipes in src/data/recipes.js
// by searching Wikipedia for the dish and pulling its lead photo (hosted on
// Wikimedia Commons — same free-licensed source the existing entries use).
//
// Safe to re-run: only touches entries where dishImageUrl is currently "".
//
//   node scripts/fetch-stock-photos.mjs            # do the fetch + patch
//   node scripts/fetch-stock-photos.mjs --dry-run   # report matches only, don't edit recipes.js
//
// Coverage as of the last run: 173 of 206 dishes have a photo; the rest have
// no confident free-licensed match and fall back to the flag+name card look.

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath, pathToFileURL } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RECIPES_PATH = path.join(__dirname, "..", "src", "data", "recipes.js");
const DRY_RUN = process.argv.includes("--dry-run");
const limitArg = process.argv.find(a => a.startsWith("--limit="));
const LIMIT = limitArg ? parseInt(limitArg.split("=")[1], 10) : Infinity;

const USER_AGENT = "cuisine-tracker-stock-photo-fetch/1.0 (contact: boxmanisrael@gmail.com)";

const STOPWORDS = new Set(["with", "and", "the", "of", "in", "a", "an", "or", "for"]);

// Strip diacritics (Rösti -> Rosti, Ćevapi -> Cevapi) so accented Wikipedia
// titles match plain-ASCII dish names from recipes.js.
function foldAscii(str) {
  return str.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// Naive singular/plural stem so "Meatballs" matches a title containing "Meatball".
function stem(word) {
  return word.endsWith("s") && word.length > 3 ? word.slice(0, -1) : word;
}

// Generic culinary words that, on their own, are too common to confirm a match —
// "chicken", "fish", "reef", etc. appear in many unrelated titles. A match that
// hits ONLY these (e.g. Peri-Peri Chicken -> "Moambe chicken") is rejected.
const GENERIC_WORDS = new Set([
  "chicken", "fish", "beef", "pork", "lamb", "goat", "rice", "soup", "stew",
  "salad", "curry", "roast", "grilled", "fried", "spicy", "sweet", "sauce",
  "coconut", "reef", "date", "dates", "meat", "cream", "honey", "green",
  "red", "national", "dish", "homemade", "christmas", "midwinter", "upland",
]);

// Guards against the search drifting to an unrelated article (e.g. a made-up
// fusion dish name matching some loosely-related Wikipedia page) by requiring
// at least one *distinctive* word from the dish name to appear in the matched
// article's title. Tolerant of diacritics and simple plurals. Falls back to
// generic words only if the dish name has no distinctive words at all.
function isConfidentMatch(dish, title) {
  const dishWords = foldAscii(dish).split(/[^a-z]+/).filter(w => w.length > 2 && !STOPWORDS.has(w));
  const titleFolded = foldAscii(title);
  const hit = (w) => titleFolded.includes(w) || titleFolded.includes(stem(w));
  const distinctive = dishWords.filter(w => !GENERIC_WORDS.has(w));
  if (distinctive.length > 0) return distinctive.some(hit);
  return dishWords.some(hit); // whole name is generic (e.g. "Fish Amok" -> rely on any word)
}

// Splits a compound dish name into candidate sub-queries, e.g.
// "Gochujang Honey Tofu with Kimchi and Tteokbokki" -> ["Gochujang Honey Tofu", "Kimchi", "Tteokbokki"]
// Useful when the full name has no dedicated article but a component dish does.
function splitSegments(dish) {
  return dish
    .split(/\s*[\/,]\s*|\s+with\s+|\s+and\s+/i)
    .map(s => s.trim())
    .filter(s => s.length > 2);
}

async function searchWikipediaPage(query) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=1&prop=pageimages&piprop=thumbnail&pithumbsize=640&format=json&origin=*`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) return null;
  const data = await res.json();
  const pages = data?.query?.pages;
  if (!pages) return null;
  const page = Object.values(pages)[0];
  if (!page?.title) return null;
  return { title: page.title, imageUrl: page.thumbnail?.source || null };
}

// Searches Wikimedia Commons' File: namespace directly — catches dishes whose
// Wikipedia article (if any) has no lead image, but that do have photos on Commons.
async function searchCommonsImage(query) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=1&prop=imageinfo&iiprop=url&iiurlwidth=640&format=json&origin=*`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) return null;
  const data = await res.json();
  const pages = data?.query?.pages;
  if (!pages) return null;
  const page = Object.values(pages)[0];
  const info = page?.imageinfo?.[0];
  const thumbUrl = info?.thumburl || info?.url;
  if (!thumbUrl) return null;
  const title = (page?.title || "").replace(/^File:/, "").replace(/\.\w+$/, "");
  return { title, imageUrl: thumbUrl };
}

// Rejects generic or off-topic articles that share a word with the query but
// aren't a photo of the specific dish: country pages, "X cuisine"/"Culture of X"
// overview articles, the generic "National dish" list, TV series, music genres,
// and photo-archive junk (Fotothek/Internet Archive scan identifiers).
function isJunkTitle(title, country) {
  const t = foldAscii(title);
  if (t === foldAscii(country)) return true;                 // bare country page
  if (t === foldAscii(`the ${country}`)) return true;
  if (/\bcuisine\b/.test(t)) return true;                    // "Malawian cuisine"
  if (/\bculture of\b/.test(t)) return true;                 // "Culture of Qatar"
  if (/^national dish/.test(t)) return true;                 // generic list article
  if (/\bseries \d/.test(t)) return true;                    // "MasterChef ... series 18"
  if (/\bmusic\b/.test(t)) return true;                      // "Bouyon music"
  if (/\bfotothek\b|\(ia /.test(t)) return true;             // archive-scan junk
  return false;
}

async function findImageFor(dish, country) {
  const candidates = [...new Set([dish, ...splitSegments(dish), `${dish} ${country}`, `${dish} dish`])];

  // Pass 1: Wikipedia article search (most specific, prefer these matches).
  for (const query of candidates) {
    const page = await searchWikipediaPage(query);
    await new Promise(r => setTimeout(r, 120));
    if (!page || !isConfidentMatch(query, page.title) || isJunkTitle(page.title, country)) continue;
    if (page.imageUrl) return { title: page.title, imageUrl: page.imageUrl, query };
    // Matched article confirmed relevant but has no lead image — look it up on
    // Commons by its exact (now-confirmed) title instead of the raw dish name.
    const commons = await searchCommonsImage(page.title);
    await new Promise(r => setTimeout(r, 120));
    if (commons) return { title: page.title, imageUrl: commons.imageUrl, query };
  }

  // Pass 2: search Commons directly for dishes with no Wikipedia article at all.
  for (const query of candidates) {
    const commons = await searchCommonsImage(query);
    await new Promise(r => setTimeout(r, 120));
    if (commons && isConfidentMatch(query, commons.title) && !isJunkTitle(commons.title, country)) {
      return { title: commons.title, imageUrl: commons.imageUrl, query };
    }
  }

  return null;
}

const { RECIPES } = await import(pathToFileURL(RECIPES_PATH).href);
const missing = RECIPES.filter(r => !r.dishImageUrl || r.dishImageUrl.trim() === "").slice(0, LIMIT);

console.log(`${RECIPES.length} total recipes, ${missing.length} missing dishImageUrl.\n`);

const matches = [];
const misses = [];

for (const [i, recipe] of missing.entries()) {
  process.stdout.write(`[${i + 1}/${missing.length}] ${recipe.dish} (${recipe.country})... `);
  try {
    const found = await findImageFor(recipe.dish, recipe.country);
    if (found) {
      matches.push({ id: recipe.id, dish: recipe.dish, country: recipe.country, ...found });
      console.log(`✓ matched "${found.title}"`);
    } else {
      misses.push({ id: recipe.id, dish: recipe.dish, country: recipe.country });
      console.log("✗ no match");
    }
  } catch (e) {
    misses.push({ id: recipe.id, dish: recipe.dish, country: recipe.country, error: e.message });
    console.log(`✗ error: ${e.message}`);
  }
  await new Promise(r => setTimeout(r, 150));
}

console.log(`\nMatched ${matches.length}/${missing.length}. Misses: ${misses.length}.`);

const reportPath = path.join(__dirname, "fetch-stock-photos-report.json");
writeFileSync(reportPath, JSON.stringify({ matches, misses }, null, 2));
console.log(`Full report written to ${reportPath}`);

if (DRY_RUN) {
  console.log("\n--dry-run set, not modifying recipes.js.");
  process.exit(0);
}

let src = readFileSync(RECIPES_PATH, "utf8");
let patched = 0;
for (const m of matches) {
  const re = new RegExp(`(id:\\s*"${m.id}"\\s*,\\s*dishImageUrl:\\s*)""`);
  if (re.test(src)) {
    src = src.replace(re, `$1"${m.imageUrl}"`);
    patched++;
  } else {
    console.log(`WARNING: could not find empty dishImageUrl slot for id "${m.id}" — skipped.`);
  }
}
writeFileSync(RECIPES_PATH, src);
console.log(`\nPatched ${patched}/${matches.length} entries in recipes.js.`);
