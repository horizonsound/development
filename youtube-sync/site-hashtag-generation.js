// site-hashtag-generation.js
import { loadSongsYaml, writeSongsYaml } from "./utils/loadYaml.js";

// --- SANITIZER ------------------------------------------------------------
// Removes commas and any characters YouTube will choke on.
// Keeps: letters, numbers, hyphens, parentheses.
function sanitizeTag(str) {
  return str
    .replace(/,/g, "")                 // remove commas
    .replace(/[^A-Za-z0-9\-()]/g, "")  // remove illegal characters
    .toLowerCase()
    .trim();
}

// --- HASHTAG BUILDER ------------------------------------------------------
function buildHashtags(song) {
  // Clean title tag (no descriptors, no commas)
  const cleanTitle = sanitizeTag(
    song.title
      .split("(")[0]        // remove anything after "("
      .replace(/\s+/g, "")  // remove spaces
  );

  const base = [
    "#horizonsound",
    "#" + cleanTitle
  ];

  const vibeTags = (song.vibes || [])
    .map(v => "#" + sanitizeTag(v));

  const playlistTags = (song.playlists || [])
    .map(pl => "#" + sanitizeTag(pl));

  const existingTags = (song.tags || [])
    .map(t => "#" + sanitizeTag(t))
    .filter(t => t !== "#aboutthesong"); // remove useless tag

  const all = [...base, ...vibeTags, ...playlistTags, ...existingTags];

  return Array.from(new Set(all)).slice(0, 12);
}

// --- MAIN SCRIPT ----------------------------------------------------------
async function main() {
  console.log("=== Horizon Sound: Site Hashtag Generation ===\n");

  console.log("Loading songs from YAML...");
  let songs = loadSongsYaml();
  console.log(`Loaded ${songs.length} songs\n`);

  console.log("Regenerating hashtags for all songs...");

  const updated = songs.map(song => {
    const hashtags = buildHashtags(song);
  
    console.log(`\n=== ${song.title} ===`);
    console.log(`Existing tags:`, song.tags);
    console.log(`Generated hashtags:`, hashtags);
  
    return { 
      ...song, 
      hashtags,
      tags: hashtags   // optional — only if you want to overwrite tags too
    };
  });
  
  console.log("Writing updated hashtags back to YAML...");
  writeSongsYaml(updated);

  console.log("\n✓ Hashtag generation complete.");
  console.log("✓ YAML updated.");
  console.log("✓ No YouTube API calls made.\n");
}

main().catch(err => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
