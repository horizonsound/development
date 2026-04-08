// update-youtube.js
import { loadSongsYaml, writeSongsYaml } from "./utils/loadYaml.js";
import { generateHashtags } from "./generate-hashtags.js";
import { updateYoutubeTags } from "./youtube-update-tags.js";

async function main() {
  console.log("=== Horizon Sound Metadata Pipeline ===");

  console.log("Loading songs from YAML...");
  let songs = loadSongsYaml();
  console.log(`Loaded ${songs.length} songs\n`);

  console.log("Generating hashtags...");
  songs = generateHashtags(songs);
  console.log("Hashtag generation complete.\n");

  console.log("Writing updated YAML...");
  writeSongsYaml(songs);
  console.log("YAML write complete.\n");

  console.log("Updating YouTube tags...\n");

  for (const song of songs) {
    console.log(`→ Updating video: ${song.title} (${song.youtube_id})`);
    console.log(`  Hashtags: ${song.hashtags.join(", ")}`);

    try {
      await updateYoutubeTags(song.youtube_id, song.hashtags);
      console.log("  ✓ YouTube update successful\n");
    } catch (err) {
      console.error("  ✗ ERROR updating YouTube:", err.message);
      console.error(err.stack);
    }
  }

  console.log("=== Pipeline Complete ===");
}

main().catch(err => {
  console.error("FATAL ERROR:", err);
  console.error(err.stack);
  process.exit(1);
});
