import { spotifyApi, SpotifyPlaybackState } from "./apiClient";
import axios from "axios";

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

// Web Playback SDK types
export interface WebPlaybackPlayer {
  device_id: string;
  connect: () => Promise<boolean>;
  disconnect: () => void;
  getCurrentState: () => Promise<WebPlaybackState | null>;
  setName: (name: string) => Promise<void>;
  getVolume: () => Promise<number>;
  setVolume: (volume: number) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  togglePlay: () => Promise<void>;
  seekTo: (position_ms: number) => Promise<void>;
  previousTrack: () => Promise<void>;
  nextTrack: () => Promise<void>;
  addListener: (event: string, callback: (state: any) => void) => void;
  removeListener: (event: string, callback?: (state: any) => void) => void;
}

export interface WebPlaybackTrack {
  uri: string;
  id: string;
  type: string;
  media_type: string;
  name: string;
  is_playable: boolean;
  album: {
    uri: string;
    name: string;
    images: { url: string }[];
  };
  artists: { uri: string; name: string }[];
}

export interface WebPlaybackState {
  context: {
    uri: string;
    metadata: any;
  };
  disallows: {
    pausing: boolean;
    peeking_next: boolean;
    peeking_prev: boolean;
    resuming: boolean;
    seeking: boolean;
    skipping_next: boolean;
    skipping_prev: boolean;
  };
  track_window: {
    current_track: WebPlaybackTrack;
    previous_tracks: WebPlaybackTrack[];
    next_tracks: WebPlaybackTrack[];
  };
  paused: boolean;
  position: number;
  duration: number;
  repeat_mode: number;
  shuffle: boolean;
  timestamp: number;
}

// Spotify player instance
let player: WebPlaybackPlayer | null = null;
let deviceId: string | null = null;
let playerConnected = false;
let deviceReadyPromise: Promise<string | null> | null = null;

// Check if the SDK script is already loaded
const isSDKLoaded = (): boolean => {
  return !!window.Spotify;
};

// Load the Spotify Web Playback SDK
const loadSpotifySDK = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // If already loaded, resolve immediately
    if (isSDKLoaded()) {
      resolve();
      return;
    }

    console.log("Loading Spotify SDK script...");
    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;

    // Setup event handlers
    script.onload = () => {
      console.log("SDK script loaded");
    };
    script.onerror = (error) => {
      console.error("Error loading SDK script:", error);
      reject(error);
    };

    // Add to document
    document.body.appendChild(script);

    // Register player callback
    window.onSpotifyWebPlaybackSDKReady = () => {
      console.log("Spotify Web Playback SDK Ready");
      resolve();
    };
  });
};

