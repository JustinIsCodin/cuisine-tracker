// Fills in the missing `dishImageUrl` field for recipes in src/data/recipes.js
// by searching Wikipedia for the dish and pulling its lead photo (hosted on
// Wikimedia Commons — same free-licensed source the existing entries use).
//
// Safe to re-run: only touches entries where dishImageUrl is currently "".
//
//   node scripts/fetch-stock-photos.mjs            # do the fetch + patch
//   node scripts/fetch-stock-photos.mjs --dry-run   # report matches only, don't edit recipes.js

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

// Guards against the search drifting to an unrelated article (e.g. a made-up
// fusion dish name matching some loosely-related Wikipedia page) by requiring
// at least one non-trivial word from the dish name to appear in the matched
// article's title.
function isConfidentMatch(dish, title) {
  const dishWords = dish.toLowerCase().split(/[^a-z]+/).filter(w => w.length > 2 && !STOPWORDS.has(w));
  const titleLower = title.toLowerCase();
  return dishWords.some(w => titleLower.includes(w));
}

async function searchWikipediaImage(query) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=1&prop=pageimages&piprop=thumbnail&pithumbsize=640&format=json&origin=*`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) return null;
  const data = await res.json();
  const pages = data?.query?.pages;
  if (!pages) return null;
  const page = Object.values(pages)[0];
  if (!page?.thumbnail?.source) return null;
  return { title: page.title, imageUrl: page.thumbnail.source };
}

async function findImageFor(dish, country) {
  // Try the dish name alone first (usually specific enough), then with country appended.
  for (const query of [dish, `${dish} ${country}`, `${dish} dish`]) {
    const result = await searchWikipediaImage(query);
    if (result && isConfidentMatch(dish, result.title)) return { ...result, query };
    await new Promise(r => setTimeout(r, 150));
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
