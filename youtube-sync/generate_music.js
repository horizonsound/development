import fs from "fs";
import yaml from "js-yaml";

// ---------------------------------------------------------
// Helpers
// ---------------------------------------------------------

function loadYAML(path) {
  console.log(`📄 Loading YAML: ${path}`);
  return yaml.load(fs.readFileSync(path, "utf8"));
}

function writeYAML(path, data) {
  console.log(`💾 Writing YAML: ${path}`);
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
  artistLookup[t.slug] = t;
});

const overrideLookup = {};
(musicOverrides.overrides || []).forEach(o => {
  overrideLookup[o.song_id] = o;
});

// ---------------------------------------------------------
// 2. Build unified track entries
// ---------------------------------------------------------

console.log(`🎵 Total songs in youtube_feed: ${youtubeFeed.songs.length}`);

const tracks = youtubeFeed.songs.map((song, index) => {
  console.log(`\n----------------------------------------`);
  console.log(`🔍 Processing song #${index + 1}`);
  console.log(`🆔 song_id: ${song.song_id}`);
  console.log(`🎶 title: ${song.title}`);
  console.log(`🔑 slug: ${song.slug}`);

  // Check for missing slug
  if (!song.slug) {
    console.error(`❌ ERROR: Missing slug for song_id=${song.song_id}, title="${song.title}"`);
    return null; // continue processing others
  }

  const slug = song.slug;
  const songId = song.song_id;

  const artist = artistLookup[slug];

  // Check for missing artist mapping
  if (!artist) {
    console.error(`❌ ERROR: Missing artist mapping for slug="${slug}" (song_id=${songId}, title="${song.title}")`);
    return null;
  }

  console.log(`👤 Artist found: ${artist.artist_name}`);

  const base = {
    id: songId,
    slug,
    title: song.title,
    subtitle: song.subtitle || null,

    initials: artist.initials,
    artist_slug: artist.artist_slug,
    artist_name: artist.artist_name,

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

  // Apply overrides
  const ov = overrideLookup[songId];
  if (ov) {
    console.log(`✨ Applying overrides for ${songId}`);
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

// Filter out nulls (bad entries)
const validTracks = tracks.filter(t => t !== null);

// ---------------------------------------------------------
// 4. Deterministic sorting
// ---------------------------------------------------------

validTracks.sort((a, b) => {
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

writeYAML("./music.yml", { tracks: validTracks });

console.log("✅ music.yml generated successfully.");
