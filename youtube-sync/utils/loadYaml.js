// utils/loadYaml.js
import fs from "fs";
import yaml from "js-yaml";

const FEED_PATH = "../_data/youtube_feed.yml";

export function loadSongsYaml() {
  console.log(`Reading YAML from ${FEED_PATH}`);
  const raw = fs.readFileSync(FEED_PATH, "utf8");
  const parsed = yaml.load(raw);
  console.log("YAML loaded successfully.\n");
  return parsed.songs || [];
}

export function writeSongsYaml(songs) {
  console.log(`Writing YAML to ${FEED_PATH}`);
  const yamlStr = yaml.dump({ songs });
  fs.writeFileSync(FEED_PATH, yamlStr, "utf8");
  console.log("YAML write complete.\n");
}
