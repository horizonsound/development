/**
 * -------------------------------------------------------------
 *  YOUTUBE → METADATA MIRROR (READ-ONLY, APPEND-ONLY)
 * -------------------------------------------------------------
 *
 *  PURPOSE:
 *    Fetch all YouTube videos and playlists from the Horizon Sound
 *    channel and write a canonical, read-only metadata mirror file:
 *
 *      • _data/youtube_metadata.yml
 *
 *    This file is NOT the System of Record. It is a mirror of
 *    YouTube’s current state for reference, analytics, and debugging.
 *
 *    It must:
 *      • Never generate tags
 *      • Never modify SOR files
 *      • Never download thumbnails
 *      • Never touch overrides or playlist pages
 *
 * -------------------------------------------------------------
 */

import fs from "fs";
import path from "path";
import yaml from "js-yaml";

import {
  fetchAllVideos,
  fetchPlaylistsWithMembership
} from "./fetch-youtube-metadata.js";

/* -------------------------------------------------------------
   CONSTANTS & PATHS
------------------------------------------------------------- */

const DATA_DIR = "./_data";
const METADATA_PATH = path.join(DATA_DIR, "youtube_metadata.yml");

/* -------------------------------------------------------------
   FILESYSTEM HELPERS
------------------------------------------------------------- */

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function writeYaml(filepath, data) {
  ensureDir(path.dirname(filepath));
  const yamlStr = yaml.dump(data, {
    lineWidth: -1,
    noRefs: true,
    sortKeys: true
  });
  fs.writeFileSync(filepath, yamlStr, "utf8");
}

/* -------------------------------------------------------------
   NORMALIZATION HELPERS
------------------------------------------------------------- */

function normalizeVideo(video) {
  const ym = video.youtube_metadata || {};

  return {
    youtube_id: video.id,
    slug: video.slug || null,
    title: video.title || "",
    description: ym.description || "",
    tags: ym.tags || [],
    playlists: video.playlists || [],

    published_at: video.publishedAt || null,
    scheduled_at: video.scheduledAt || null,

    channel_id: ym.channel_id || null,
    channel_title: ym.channel_title || null,
    category_id: ym.category_id || null,

    duration: ym.duration || null,
    definition: ym.definition || null,
    dimension: ym.dimension || null,
    caption: ym.caption || null,
    licensed_content: ym.licensed_content || false,
    region_allowed: ym.region_allowed || [],
    region_blocked: ym.region_blocked || [],
    content_rating: ym.content_rating || {},

    statistics: ym.statistics || {
      view_count: 0,
      like_count: 0,
      favorite_count: 0,
      comment_count: 0
    },

    made_for_kids: ym.made_for_kids || false,
    self_declared_made_for_kids: ym.self_declared_made_for_kids || false,
    topic_categories: ym.topic_categories || [],

    privacy_status: video.privacyStatus || null,
    upload_status: video.uploadStatus || null,
    publish_at: video.publishAt || null,
    license: ym.license || "",
    embeddable: ym.embeddable ?? true,
    public_stats_viewable: ym.public_stats_viewable ?? true
  };
}

function normalizePlaylist(pl) {
  return {
    playlist_id: pl.id,
    slug: pl.slug || null,
    title: pl.title || "",
    description: pl.description || "",
    thumbnail: pl.thumbnail || null,

    published_at: pl.publishedAt || null,
    channel_id: pl.channel_id || null,
    channel_title: pl.channel_title || null,

    video_ids: pl.videoIds || []
  };
}

/* -------------------------------------------------------------
   MAIN MIRROR PIPELINE
------------------------------------------------------------- */

async function generateMirror() {
  console.log("=== Horizon Sound: YouTube Metadata Mirror ===");

  console.log("Fetching videos...");
  const videos = await fetchAllVideos();

  if (!videos || videos.length === 0) {
    console.error("ERROR: No videos returned from YouTube. Aborting.");
    process.exit(1);
  }

  console.log(`VIDEO COUNT: ${videos.length}`);

  console.log("Fetching playlists + membership...");
  const playlists = await fetchPlaylistsWithMembership();

  if (!playlists) {
    console.error("ERROR: fetchPlaylistsWithMembership() returned undefined.");
    process.exit(1);
  }

  console.log(`PLAYLIST COUNT: ${playlists.length}`);

  // Attach playlist membership to videos (if not already attached)
  const slugLookup = {};
  for (const v of videos) {
    slugLookup[v.id] = v.slug;
  }

  const playlistMap = {};
  playlists.forEach(pl => {
    pl.videoIds.forEach(id => {
      const slug = slugLookup[id];
      if (!slug) {
        console.warn(`WARNING: Playlist ${pl.title} references unknown video ID: ${id}`);
        return;
      }
      if (!playlistMap[slug]) playlistMap[slug] = [];
      playlistMap[slug].push(pl.slug);
    });
  });

  videos.forEach(video => {
    video.playlists = playlistMap[video.slug] || [];
  });

  console.log("Normalizing videos...");
  const normalizedVideos = videos.map(normalizeVideo);

  console.log("Normalizing playlists...");
  const normalizedPlaylists = playlists.map(normalizePlaylist);

  console.log("Writing youtube_metadata.yml...");
  writeYaml(METADATA_PATH, {
    videos: normalizedVideos,
    playlists: normalizedPlaylists
  });

  console.log("\nSUMMARY:");
  console.log(`  Videos mirrored:    ${normalizedVideos.length}`);
  console.log(`  Playlists mirrored: ${normalizedPlaylists.length}`);
  console.log("  Metadata file:      _data/youtube_metadata.yml");
  console.log("\nDone.");
}

/* -------------------------------------------------------------
   EXECUTE
------------------------------------------------------------- */

generateMirror().catch(err => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
