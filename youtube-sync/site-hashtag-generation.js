import fs from "fs";
import yaml from "js-yaml";
import { loadSongsYaml, loadSiteYaml } from "./utils/loadYaml.js";

console.log("=== Horizon Sound: SEO Tag Generation (B2 Smart Extraction) ===");

// Load YAML
const songs = loadSongsYaml();
const siteConfig = loadSiteYaml();
const BASE_TAGS = siteConfig.settings.seo.base_tags || [];

console.log("Base tags loaded:", BASE_TAGS);

// ---------------------------------------------
// Hardcoded meaningful concept allowlist (B2-A)
// ---------------------------------------------
const ALLOWLIST = new Set([
  // Musical concepts
  "acoustic", "anthem", "choir", "colorchoir", "harmonyrich", "vibrantpop",
  "synthwave", "arena", "ballad", "pop", "rock", "vocals", "production",
  "percussion", "drums", "guitars", "pads",

  // Emotional concepts
  "uplifting", "nostalgic", "joyful", "bright", "hopeful", "comforting",
  "reflective", "sentimental", "unity", "joy",

  // Project identity
  "ascensionyouthchoir", "youthchoir", "horizonsound", "horizon",

  // Song identity (these will also be added dynamically)
]);

// ---------------------------------------------
// Stopwords (remove noise words)
// ---------------------------------------------
const STOPWORDS = new Set([
  "the", "and", "with", "from", "this", "that", "for", "into", "your",
  "more", "soon", "coming", "built", "driven", "follow", "around", "lifes",
  "style", "sound", "world", "young", "songs", "music", "vibe", "voices",
  "group", "like", "never", "small", "soft", "pads", "hand", "acoustic",
  "drums", "guitars", "percussion", "pads", "production", "vocals"
]);

// ---------------------------------------------
// Normalization
// ---------------------------------------------
function normalize(str) {
  return str
    .toLowerCase()
    .replace(/#/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim();
}

// ---------------------------------------------
// Extract meaningful words (B2 heuristic)
// ---------------------------------------------
function extractMeaningful(text) {
  if (!text) return [];

  const cleaned = text
    .toLowerCase()
    .replace(/<[^>]+>/g, " ")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ");

  const words = cleaned.split(/\s+/);

  return words.filter(w => {
    const n = normalize(w);
    if (!n || n.length < 4) return false;
    if (STOPWORDS.has(n)) return false;
    if (ALLOWLIST.has(n)) return true;

    // Heuristic: keep emotional/musical adjectives
    if (n.endsWith("ful") || n.endsWith("ing") || n.endsWith("ive")) return true;

    // Heuristic: keep genre-like words
    if (n.includes("pop") || n.includes("rock") || n.includes("choir")) return true;

    return false;
  });
}

// ---------------------------------------------
// Build tags
// ---------------------------------------------
function buildTags(song) {
  const tags = new Set();

  // 1. Base tags
  BASE_TAGS.forEach(t => tags.add(normalize(t)));

  // 2. Song identity
  extractMeaningful(song.title).forEach(w => tags.add(normalize(w)));

  // 3. Playlists
  if (song.playlists) {
    song.playlists.forEach(pl => {
      extractMeaningful(pl).forEach(w => tags.add(normalize(w)));
    });
  }

  // 4. Vibes
  if (song.vibes) {
    song.vibes.forEach(v => {
      extractMeaningful(v).forEach(w => tags.add(normalize(w)));
    });
  }

  // 5. Description
  extractMeaningful(song.description_html).forEach(w =>
    tags.add(normalize(w))
  );

  // 6. Song ID
  extractMeaningful(song.song_id).forEach(w =>
    tags.add(normalize(w))
  );

  // 7. Existing tags
  if (song.tags) {
    song.tags.forEach(t => {
      const n = normalize(t);
      if (ALLOWLIST.has(n)) tags.add(n);
    });
  }

  // Final cleanup
  const final = Array.from(tags)
    .map(normalize)
    .filter(t => t && t.length > 1)
    .sort();

  return final;
}

// ---------------------------------------------
// Process songs
// ---------------------------------------------
console.log("Generating SEO tags...");

const updatedSongs = songs.map(song => {
  const tags = buildTags(song);

  console.log(`\n=== ${song.title} ===`);
  console.log("Generated tags:", tags);

  return {
    ...song,
    tags
  };
});

// ---------------------------------------------
// Write YAML
// ---------------------------------------------
console.log("\nWriting updated tags back to YAML...");

const yamlStr = yaml.dump(
  { songs: updatedSongs },
  {
    lineWidth: -1,
    noRefs: true
  }
);

fs.writeFileSync("../_data/youtube_feed.yml", yamlStr, "utf8");

console.log("✓ Tag generation complete.");
console.log("✓ YAML updated.");
console.log("✓ No YouTube API calls made.");
