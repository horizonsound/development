// youtube-update-tags.js (FIXED VERSION)
import { google } from "googleapis";

export async function updateYoutubeTags(videoId, tags) {
  console.log(`  [YouTube] Starting update for video ${videoId}`);
  console.log(`  [YouTube] Tags to apply: ${JSON.stringify(tags)}`);

  try {
    console.log("  [YouTube] Creating OAuth2 client...");
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
      // redirectUri intentionally omitted for server-side use
    );
    console.log("  [YouTube] Using CLIENT ID:", process.env.GOOGLE_CLIENT_ID);
    console.log("  [YouTube] OAuth2 client created.");

    console.log("  [YouTube] Setting credentials...");
    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    });
    console.log("  [YouTube] Credentials set.");

    console.log("  [YouTube] Initializing YouTube API client...");
    const youtube = google.youtube({
      version: "v3",
      auth: oauth2Client
    });
    console.log("  [YouTube] YouTube API client ready.");

    // ⭐ STEP 1: Fetch existing snippet
    console.log("  [YouTube] Fetching existing video snippet...");
    const existing = await youtube.videos.list({
      part: "snippet",
      id: videoId
    });

    if (!existing.data.items || existing.data.items.length === 0) {
      throw new Error("Video not found or no snippet returned.");
    }

    const snippet = existing.data.items[0].snippet;

    console.log("  [YouTube] Existing snippet retrieved:");
    console.log(`    Title: ${snippet.title}`);
    console.log(`    Description length: ${snippet.description?.length || 0}`);
    console.log(`    Category: ${snippet.categoryId}`);

    // ⭐ STEP 2: Merge new tags into existing snippet
    snippet.tags = tags;

    // ⭐ STEP 3: Send full snippet back to YouTube
    console.log("  [YouTube] Sending full snippet update...");
    const response = await youtube.videos.update({
      part: "snippet",
      requestBody: {
        id: videoId,
        snippet
      }
    });

    console.log("  [YouTube] ✓ API call succeeded.");
    console.log(`  [YouTube] Response status: ${response.status}`);
    console.log(`  [YouTube] Response data: ${JSON.stringify(response.data)}`);

  } catch (err) {
    console.error("  [YouTube] ✗ ERROR during tag update");
    console.error("  [YouTube] Error message:", err.message);
    console.error("  [YouTube] Full error:", err);
    throw err;
  }

  console.log(`  [YouTube] Finished update for ${videoId}`);
}
