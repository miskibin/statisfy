import { spotifyApi, SpotifyPlaybackState } from "./apiClient";

// Spotify API types
interface SpotifyPlaylistItem {
  id: string;
  name: string;
  description: string;
  images: { url: string; height: number; width: number }[];
  uri: string;
  tracks: {
    total: number;
  };
}

interface SpotifyPagingObject<T> {
  href: string;
  items: T[];
  limit: number;
  next: string | null;
  offset: number;
  previous: string | null;
  total: number;
}

interface SpotifyPlaylistsResponse {
  items: SpotifyPlaylistItem[];
  limit: number;
  offset: number;
  total: number;
}

interface SpotifyAlbum {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  images: { url: string; height: number; width: number }[];
  release_date: string;
  uri: string;
}

interface SpotifyNewReleasesResponse {
  albums: SpotifyPagingObject<SpotifyAlbum>;
}

const CLIENT_ID =
  import.meta.env.VITE_CLIENT_ID || "9cb0388b445a454fb6d917333f4705f6";

// Detect if we're running in development or production
const isDev = import.meta.env.DEV || window.location.hostname === "localhost";

// Use appropriate redirect URI based on environment
const REDIRECT_URI = isDev
  ? "http://localhost:1420/callback"
  : "statisfy://callback";

const SCOPES = [
  "user-read-private",
  "user-read-email",
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-recently-played",
  "user-top-read",
  "playlist-read-private",
  "playlist-read-collaborative",
  "streaming",
];

// Generate a random string for state verification
export const generateRandomString = (length: number) => {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

// Login to Spotify
export const loginToSpotify = () => {
  const state = generateRandomString(16);
  localStorage.setItem("spotify_auth_state", state);

  const queryParams = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    scope: SCOPES.join(" "),
    redirect_uri: REDIRECT_URI,
    state: state,
  });

  window.location.href = `https://accounts.spotify.com/authorize?${queryParams.toString()}`;
};

// Exchange authorization code for access token
export const getAccessToken = async (code: string): Promise<string | null> => {
  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          btoa(
            `${CLIENT_ID}:${
              import.meta.env.VITE_CLIENT_SECRET ||
              "11927441af564be5b45888ba20aa3113"
            }`
          ),
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: REDIRECT_URI,
      }).toString(),
    });

    if (!response.ok) {
      throw new Error("Failed to get access token");
    }

    const data = await response.json();
    localStorage.setItem("spotify_access_token", data.access_token);
    localStorage.setItem("spotify_refresh_token", data.refresh_token);
    localStorage.setItem(
      "spotify_token_expiry",
      (Date.now() + data.expires_in * 1000).toString()
    );

    return data.access_token;
  } catch (error) {
    console.error("Error getting access token:", error);
    return null;
  }
};

// Get current playback state
export const getCurrentPlayback =
  async (): Promise<SpotifyPlaybackState | null> => {
    return await spotifyApi.get<SpotifyPlaybackState>("/me/player");
  };

// Play/pause track
export const togglePlayback = async (playing: boolean) => {
  const result = await spotifyApi.put(
    `/me/player/${playing ? "pause" : "play"}`
  );
  return result !== null;
};

// Skip to next track
export const skipToNext = async () => {
  const result = await spotifyApi.post("/me/player/next");
  return result !== null;
};

// Skip to previous track
export const skipToPrevious = async () => {
  const result = await spotifyApi.post("/me/player/previous");
  return result !== null;
};

// Set volume
export const setVolume = async (volumePercent: number) => {
  const result = await spotifyApi.put(
    `/me/player/volume?volume_percent=${Math.round(volumePercent)}`
  );
  return result !== null;
};

// Play track
export const playTrack = async (uri: string) => {
  const result = await spotifyApi.put("/me/player/play", {
    uris: [uri],
  });
  return result !== null;
};

// Get current user's playlists - cache for 5 minutes
export const getUserPlaylists = async (
  limit = 20,
  offset = 0
): Promise<SpotifyPlaylistsResponse | null> => {
  console.log("Fetching user playlists...");
  const cacheTime = 5 * 60 * 1000; // 5 minutes
  const data = await spotifyApi.get<SpotifyPlaylistsResponse>(
    `/me/playlists?limit=${limit}&offset=${offset}`,
    undefined,
    cacheTime
  );

  if (data && data.items) {
    console.log(`Received ${data.items.length} user playlists`);
    return data;
  }

  return null;
};

// Play a playlist
export const playPlaylist = async (playlistUri: string) => {
  const result = await spotifyApi.put("/me/player/play", {
    context_uri: playlistUri,
  });
  return result !== null;
};

// Get new releases - cache for 1 hour
export const getNewReleases = async (
  limit = 20,
  offset = 0
): Promise<SpotifyPagingObject<SpotifyAlbum> | null> => {
  console.log("Fetching new releases...");
  const cacheTime = 60 * 60 * 1000; // 1 hour
  const data = await spotifyApi.get<SpotifyNewReleasesResponse>(
    `/browse/new-releases?limit=${limit}&offset=${offset}`,
    undefined,
    cacheTime
  );

  if (data && data.albums) {
    console.log(`Received ${data.albums.items.length} new releases`);
    return data.albums;
  }

  return null;
};
