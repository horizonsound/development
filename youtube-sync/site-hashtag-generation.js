import fs from "fs";
import yaml from "js-yaml";
import { loadSongsYaml, loadSiteYaml } from "./utils/loadYaml.js";

console.log("=== Horizon Sound: SEO Tag Generation ===");

// Load YAML
const songs = loadSongsYaml();
const siteConfig = loadSiteYaml();
const BASE_TAGS = siteConfig.settings.seo.base_tags || [];

console.log("Base tags loaded:", BASE_TAGS);

// -------------------------------
// Normalization Helpers
// -------------------------------
function normalize(str) {
  return str
    .toLowerCase()
    .replace(/#/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim();
}

function extractMeaningfulWords(text) {
  if (!text) return [];

  const raw = text
    .toLowerCase()
    .replace(/<[^>]+>/g, " ") // strip HTML
    .replace(/[^\p{L}\p{N}\s]+/gu, " "); // remove punctuation/emojis

  const words = raw.split(/\s+/);

  // Meaningful concept filter (Option B)
  return words.filter(w =>
    w.length > 3 &&               // remove tiny words
    !["official", "video", "the", "and", "with", "from", "this"].includes(w)
  );
}

// -------------------------------
// Tag Extraction
// -------------------------------
function buildTags(song) {
  const tags = new Set();

  // 1. Base tags from site.yml
  BASE_TAGS.forEach(t => tags.add(normalize(t)));

  // 2. Title concepts
  extractMeaningfulWords(song.title).forEach(w => tags.add(normalize(w)));

  // 3. Playlist concepts
  if (song.playlists) {
    song.playlists.forEach(pl => {
      extractMeaningfulWords(pl).forEach(w => tags.add(normalize(w)));
    });
  }

  // 4. Vibes concepts
  if (song.vibes) {
    song.vibes.forEach(v => {
      extractMeaningfulWords(v).forEach(w => tags.add(normalize(w)));
    });
  }

  // 5. Description concepts
  extractMeaningfulWords(song.description_html).forEach(w =>
    tags.add(normalize(w))
  );

  // 6. Song ID concepts
  extractMeaningfulWords(song.song_id).forEach(w =>
    tags.add(normalize(w))
  );

  // 7. Existing tags (preserve them)
  if (song.tags) {
    song.tags.forEach(t => tags.add(normalize(t)));
  }

  // Final cleanup
  const final = Array.from(tags)
    .map(normalize)
    .filter(t => t && t.length > 1)
    .filter(t => !/^\d+$/.test(t)) // remove pure numbers
    .sort();

  return final;
}

// -------------------------------
// Process Songs
// -------------------------------
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

// -------------------------------
// Write YAML
// -------------------------------
console.log("\nWriting updated tags back to YAML...");

const yamlStr = yaml.dump(
  { songs: updatedSongs },
  {
    lineWidth: -1,
    noRefs: true // disable YAML anchors
  }
);

fs.writeFileSync("../_data/youtube_feed.yml", yamlStr, "utf8");

console.log("✓ Tag generation complete.");
console.log("✓ YAML updated.");
console.log("✓ No YouTube API calls made.");
