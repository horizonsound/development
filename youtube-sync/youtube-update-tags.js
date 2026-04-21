// youtube-update-tags.js (CLEAN LOGGING VERSION)
import { google } from "googleapis";

export async function updateYoutubeTags(videoId, tags) {
  console.log(`  → Updating YouTube tags for ${videoId}`);
  console.log(`    Applying: ${JSON.stringify(tags)}`);

  try {
    // DEBUG (commented out)
    // console.log("  [YouTube] Creating OAuth2 client...");

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    });

    const youtube = google.youtube({
      version: "v3",
      auth: oauth2Client
    });

    // DEBUG
    // console.log("  [YouTube] Fetching existing snippet...");

    const existing = await youtube.videos.list({
      part: "snippet",
      id: videoId
    });

    if (!existing.data.items || existing.data.items.length === 0) {
      throw new Error("Video not found or no snippet returned.");
    }

    const snippet = existing.data.items[0].snippet;

    // Apply new tags
    snippet.tags = tags;

    // DEBUG
    // console.log("  [YouTube] Sending full snippet update...");

    await youtube.videos.update({
      part: "snippet",
      requestBody: {
        id: videoId,
        snippet
      }
    });

    console.log(`    ✓ Update successful`);

  } catch (err) {
    console.error(`    ✗ ERROR updating ${videoId}`);
    console.error(`      ${err.message}`);
    throw err;
  }
}

export async function fetchYoutubeMetadata(videoId) {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.REDIRECT_URI
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    });

    const youtube = google.youtube({
      version: "v3",
      auth: oauth2Client
    });

    const res = await youtube.videos.list({
      part: ["snippet"],
      id: videoId
    });

    if (!res.data.items || res.data.items.length === 0) {
      return null;
    }

    const snippet = res.data.items[0].snippet || {};

    return {
      tags: snippet.tags || []
    };

  } catch (err) {
    console.error(`  ERROR fetching metadata for ${videoId}: ${err.message}`);
    return null;
  }
}
