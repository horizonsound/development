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
// TAG GENERATOR — DROP-IN REPLACEMENT
// Phase 1: Structured fields only (vibes, title, playlists)
// ---------------------------------------------

// Use BASE_TAGS from site.yml (already loaded above)
const STOPWORDS = new Set([
  "the","and","for","with","from","this","that","into","your","you",
  "looking","breaking","saving","staring","blending","corralling",
  "something","nothing","thing","story","tale","built","feels","feel",
  "makes","made","like","even","though","just","more","less"
]);

function extractFromVibes(vibesArray) {
  if (!Array.isArray(vibesArray)) return [];

  return vibesArray
    .flatMap(v => v.split(/[,:]/))            // split on commas/colons
    .map(s => s.replace(/^[^a-zA-Z]+/, ""))   // strip emojis/symbols
    .map(s => s.trim().toLowerCase())
    .filter(s => s.length > 2);
}

function extractFromTitle(title) {
  if (!title) return [];

  const normalized = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ""); // remove all non-alphanumerics

  return normalized.length > 2 ? [normalized] : [];
}

function extractFromPlaylists(playlists) {
  if (!Array.isArray(playlists)) return [];

  return playlists
    .map(slug =>
      slug
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "") // remove hyphens and punctuation
    )
    .filter(w => w.length > 2);
}

function clean(words) {
  return [...new Set(words)] // dedupe
    .filter(w => !STOPWORDS.has(w))
    .filter(w => /^[a-z]+$/.test(w)); // letters only
}

function buildTags(song) {
  const vibeWords = extractFromVibes(song.vibes);
  const titleWords = extractFromTitle(song.title);
  const playlistWords = extractFromPlaylists(song.playlists);

  const combined = [
    ...vibeWords,
    ...titleWords,
    ...playlistWords,
    ...BASE_TAGS.map(t => t.toLowerCase())  // <-- use site.yml base tags
  ];

  const cleaned = clean(combined);

  return cleaned.sort();
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
