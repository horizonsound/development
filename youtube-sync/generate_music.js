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

// Clean title for ID generation (15 chars)
function normalizeTitleForId(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "") // remove all non-alphanumeric
    .slice(0, 15);             // first 15 chars only
}

// Slugify clean override title
function slugifyTitle(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "") // remove special chars
    .trim()
    .replace(/\s+/g, "_");
}

// Convert ISO8601 duration to "M:SS"
function formatDurationDisplay(iso) {
  if (!iso) return null;

  const match = iso.match(/PT(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return null;

  const minutes = parseInt(match[1] || "0", 10);
  const seconds = parseInt(match[2] || "0", 10);

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

// Curated emotional vocabulary
const EMOTIONAL_MOODS = new Set([
  "uplifting",
  "nostalgic",
  "joyful",
  "adventurous",
  "hopeful",
  "triumphant",
  "emotional",
  "heartfelt",
  "cinematic",
  "powerful",
  "gentle",
  "warm",
  "reflective",
  "bold",
  "comforting",
  "free-spirited",
  "celebratory",
  "sentimental",
  "thoughtful",
  "epic",
  "awe-struck",
  "renewed",
  "optimistic",
  "forward-looking",
  "longing",
  "melancholic",
  "melancholy",
  "tender",
  "soft",
  "expressive",
  "aching",
  "sad",
  "sadness"
]);

// Moods mapping from vibes
function vibesToMoods(vibes = []) {
  const results = [];

  for (const v of vibes) {
    if (typeof v !== "string") continue;

    // Remove emoji
    let cleaned = v.replace(/^[^\w]+/u, "").trim();

    // Remove prefixes like "vibe:", "vocals:", "production:", "mood:"
    cleaned = cleaned.replace(/^(vibe|vocals|production|mood)\s*:\s*/i, "");

    // Split on commas
    const parts = cleaned.split(",").map(p => p.trim().toLowerCase());

    for (const p of parts) {
      if (EMOTIONAL_MOODS.has(p) && !results.includes(p)) {
        results.push(p);
      }
    }
  }

  return results;
}

// Genre detection from playlist slugs
const GENRE_MAP = {
  "pop": "pop",
  "edm": "edm",
  "southern-rock": "southern-rock",
  "80s-rock-pop": "80s-rock-pop",
  "emotional-ballads": "emotional-ballads",
  "irish-celtic-horizon-sound-instrumentals": "celtic"
};

function derivePrimaryGenre(playlists = []) {
  for (const p of playlists) {
    if (GENRE_MAP[p]) return GENRE_MAP[p];
  }
  return null;
}

// ---------------------------------------------------------
// 1. Load source YAML files
// ---------------------------------------------------------

const youtubeFeed = loadYAML("../_data/youtube_feed.yml");
const musicOverrides = loadYAML("../_data/music_overrides.yml");
const artistMap = loadYAML("../_data/artist_to_track_mapping.yml");

// Build lookup tables
const artistLookup = {};
(artistMap.tracks || []).forEach(t => {
  artistLookup[t.song_id] = t;
});

const overrideLookup = {};
(musicOverrides.overrides || []).forEach(o => {
  overrideLookup[o.song_id] = o;
});

// ---------------------------------------------------------
// 2. Build SOR tracks
// ---------------------------------------------------------

const usedIds = new Set();

function generateUniqueId(base) {
  let id = base;
  let counter = 2;
  while (usedIds.has(id)) {
    id = `${base}_${counter}`;
    counter++;
  }
  usedIds.add(id);
  return id;
}

const tracks = (youtubeFeed.songs || []).map(song => {
  const songId = song.song_id;
  const ov = overrideLookup[songId];
  const artist = artistLookup[songId];

  if (!artist) {
    console.error(`❌ Missing artist mapping for song_id: ${songId}`);
    process.exit(1);
  }

  if (!ov || !ov.title) {
    console.error(`❌ Missing override.title for song_id: ${songId}`);
    process.exit(1);
  }

  const cleanTitle = ov.title;
  const subtitle = ov.subtitle || null;

  // ID generation (15 chars)
  const titleKey = normalizeTitleForId(cleanTitle);
  const baseId = `trk_${titleKey}_${artist.initials}`;
  const id = generateUniqueId(baseId);

  // Slug generation
  const slug = slugifyTitle(cleanTitle);

  // Moods
  const moods = vibesToMoods(song.vibes || []);

  // Genre
  const playlists = song.playlists || [];
  const primaryGenre = derivePrimaryGenre(playlists);

  // Duration
  const duration = song.youtube_metadata?.duration || null;
  const durationDisplay = formatDurationDisplay(duration);

  // -----------------------------------------------------
  // Build track object in EXACT schema
  // -----------------------------------------------------
  return {
    id,
    slug,
    title: cleanTitle,
    subtitle,
    status: song.videostatus || null,
    type: null,
    track_number: ov.order || null,
    disc_number: null,
    release_id: null,

    primary_artist: artist.artist_slug,
    featuring_artists: [],

    duration,
    duration_display: durationDisplay,
    isrc: null,

    genres: {
      primary: primaryGenre,
      secondary: null,
      tertiary: null
    },

    moods,
    description_html: song.description_html || null,
    lyrics_html: ov.lyrics_html || null,
    lyrics_excerpt: null,
    context_title: ov.extra_title || null,
    context_html: ov.extra_html || null,

    audio: {
      preview_mp3: null,
      full_mp3: null
    },

    video: {
      youtube_id: song.youtube_id || song.youtube_metadata?.youtube_id || null,
      thumbnail: song.thumbnail || null
    },

    artwork: {
      cover: null,
      banner: null,
      gallery: []
    },

    links: {
      spotify: null,
      apple_music: null,
      youtube_music: null,
      amazon_music: null,
      tidal: null
    },

    playlists,

    credits: {
      producers: [],
      writers: [],
      mixers: [],
      mastering_engineers: [],
      musicians: [],
      engineers: []
    },

    seo: {
      title: `${cleanTitle} - ${artist.artist_name}`,
      description:
        ov.order && ov.order > 0
          ? `Track ${ov.order} - ${cleanTitle}`
          : cleanTitle,
      keywords: [
        cleanTitle,
        artist.artist_name
      ]
    },

    internal: {
      notes: null,
      priority: null
    }
  };
});

// ---------------------------------------------------------
// 3. Write final music.yml in SOR schema
// ---------------------------------------------------------

writeYAML("../_data/music.yml", { tracks });

console.log("✅ music.yml generated in SOR schema.");
