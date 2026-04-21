import { loadSongsYaml /* writeSongsYaml */ } from "./utils/loadYaml.js";
import { loadSiteYaml } from "./utils/loadSiteYaml.js";
import { generateHashtags } from "./generate-hashtags.js";
import { updateYoutubeTags, fetchYoutubeMetadata } from "./youtube-update-tags.js";

const DRY_RUN = false; // Safety lock — no real updates until you flip this

async function main() {
  console.log("=== Horizon Sound Metadata Pipeline ===\n");

  // -----------------------------
  // Load YAML (READ-ONLY)
  // -----------------------------
  const siteConfig = loadSiteYaml().settings.youtube_update;

  console.log("Loading songs from YAML...");
  let songs = loadSongsYaml();
  console.log(`Loaded ${songs.length} songs\n`);

  console.log("Generating hashtags...");
  songs = generateHashtags(songs);
  console.log("Hashtag generation complete.\n");

  // ❌ WRITE DISABLED — catalog is read-only
  // console.log("Writing updated YAML...");
  // writeSongsYaml(songs);
  // console.log("YAML write complete.\n");

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
    console.log(`\n=== ${song.title} (${song.youtube_id}) ===`);

    // Fetch current YouTube metadata (cheap call)
    const current = await fetchYoutubeMetadata(song.youtube_id);

    if (!current) {
      console.log(`  ERROR: Could not fetch metadata for ${song.youtube_id}`);
      continue;
    }

    const intended = { tags: song.hashtags };

    // Essential logging only
    console.log(`  YouTube tags:   ${current.tags.join(", ") || "(none)"}`);
    console.log(`  Intended tags:  ${intended.tags.join(", ")}`);

    const diff = diffHashtags(current.tags, intended.tags);

    console.log(`  Tags match?     ${diff.changed ? "NO" : "YES"}`);

    if (!diff.changed) {
      console.log(`  → SKIPPED (no changes needed)`);
      continue;
    }

    console.log(`  → UPDATE REQUIRED`);

    if (DRY_RUN) {
      console.log("  [DRY RUN] Would update YouTube here");
      continue;
    }

    await updateYoutubeTags(song.youtube_id, intended.tags);
    console.log("  ✓ YouTube update successful");
  }

  console.log("\n=== Pipeline Complete ===");
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
// ===============================================================
function normalizeTag(tag) {
  return tag.toLowerCase().normalize("NFKC").trim();
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
  return { changed: !tagsAreEqual(current, intended) };
}

main().catch(err => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
