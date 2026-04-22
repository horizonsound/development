import fs from "fs";
import yaml from "js-yaml";
import { loadSongsYaml, loadSiteYaml } from "./utils/loadYaml.js";

console.log("=== Horizon Sound: SEO Tag Generation (Phase 1 Structured Extraction) ===");

// CLI flag: --all = regenerate tags for ALL songs
const PROCESS_ALL = process.argv.includes("--all");

// Load YAML
const songs = loadSongsYaml();
const siteConfig = loadSiteYaml();
const BASE_TAGS = siteConfig.settings.seo.base_tags || [];

console.log("Base tags loaded:", BASE_TAGS);
console.log(PROCESS_ALL ? "Mode: FULL REGEN" : "Mode: ONLY EMPTY TAGS");

// ---------------------------------------------
// STOPWORDS (exact-match only)
// ---------------------------------------------
const STOPWORDS = new Set([
  "the","and","for","with","from","this","that","into","your","you",
  "looking","breaking","saving","staring","blending","corralling",
  "something","nothing","thing","story","tale","built","feels","feel",
  "makes","made","like","even","though","just","more","less"
]);

// ---------------------------------------------
// Extractors
// ---------------------------------------------
function extractFromVibes(vibesArray) {
  if (!Array.isArray(vibesArray)) return [];

  return vibesArray
    .map(v => v.replace(/^[^:]+:/, ""))       // remove "Vibe:", "Vocals:", etc.
    .flatMap(v => v.split(","))               // split descriptors
    .map(s => s.trim().toLowerCase())
    .map(s => s.replace(/[^a-z0-9\s-]/g, "")) // remove emojis/punctuation
    .map(s => s.replace(/\s+/g, ""))          // merge multi-word descriptors
    .map(s => s.replace(/-/g, ""))            // remove hyphens
    .filter(s => s.length > 2)
    .filter(s => !["vibe","vocals","production","mood"].includes(s))
    .filter(s => !STOPWORDS.has(s));          // exact match only
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

// ---------------------------------------------
// Clean + Build Tags
// ---------------------------------------------
function clean(words) {
  return [...new Set(words)] // dedupe
    .filter(w => !STOPWORDS.has(w))
    .filter(w => /^[a-z0-9]+$/.test(w)); // letters/numbers only
}

function buildTags(song) {
  const vibeWords = extractFromVibes(song.vibes);
  const titleWords = extractFromTitle(song.title);
  const playlistWords = extractFromPlaylists(song.playlists);

  const combined = [
    ...vibeWords,
    ...titleWords,
    ...playlistWords,
    ...BASE_TAGS.map(t => t.toLowerCase())
  ];

  return clean(combined).sort();
}

// ---------------------------------------------
// Process Songs
// ---------------------------------------------
console.log("Generating SEO tags...");

const updatedSongs = songs.map(song => {
  const shouldProcess =
    PROCESS_ALL || !song.tags || song.tags.length === 0;

  if (!shouldProcess) {
    console.log(`Skipping (tags exist): ${song.title}`);
    return song;
  }

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
