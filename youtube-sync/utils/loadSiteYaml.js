// youtube-sync/utils/loadSiteYaml.js
import fs from "fs";
import yaml from "js-yaml";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function loadSiteYaml() {
  const filePath = path.resolve(__dirname, "../../_data/site.yml");

  try {
    const fileContents = fs.readFileSync(filePath, "utf8");
    return yaml.load(fileContents);
  } catch (err) {
    console.error("ERROR: Could not load site.yml");
    console.error(err);
    throw err;
  }
}
