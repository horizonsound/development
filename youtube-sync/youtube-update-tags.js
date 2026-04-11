// youtube-update-tags.js (DIAGNOSTIC VERSION)
import { google } from "googleapis";

export async function updateYoutubeTags(videoId, tags) {
  console.log(`  [YouTube] Starting update for video ${videoId}`);
  console.log(`  [YouTube] Tags to apply: ${JSON.stringify(tags)}`);

  try {
    console.log("  [YouTube] Creating OAuth2 client...");
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
      // intentionally leaving redirectUri OUT for diagnostic
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

    console.log("  [YouTube] Sending update request to YouTube...");
    const response = await youtube.videos.update({
      part: "snippet",
      requestBody: {
        id: videoId,
        snippet: { tags }
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
