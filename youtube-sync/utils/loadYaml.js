import fs from "fs";
import yaml from "js-yaml";

const SONGS_PATH = "../_data/youtube_feed.yml";
const SITE_PATH = "../_data/site.yml";

export function loadSongsYaml() {
  const file = fs.readFileSync(SONGS_PATH, "utf8");
  const data = yaml.load(file);
  return data.songs || [];
}

export function loadSiteYaml() {
  const file = fs.readFileSync(SITE_PATH, "utf8");
  const data = yaml.load(file);
  return data;
}