// Initialize the Spotify Web Player
export const initializePlayer = async (
  playerName = "Statisfy Player"
): Promise<WebPlaybackPlayer | null> => {
  // Check if we already have a player instance
  if (player && deviceId) {
    console.log("Player already initialized with device ID:", deviceId);
    return player;
  }

  if (!localStorage.getItem("spotify_access_token")) {
    console.error("No access token available");
    return null;
  }

  // If we're already waiting for device ready, return that promise
  if (deviceReadyPromise) {
    console.log("Already initializing player, waiting for result...");
    await deviceReadyPromise;
    return player;
  }

  try {
    console.log("Starting player initialization...");

    // Load the SDK if not already loaded
    await loadSpotifySDK();
    console.log("SDK loaded successfully");

    // Create deviceReadyPromise that will resolve when a device ID is available
    deviceReadyPromise = new Promise((resolve) => {
      try {
        console.log("Creating Spotify player instance...");

        // Create the player
        player = new window.Spotify.Player({
          name: playerName,
          getOAuthToken: (cb) => {
            const token = localStorage.getItem("spotify_access_token");
            console.log("Providing token to player");
            cb(token || "");
          },
          volume: 0.5,
        }) as WebPlaybackPlayer;

        // Error handling
        player.addListener("initialization_error", ({ message }) => {
          console.error("Player initialization error:", message);
          resolve(null);
        });

        player.addListener("authentication_error", ({ message }) => {
          console.error("Player authentication error:", message);
          resolve(null);
        });

        player.addListener("account_error", ({ message }) => {
          console.error("Player account error:", message);
          resolve(null);
        });

        player.addListener("playback_error", ({ message }) => {
          console.error("Failed to perform playback:", message);
        });

        // Device ID handling
        player.addListener("ready", ({ device_id }) => {
          console.log("Player ready with Device ID:", device_id);
          deviceId = device_id;
          playerConnected = true;
          resolve(device_id);
        });

        player.addListener("not_ready", ({ device_id }) => {
          console.log("Device ID is not ready:", device_id);
          deviceId = null;
        });

        // Connect to the player
        console.log("Attempting to connect to Spotify player...");
        player
          .connect()
          .then((success) => {
            console.log("Player connection result:", success);
            if (!success) {
              console.error("Failed to connect to Spotify player");
              resolve(null);
            }
            // We'll wait for the ready event to resolve the promise
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

    // Wait for the device ID (with a timeout)
    const deviceIdResult = await Promise.race([
      deviceReadyPromise,
      new Promise<null>((resolve) =>
        setTimeout(() => {
          console.error("Timed out waiting for device ID");
          resolve(null);
        }, 15000)
      ), // 15 second timeout
    ]);

    deviceReadyPromise = null;

    if (!deviceIdResult) {
      console.error("Failed to get device ID");
      return null;
    }

    console.log(
      "Player initialization complete with device ID:",
      deviceIdResult
    );
    return player;
  } catch (error) {
    console.error("Error initializing Spotify player:", error);
    deviceReadyPromise = null;
    return null;
  }
};

// Get the current Spotify player
export const getPlayer = (): WebPlaybackPlayer | null => {
  return player;
};

// Get the device ID for the current player
export const getDeviceId = (): string | null => {
  return deviceId;
};

// Play on this device
export const playOnThisDevice = async (uri?: string): Promise<boolean> => {
  if (!deviceId) {
    console.error("Cannot play: No device ID available");
    return false;
  }

  try {
    console.log(
      "Playing on device:",
      deviceId,
      uri ? `with URI: ${uri}` : "with current context"
    );

    const body: any = { device_id: deviceId };

    // Add URI if provided
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

// Transfer playback to this device
export const transferPlaybackToThisDevice = async (): Promise<boolean> => {
  if (!deviceId) {
    console.error("Cannot transfer: No device ID available");
    return false;
  }

  try {
    console.log("Transferring playback to device:", deviceId);

    const result = await spotifyApi.put("/me/player", {
      device_ids: [deviceId],
      play: true,
    });

    console.log("Transfer playback result:", result !== null);
    return result !== null;
  } catch (error) {
    console.error("Error transferring playback:", error);
    return false;
  }
};

// Ensure device is active
export const ensureActiveDevice = async (): Promise<boolean> => {
  if (!deviceId) {
    console.error("Cannot ensure active device: No device ID available");
    return false;
  }

  try {
    console.log("Ensuring device is active:", deviceId);

    // Try to transfer playback to this device
    const transferred = await transferPlaybackToThisDevice();

    if (!transferred) {
      console.log("Transfer failed, trying to play last track");
      // If transfer fails, try to start playback directly
      try {
        // Get recently played tracks as fallback
        const recentlyPlayed = await spotifyApi.get(
          "/me/player/recently-played?limit=1"
        );

        if (recentlyPlayed?.items?.length > 0) {
          const track = recentlyPlayed.items[0].track;
          console.log("Playing recently played track:", track.name);

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
  // Get current device ID from the SDK
  const currentDeviceId = deviceId;

  if (!currentDeviceId) {
    console.error("No active device ID available");
    return false;
  }

  try {
    const result = await spotifyApi.put("/me/player/play", {
      context_uri: playlistUri,
      device_id: currentDeviceId, // Explicitly specify the device ID
    });
    return result !== null;
  } catch (error) {
    console.error("Error playing playlist:", error);

    // If we get a 404, it means the device isn't active or recognized
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      // Try to activate the device first and then play
      const transferred = await transferPlaybackToThisDevice();
      if (transferred) {
        // Wait a short delay for the transfer to take effect
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Try playing again
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
