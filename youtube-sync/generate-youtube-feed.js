import fs from "fs";
import path from "path";
import yaml from "js-yaml";

import {
  fetchAllVideos,
  fetchPlaylistMembership,
  processPlaylistThumbnails
} from "./fetch-youtube-metadata.js";

/* -------------------------------------------------------
   DATA MODEL OVERVIEW (FINAL, LOCKED)
   -------------------------------------------------------
   SONGS:
     - song_id = slug (canonical ID)
     - youtube_id = raw YouTube video ID
     - url = /music/<song_id>/
     - thumbnail = /assets/thumbnails/<song_id>.jpeg
     - videostatus = "public" | "private" | "unlisted" | "scheduled"
     - playlists = array of YouTube playlist IDs
     - metadata = raw YouTube fields (no transformations)

   PLAYLISTS:
     - playlist_id = YouTube playlist ID (canonical)
     - slug = URL identity
     - title, description, published_at
     - thumbnail = /assets/thumbnails/playlist-<slug>.jpeg
     - song_ids = array of YouTube video IDs (raw)

   OVERRIDES:
     - Music overrides keyed by song_id
     - Playlist overrides keyed by slug
------------------------------------------------------- */

/* -------------------------------------------------------
   PATHS
------------------------------------------------------- */
const DATA_DIR = "./_data";
const THUMBNAIL_DIR = "./assets/thumbnails";

const VIDEO_FEED_PATH = path.join(DATA_DIR, "youtube_feed.yml");
const PLAYLIST_FEED_PATH = path.join(DATA_DIR, "youtube_playlists.yml");

/* -------------------------------------------------------
   ENSURE DIRECTORIES
------------------------------------------------------- */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/* -------------------------------------------------------
   WRITE YAML
------------------------------------------------------- */
function writeYaml(filepath, data) {
  ensureDir(path.dirname(filepath));
  fs.writeFileSync(filepath, yaml.dump(data), "utf8");
}

/* -------------------------------------------------------
   NORMALIZE VIDEO OBJECT (SONG MODEL)
------------------------------------------------------- */
function normalizeVideo(video) {
  // song_id = slug (canonical ID)
  const song_id = video.slug;

  return {
    song_id,
    youtube_id: video.id,
    title: video.title,

    // URL + thumbnail use song_id
    url: `/music/${song_id}/`,
    thumbnail: `/assets/thumbnails/${song_id}.jpeg`,

    // videostatus is already lowercase from normalizeStatus()
    videostatus: video.status,

    // playlist membership = array of YouTube playlist IDs
    playlists: video.playlists || [],

    // raw metadata (no transformations)
    metadata: {
      published_at: video.publishedAt || null,
      scheduled_at: video.scheduledAt || null,
      channel_id: video.metadata?.channel_id || null,
      channel_title: video.metadata?.channel_title || null,
      category_id: video.metadata?.category_id || null,
      tags: video.metadata?.tags || [],
      duration: video.metadata?.duration || null,
      definition: video.metadata?.definition || null,
      region_allowed: video.metadata?.region_allowed || [],
      region_blocked: video.metadata?.region_blocked || [],
      content_rating: video.metadata?.content_rating || "",
      statistics: video.metadata?.statistics || {
        view_count: 0,
        like_count: 0,
        favorite_count: 0,
        comment_count: 0
      },
      made_for_kids: video.metadata?.made_for_kids || false,
      self_declared_made_for_kids: video.metadata?.self_declared_made_for_kids || false,
      topic_categories: video.metadata?.topic_categories || [],

      // NEW: store raw YouTube status fields for transparency
      privacy_status: video.privacyStatus || null,
      upload_status: video.uploadStatus || null,
      publish_at: video.publishAt || null
    }
  };
}

/* -------------------------------------------------------
   MAIN GENERATOR
------------------------------------------------------- */
async function generate() {
  console.log("Fetching videos...");
  const videos = await fetchAllVideos();

  console.log("Fetching playlists + membership...");
  const playlists = await fetchPlaylistMembership();

  console.log("Downloading playlist thumbnails...");
  await processPlaylistThumbnails(playlists, THUMBNAIL_DIR);

  /* -------------------------------------------------------
     ATTACH PLAYLIST MEMBERSHIP TO VIDEOS
     -------------------------------------------------------
     playlistMap = { youtubeVideoId: [playlistId, playlistId] }
  ------------------------------------------------------- */
  console.log("Attaching playlist membership to videos...");
  const playlistMap = {};
  playlists.forEach(pl => {
    pl.videoIds.forEach(id => {
      if (!playlistMap[id]) playlistMap[id] = [];
      playlistMap[id].push(pl.id);
    });
  });

  videos.forEach(video => {
    video.playlists = playlistMap[video.id] || [];
  });

  /* -------------------------------------------------------
     NORMALIZE VIDEOS INTO FINAL SONG MODEL
  ------------------------------------------------------- */
  console.log("Normalizing videos...");
  const normalizedVideos = videos.map(normalizeVideo);

  /* -------------------------------------------------------
     WRITE SONG FEED
  ------------------------------------------------------- */
  console.log("Writing youtube_feed.yml...");
  writeYaml(VIDEO_FEED_PATH, { songs: normalizedVideos });

  /* -------------------------------------------------------
     WRITE PLAYLIST FEED
     -------------------------------------------------------
     - Wrap in top-level "playlists:"
     - Keep playlist_id (YouTube ID)
     - Keep slug
     - Keep YouTube video IDs in song_ids
  ------------------------------------------------------- */
  console.log("Writing youtube_playlists.yml...");
  writeYaml(
    PLAYLIST_FEED_PATH,
    {
      playlists: playlists.map(pl => ({
        playlist_id: pl.id,
        title: pl.title,
        slug: pl.slug,
        description: pl.description,
        published_at: pl.publishedAt,
        thumbnail: pl.thumbnail,
        song_ids: pl.videoIds // RAW YouTube IDs (correct)
      }))
    }
  );

  console.log("Done.");
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
