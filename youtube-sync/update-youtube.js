// scripts/update-youtube.js
import { loadSongsYaml, writeSongsYaml } from "./utils/loadYaml.js";
import { generateHashtags } from "./generate-hashtags.js";
import { updateYoutubeTags } from "./youtube-update-tags.js";

async function main() {
  console.log("Loading songs from YAML...");
  let songs = loadSongsYaml();

  console.log(`Loaded ${songs.length} songs.`);

  console.log("Generating hashtags...");
  songs = generateHashtags(songs);

  console.log("Writing updated YAML...");
  writeSongsYaml(songs);

  console.log("Updating YouTube tags...");
  for (const song of songs) {
    await updateYoutubeTags(song.youtube_id, song.hashtags);
  }

  console.log("Done.");
}

main().catch(err => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
