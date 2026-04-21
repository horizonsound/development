// generate-hashtags.js
const DEBUG = false;

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

// --- MAIN EXPORT ----------------------------------------------------------
export function generateHashtags(songs) {
  if (DEBUG) {
    console.log("Starting hashtag generation...\n");
  }

  return songs.map(song => {
    if (DEBUG) {
      console.log(`---`);
      console.log(`Song: ${song.title}`);
      console.log(`Slug: ${song.song_id}`);
      console.log(`Playlists: ${song.playlists.join(", ")}`);
      console.log(`Vibes: ${song.vibes.join(", ")}`);
      console.log(`Existing tags: ${song.tags.join(", ")}`);
    }

    const hashtags = buildHashtags(song);

    if (DEBUG) {
      console.log(`Generated hashtags: ${hashtags.join(", ")}\n`);
    }

    return { ...song, hashtags };
  });
}

// --- HASHTAG BUILDER ------------------------------------------------------
function buildHashtags(song) {
  // Base tags
  const base = [
    "#horizonsound",
    "#" + sanitizeTag(song.title.replace(/\s+/g, ""))
  ];

  // Vibe tags
  const vibeTags = (song.vibes || [])
    .map(v => "#" + sanitizeTag(v));

  // Playlist tags
  const playlistTags = (song.playlists || [])
    .map(pl => "#" + sanitizeTag(pl));

  // Existing tags from YAML
  const existingTags = (song.tags || [])
    .map(t => "#" + sanitizeTag(t));

  // Merge + dedupe + limit
  const all = [...base, ...vibeTags, ...playlistTags, ...existingTags];

  return Array.from(new Set(all)).slice(0, 12);
}
