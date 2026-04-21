import fs from "fs";
import yaml from "js-yaml";
import { loadSongsYaml, loadSiteYaml } from "./utils/loadYaml.js";

console.log("=== Horizon Sound: Site Tag Generation ===");

// Load YAML
console.log("Loading songs from YAML...");
const songs = loadSongsYaml();

console.log("Loading site config...");
const siteConfig = loadSiteYaml();
const BASE_TAGS = siteConfig.settings.seo.base_tags || [];

console.log("Base tags loaded:", BASE_TAGS);

// --- Tag Normalizer ---
function normalizeTag(str) {
  return str
    .toLowerCase()
    .replace(/#/g, "")              // remove hashtag prefix
    .replace(/[^\p{L}\p{N}]+/gu, "") // remove punctuation/emojis
    .trim();
}

// --- Build Tags (base tags only for now) ---
function buildTags(song) {
  const tags = new Set();

  // Add base tags
  BASE_TAGS.forEach(t => {
    const clean = normalizeTag(t);
    if (clean.length > 1) tags.add(clean);
  });

  return Array.from(tags);
}

// --- Process Songs ---
console.log("Regenerating tags for all songs...");

const updatedSongs = songs.map(song => {
  const tags = buildTags(song);

  console.log(`\n=== ${song.title} ===`);
  console.log("Generated tags:", tags);

  return {
    ...song,
    tags
  };
});

// --- Write YAML ---
console.log("Writing updated tags back to YAML...");

const yamlStr = yaml.dump(
  { songs: updatedSongs },
  {
    lineWidth: -1,
    noRefs: true // IMPORTANT: disables YAML anchors & aliases
  }
);

fs.writeFileSync("../_data/youtube_feed.yml", yamlStr, "utf8");

console.log("✓ Tag generation complete.");
console.log("✓ YAML updated.");
console.log("✓ No YouTube API calls made.");
