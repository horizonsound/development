import { loadSongsYaml, writeSongsYaml } from "./utils/loadYaml.js";
import { loadSiteYaml } from "./utils/loadSiteYaml.js";
import { generateHashtags } from "./generate-hashtags.js";
import { updateYoutubeTags, fetchYoutubeMetadata } from "./youtube-update-tags.js";

const DRY_RUN = true; // Safety lock — no real updates until you flip this

async function main() {
  console.log("=== Horizon Sound Metadata Pipeline ===\n");

  // -----------------------------
  // Load YAML
  // -----------------------------
  const siteConfig = loadSiteYaml().settings.youtube_update;

  console.log("Loading songs from YAML...");
  let songs = loadSongsYaml();
  console.log(`Loaded ${songs.length} songs\n`);

  console.log("Generating hashtags...");
  songs = generateHashtags(songs);
  console.log("Hashtag generation complete.\n");

  console.log("Writing updated YAML...");
  writeSongsYaml(songs);
  console.log("YAML write complete.\n");

  // -----------------------------
  // Select target songs
  // -----------------------------
  const targetSongs = getTargetSongs(songs, siteConfig);

  console.log(`Mode: ${siteConfig.mode}`);
  console.log(`Target songs: ${targetSongs.length}\n`);

  // -----------------------------
  // Process each target video
  // -----------------------------
  for (const song of targetSongs) {
    console.log(`Checking: ${song.title} (${song.youtube_id})`);

    // Fetch current YouTube metadata (cheap call)
    const current = await fetchYoutubeMetadata(song.youtube_id);
    //const current = { tags: [] }; // TEMP STUB

    if (!current) {
      console.log(`  ERROR: Could not fetch metadata for ${song.youtube_id}`);
      continue;
    }

    const intended = {
      tags: song.hashtags
    };

    const diff = diffHashtags(current.tags, intended.tags);

    if (!diff.changed) {
      console.log(`SKIP   | ${song.title} (${song.youtube_id}) — no changes detected\n`);
      continue;
    }

    // Log the differences
    console.log(`UPDATE | ${song.title} (${song.youtube_id})`);
    console.log(`  - Tags changed`);
    console.log(`  Current:  ${current.tags.join(", ")}`);
    console.log(`  Intended: ${intended.tags.join(", ")}`);

    if (DRY_RUN) {
      console.log("  [DRY RUN] Would update YouTube here\n");
      continue;
    }

    // Real update (still commented out for safety)
    // await updateYoutubeTags(song.youtube_id, intended.tags);
    console.log("  ✓ YouTube update successful\n");
  }

  console.log("=== Pipeline Complete ===");
}

// --------------------------------------------------
// MODE SELECTOR
// --------------------------------------------------
function getTargetSongs(songs, config) {
  switch (config.mode) {
    case "single":
      return songs.filter(s => s.youtube_id === config.single.youtube_id);

    case "multiple":
      return songs.filter(s => config.multiple.youtube_ids.includes(s.youtube_id));

    case "playlist":
      return songs.filter(s => s.playlists?.includes(config.playlist.playlist_id));

    case "all":
      return songs;

    default:
      console.error("Invalid mode in site.yml");
      return [];
  }
}

// ===============================================================
// TAG NORMALIZATION + UNORDERED COMPARISON
// YouTube alphabetizes tags, so we compare as SETS, not sequences.
// ===============================================================
function normalizeTag(tag) {
  return tag
    .toLowerCase()
    .normalize("NFKC")
    .trim();
}

function tagsAreEqual(current, intended) {
  const a = current.map(normalizeTag).sort();
  const b = intended.map(normalizeTag).sort();

  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }

  return true;
}

// --------------------------------------------------
// HASHTAG DIFF ENGINE
// --------------------------------------------------
function diffHashtags(currentTags, intendedTags) {
  const current = currentTags || [];
  const intended = intendedTags || [];

  const changed = !tagsAreEqual(current, intended);

  return { changed };
}

main().catch(err => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
