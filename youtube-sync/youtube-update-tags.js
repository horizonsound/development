// scripts/youtube-update-tags.js
import { google } from "googleapis";

export async function updateYoutubeTags(videoId, tags) {
  const youtube = google.youtube("v3");

  await youtube.videos.update({
    part: "snippet",
    requestBody: {
      id: videoId,
      snippet: {
        tags
      }
    }
  });

  console.log(`Updated YouTube tags for ${videoId}`);
}
