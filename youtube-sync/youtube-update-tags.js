import { google } from "googleapis";

export async function updateYoutubeTags(videoId, tags) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.YOUTUBE_REFRESH_TOKEN
  });

  const youtube = google.youtube({
    version: "v3",
    auth: oauth2Client
  });

  await youtube.videos.update({
    part: "snippet",
    requestBody: {
      id: videoId,
      snippet: { tags }
    }
  });

  console.log(`Updated YouTube tags for ${videoId}`);
}
