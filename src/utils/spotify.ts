import { spotifyApi } from "./apiClient";
import axios from "axios";
import {
  WebPlaybackPlayer,
  WebPlaybackError,
  SpotifyPlaybackState,
  SpotifyPlaylistsResponse,
  SpotifyNewReleasesResponse,
  SpotifyPagingObject,
  SpotifyAlbum,
  SpotifyPlaylistDetails,
  SpotifyAlbumDetails,
  SpotifySavedTrack,
} from "./spotify.types";

// Constants
const CLIENT_ID =
  import.meta.env.VITE_CLIENT_ID || "9cb0388b445a454fb6d917333f4705f6";
const CLIENT_SECRET =
  import.meta.env.VITE_CLIENT_SECRET || "11927441af564be5b45888ba20aa3113";
const isDev = import.meta.env.DEV || window.location.hostname === "localhost";
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
  "user-library-read",
  "streaming",
];

// Player state
let player: WebPlaybackPlayer | null = null;
let deviceId: string | null = null;
let deviceReadyPromise: Promise<string | null> | null = null;

// SDK Utilities
const isSDKLoaded = (): boolean => !!window.Spotify;

const loadSpotifySDK = (): Promise<void> => {
  if (isSDKLoaded()) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    script.onerror = reject;
    document.body.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = resolve;
  });
};

// Player initialization
export const initializePlayer = async (
  playerName = "Statisfy Player"
): Promise<WebPlaybackPlayer | null> => {
  // Return existing player if available
  if (player && deviceId) return player;

  if (!localStorage.getItem("spotify_access_token")) {
    console.error("No access token available");
    return null;
  }

  // Return existing initialization promise if in progress
  if (deviceReadyPromise) {
    await deviceReadyPromise;
    return player;
  }

  try {
    await loadSpotifySDK();

    // Create promise that resolves when device ID is available
    deviceReadyPromise = new Promise((resolve) => {
      try {
        // Create player instance
        player = new window.Spotify.Player({
          name: playerName,
          getOAuthToken: (cb: (token: string) => void) =>
            cb(localStorage.getItem("spotify_access_token") || ""),
          volume: 0.5,
        }) as WebPlaybackPlayer;

        // Add event listeners for player errors
        const errorEvents = [
          "initialization_error",
          "authentication_error",
          "account_error",
        ];
        errorEvents.forEach((event) => {
          player!.addListener(event, ({ message }: WebPlaybackError) => {
            console.error(`Spotify Player ${event}:`, message);
            resolve(null);
          });
        });

        player.addListener(
          "playback_error",
          ({ message }: WebPlaybackError) => {
            console.error("Failed to perform playback:", message);
          }
        );

        // Device ready/not ready
        player.addListener("ready", ({ device_id }) => {
          deviceId = device_id;
          resolve(device_id);
        });

        player.addListener("not_ready", ({ device_id }) => {
          deviceId = null;
          console.log("Device ID is not ready:", device_id);
        });

        // Connect to player
        player
          .connect()
          .then((success) => {
            if (!success) {
              console.error("Failed to connect to Spotify player");
              resolve(null);
            }
          })
          .catch((error) => {
            console.error("Error connecting to player:", error);
            resolve(null);
          });
      } catch (error) {
        console.error("Error setting up player:", error);
        resolve(null);
      }
    });

    // Wait for device ID with timeout
    const deviceIdResult = await Promise.race([
      deviceReadyPromise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 15000)), // 15s timeout
    ]);

    deviceReadyPromise = null;
    if (!deviceIdResult) return null;

    return player;
  } catch (error) {
    console.error("Error initializing Spotify player:", error);
    deviceReadyPromise = null;
    return null;
  }
};

// Player state getters
export const getPlayer = (): WebPlaybackPlayer | null => player;
export const getDeviceId = (): string | null => deviceId;

// Playback control functions
export const playOnThisDevice = async (uri?: string): Promise<boolean> => {
  if (!deviceId) return false;

  try {
    const body: any = { device_id: deviceId };

    if (uri) {
      if (uri.includes("track")) {
        body.uris = [uri];
      } else {
        body.context_uri = uri;
      }
    }

    const result = await spotifyApi.put("/me/player/play", body);
    return result !== null;
  } catch (error) {
    console.error("Error playing on this device:", error);
    return false;
  }
};

export const transferPlaybackToThisDevice = async (): Promise<boolean> => {
  if (!deviceId) return false;

  try {
    const result = await spotifyApi.put("/me/player", {
      device_ids: [deviceId],
      play: true,
    });
    return result !== null;
  } catch (error) {
    console.error("Error transferring playback:", error);
    return false;
  }
};

export const ensureActiveDevice = async (): Promise<boolean> => {
  if (!deviceId) return false;

  try {
    // Try to transfer playback to this device
    const transferred = await transferPlaybackToThisDevice();

    if (!transferred) {
      // Try playing last track as fallback
      try {
        const recentlyPlayed = await spotifyApi.get<{
          items: Array<{
            track: { uri: string };
          }>;
        }>("/me/player/recently-played?limit=1");

        if (recentlyPlayed?.items && recentlyPlayed.items.length > 0) {
          const track = recentlyPlayed.items[0].track;
          return await playOnThisDevice(track.uri);
        }
      } catch (err) {
        console.error("Error trying to play fallback track:", err);
      }
    }

    return transferred;
  } catch (err) {
    console.error("Error ensuring active device:", err);
    return false;
  }
};

