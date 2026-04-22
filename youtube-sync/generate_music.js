import fs from "fs";
import yaml from "js-yaml";

// ---------------------------------------------------------
// Helpers
// ---------------------------------------------------------

function loadYAML(path) {
  return yaml.load(fs.readFileSync(path, "utf8"));
}

function writeYAML(path, data) {
  fs.writeFileSync(path, yaml.dump(data, { sortKeys: false }), "utf8");
}

// ---------------------------------------------------------
// 1. Load source YAML files
// ---------------------------------------------------------

const youtubeFeed = loadYAML("../_data/youtube_feed.yml");
const musicOverrides = loadYAML("../_data/music_overrides.yml");
const artistMap = loadYAML("../_data/artist_to_track_mapping.yml");

// Build lookup tables
const artistLookup = {};
artistMap.tracks.forEach(t => {
  // IMPORTANT: use song_id as the key
  artistLookup[t.song_id] = t;
});

const overrideLookup = {};
(musicOverrides.overrides || []).forEach(o => {
  overrideLookup[o.song_id] = o;
});

// ---------------------------------------------------------
// 2. Build unified track entries
// ---------------------------------------------------------

const tracks = youtubeFeed.songs.map(song => {
  const songId = song.song_id;

  // Use song_id as slug
  const slug = songId;

  const artist = artistLookup[songId];
  if (!artist) {
    console.error(`❌ Missing artist mapping for song_id: ${songId}`);
    process.exit(1);
  }

  const base = {
    // -----------------------------------------------------
    // Core identity
    // -----------------------------------------------------
    id: songId,
    slug, // now always defined
    title: song.title,
    subtitle: song.subtitle || null,

    // -----------------------------------------------------
    // Artist metadata
    // -----------------------------------------------------
    initials: artist.initials,
    artist_slug: artist.artist_slug,
    artist_name: artist.artist_name,

    // -----------------------------------------------------
    // Audio / video / metadata
    // -----------------------------------------------------
    description_html: song.description_html || null,
    vibes: song.vibes || [],
    tags: song.tags || [],
    thumbnail: song.thumbnail || null,

    published_at: song.youtube_metadata.published_at,
    duration: song.youtube_metadata.duration,

    stats: {
      view_count: song.youtube_metadata.statistics.view_count,
      like_count: song.youtube_metadata.statistics.like_count,
      comment_count: song.youtube_metadata.statistics.comment_count
    },

    playlists: song.playlists || [],

    // -----------------------------------------------------
    // Overrides block (filled below)
    // -----------------------------------------------------
    overrides: {
      title: null,
      subtitle: null,
      lyrics_html: null,
      collection: null,
      order: null,
      extra_title: null,
      extra_html: null
    }
  };

  // ---------------------------------------------------------
  // 3. Apply overrides
  // ---------------------------------------------------------
  const ov = overrideLookup[songId];
  if (ov) {
    Object.keys(base.overrides).forEach(key => {
      if (ov[key] !== undefined) {
        base.overrides[key] = ov[key];
      }
    });

    if (ov.title) base.title = ov.title;
    if (ov.subtitle) base.subtitle = ov.subtitle;
  }

  return base;
});

// ---------------------------------------------------------
// 4. Deterministic sorting
// ---------------------------------------------------------

tracks.sort((a, b) => {
  if (!a.published_at && b.published_at) return 1;
  if (a.published_at && !b.published_at) return -1;

  if (a.published_at !== b.published_at) {
    return a.published_at < b.published_at ? -1 : 1;
  }

  return a.slug.localeCompare(b.slug);
});

// ---------------------------------------------------------
// 5. Write final music.yml
// ---------------------------------------------------------

writeYAML("./music.yml", { tracks });

console.log("✅ music.yml generated successfully.");
