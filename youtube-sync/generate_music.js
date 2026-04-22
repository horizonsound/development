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

function slugifyTitle(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")   // remove special chars
    .trim()
    .replace(/\s+/g, "_");         // spaces → underscores
}

function normalizeArtistId(artistName, initials) {
  const base = (artistName || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");    // strip non-alphanum
  const firstTen = base.slice(0, 10);
  return `trk_${firstTen}_${initials}`;
}

// crude genre detection from playlists (you can refine later)
const GENRE_PLAYLISTS = new Set([
  "pop",
  "edm",
  "southern-rock",
  "emotional-ballads",
  "80s-rock-pop",
  // add more as you formalize them
]);

function derivePrimaryGenre(playlists = []) {
  for (const p of playlists) {
    if (GENRE_PLAYLISTS.has(p)) return p;
  }
  return null;
}

// simple moods mapping: take vibes that “make sense” by stripping emoji prefixes
function vibesToMoods(vibes = []) {
  return vibes
    .map(v => {
      if (typeof v !== "string") return null;
      // remove leading emoji + label like "🎧 Vibe: "
      return v.replace(/^[^\w]+/u, "").trim();
    })
    .filter(Boolean);
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
  // we keyed this by song_id earlier today
  artistLookup[t.song_id] = t;
});

const overrideLookup = {};
(musicOverrides.overrides || []).forEach(o => {
  overrideLookup[o.song_id] = o;
});

// ---------------------------------------------------------
// 2. Build SOR tracks
// ---------------------------------------------------------

const tracks = (youtubeFeed.songs || []).map(song => {
  const songId = song.song_id;
  const ov = overrideLookup[songId] || {};
  const artist = artistLookup[songId];

  if (!artist) {
    console.error(`❌ Missing artist mapping for song_id: ${songId}`);
    process.exit(1);
  }

  const title = ov.title || song.title;
  const subtitle = ov.subtitle || null;

  const id = normalizeArtistId(artist.artist_name, artist.initials);
  const slug = slugifyTitle(title);

  const playlists = song.playlists || [];
  const primaryGenre = derivePrimaryGenre(playlists);
  const moods = vibesToMoods(song.vibes || []);

  // -----------------------------------------------------
  // Build track object in EXACT schema
  // -----------------------------------------------------
  return {
    id,                          // "trk_" + artistName10 + "_" + initials
    slug,                        // derived from title
    title,                       // overrides.title → YouTubeFeed.title
    subtitle,                    // overrides.subtitle
    status: song.videostatus || null,
    type: null,                  // unpopulated
    track_number: ov.order || null,
    disc_number: null,
    release_id: null,

    primary_artist: artist.artist_slug,
    featuring_artists: [],       // unpopulated

    duration: null,              // spec: unpopulated at this stage
    isrc: null,

    genres: {
      primary: primaryGenre,
      secondary: null,
      tertiary: null
    },

    moods,                       // from YouTubeFeed.vibes (mapped)
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
      youtube_id: song.youtube_id || (song.youtube_metadata && song.youtube_metadata.youtube_id) || null,
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

    playlists,                   // move all that are listed

    credits: {
      producers: [],
      writers: [],
      mixers: [],
      mastering_engineers: [],
      musicians: [],
      engineers: []
    },

    seo: {
      title: `${song.title} - ${artist.artist_name}`,
      description:
        ov.order && ov.order > 0
          ? `Track ${ov.order} - ${song.title}`
          : song.title,
      keywords: [
        song.title,
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