// Authentication functions
export const generateRandomString = (length: number) => {
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array(length)
    .fill(0)
    .map(() => possible.charAt(Math.floor(Math.random() * possible.length)))
    .join("");
};

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

export const getAccessToken = async (code: string): Promise<string | null> => {
  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + btoa(`${CLIENT_ID}:${CLIENT_SECRET}`),
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: REDIRECT_URI,
      }).toString(),
    });

    if (!response.ok) throw new Error("Failed to get access token");

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

// Playback API functions
export const getCurrentPlayback =
  async (): Promise<SpotifyPlaybackState | null> => {
    return await spotifyApi.get<SpotifyPlaybackState>("/me/player");
  };

export const togglePlayback = async (playing: boolean) => {
  const result = await spotifyApi.put(
    `/me/player/${playing ? "pause" : "play"}`
  );
  return result !== null;
};

export const skipToNext = async () => {
  const result = await spotifyApi.post("/me/player/next");
  return result !== null;
};

export const skipToPrevious = async () => {
  const result = await spotifyApi.post("/me/player/previous");
  return result !== null;
};

export const setVolume = async (volumePercent: number) => {
  const result = await spotifyApi.put(
    `/me/player/volume?volume_percent=${Math.round(volumePercent)}`
  );
  return result !== null;
};

export const playTrack = async (uri: string) => {
  const currentDeviceId = deviceId;
  if (!currentDeviceId) return false;

  try {
    const result = await spotifyApi.put("/me/player/play", {
      uris: [uri],
      device_id: currentDeviceId,
    });
    return result !== null;
  } catch (error) {
    // If device is not active, try to activate it and retry
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      const transferred = await transferPlaybackToThisDevice();
      if (transferred) {
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for transfer

        const retryResult = await spotifyApi.put("/me/player/play", {
          uris: [uri],
          device_id: currentDeviceId,
        });
        return retryResult !== null;
      }
    }
    console.error("Error playing track:", error);
    return false;
  }
};

// Content retrieval functions
export const getUserPlaylists = async (
  limit = 20,
  offset = 0
): Promise<SpotifyPlaylistsResponse | null> => {
  const cacheTime = 5 * 60 * 1000; // 5 minutes
  const data = await spotifyApi.get<SpotifyPlaylistsResponse>(
    `/me/playlists?limit=${limit}&offset=${offset}`,
    undefined,
    cacheTime
  );

  return data && data.items ? data : null;
};

export const getPlaylistDetails = async (
  playlistId: string
): Promise<SpotifyPlaylistDetails | null> => {
  try {
    const cacheTime = 5 * 60 * 1000; // 5 minutes cache
    const playlist = await spotifyApi.get<SpotifyPlaylistDetails>(
      `/playlists/${playlistId}`,
      undefined,
      cacheTime
    );
    return playlist;
  } catch (error) {
    console.error("Error fetching playlist details:", error);
    return null;
  }
};

export const getAlbumDetails = async (
  albumId: string
): Promise<SpotifyAlbumDetails | null> => {
  try {
    const cacheTime = 5 * 60 * 1000; // 5 minutes cache
    const album = await spotifyApi.get<SpotifyAlbumDetails>(
      `/albums/${albumId}`,
      undefined,
      cacheTime
    );
    return album;
  } catch (error) {
    console.error("Error fetching album details:", error);
    return null;
  }
};

export const playPlaylist = async (playlistUri: string) => {
  const currentDeviceId = deviceId;
  if (!currentDeviceId) return false;

  try {
    const result = await spotifyApi.put("/me/player/play", {
      context_uri: playlistUri,
      device_id: currentDeviceId,
    });
    return result !== null;
  } catch (error) {
    // If device is not active, try to activate it and retry
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      const transferred = await transferPlaybackToThisDevice();
      if (transferred) {
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for transfer

        const retryResult = await spotifyApi.put("/me/player/play", {
          context_uri: playlistUri,
          device_id: currentDeviceId,
        });
        return retryResult !== null;
      }
    }
    return false;
  }
};

export const playAlbum = async (albumUri: string) => {
  // Since playback logic is the same, reuse the playlist function
  return playPlaylist(albumUri);
};

export const getNewReleases = async (
  limit = 20,
  offset = 0
): Promise<SpotifyPagingObject<SpotifyAlbum> | null> => {
  const cacheTime = 60 * 60 * 1000; // 1 hour
  const data = await spotifyApi.get<SpotifyNewReleasesResponse>(
    `/browse/new-releases?limit=${limit}&offset=${offset}`,
    undefined,
    cacheTime
  );

  return data && data.albums ? data.albums : null;
};

// Function to get user's saved tracks (liked songs)
export const getLikedSongs = async (
  limit = 50,
  offset = 0
): Promise<SpotifyPagingObject<SpotifySavedTrack> | null> => {
  const cacheTime = 5 * 60 * 1000; // 5 minutes
  const data = await spotifyApi.get<SpotifyPagingObject<SpotifySavedTrack>>(
    `/me/tracks?limit=${limit}&offset=${offset}`,
    undefined,
    cacheTime
  );

  return data && data.items ? data : null;
};
