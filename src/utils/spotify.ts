import { spotifyApi } from "./apiClient";
import axios from "axios";
import {
  WebPlaybackPlayer,
  WebPlaybackError,
  WebPlaybackState,
  SpotifyPlaybackState,
  SpotifyPlaylistsResponse,
  SpotifyNewReleasesResponse,
  SpotifyPagingObject,
  SpotifyAlbum,
  SpotifyPlaylistDetails,
  SpotifyAlbumDetails,
  SpotifySavedTrack,
  SpotifyArtistDetails,
  SpotifyTopTracksResponse,
  SpotifyQueueResponse,
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

// Player state management
let player: WebPlaybackPlayer | null = null;
let deviceId: string | null = null;
let currentState: WebPlaybackState | null = null;
let playerError: string | null = null;
let progressUpdateInterval: number | null = null;
let stateObservers: Array<(state: any, error: string | null) => void> = [];

interface TrackInfo {
  name: string;
  artists: { name: string; id: string }[];
  albumArt: string;
  isPlaying: boolean;
  duration: number;
  progress: number;
  deviceVolume?: number;
}

// SDK Utilities
const loadSpotifySDK = async (): Promise<void> => {
  if (window.Spotify) return;

  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    document.body.appendChild(script);
    window.onSpotifyWebPlaybackSDKReady = resolve;
  });
};

// Get current playback state from Spotify Web API
export const getCurrentPlaybackState =
  async (): Promise<SpotifyPlaybackState | null> => {
    return await spotifyApi.get<SpotifyPlaybackState>("/me/player");
  };

// Player initialization
export const initializePlayer = async (
  playerName = "Statisfy Player"
): Promise<WebPlaybackPlayer | null> => {
  if (player && deviceId) return player;

  const accessToken = localStorage.getItem("spotify_access_token");
  if (!accessToken) return null;

  try {
    await loadSpotifySDK();

    player = new window.Spotify.Player({
      name: playerName,
      getOAuthToken: (cb: (token: string) => void) => cb(accessToken),
      volume: 0.5,
    }) as WebPlaybackPlayer;

    // Configure essential event listeners
    player.addListener(
      "initialization_error",
      ({ message }: WebPlaybackError) => {
        playerError = `Initialization error: ${message}`;
        notifyObservers();
        player = null;
      }
    );

    player.addListener(
      "authentication_error",
      ({ message }: WebPlaybackError) => {
        playerError = `Authentication error: ${message}`;
        notifyObservers();
        player = null;
      }
    );

    player.addListener("account_error", ({ message }: WebPlaybackError) => {
      playerError = `Account error: ${message}`;
      notifyObservers();
      player = null;
    });

    player.addListener("playback_error", ({ message }: WebPlaybackError) => {
      playerError = `Playback error: ${message}`;
      notifyObservers();
    });

    // Device ready/not ready
    const deviceIdPromise = new Promise<string | null>((resolve) => {
      player!.addListener("ready", ({ device_id }) => {
        deviceId = device_id;
        playerError = null;
        resolve(device_id);
      });

      player!.addListener("not_ready", ({ device_id }) => {
        deviceId = null;
        playerError = "Device not ready";
        notifyObservers();
        resolve(null);
      });
    });

    // Set up player state change listener
    player.addListener("player_state_changed", (state) => {
      if (state) {
        currentState = state;
        updateProgressTimer(state);
        playerError = null;
      } else {
        currentState = null;
      }
      notifyObservers();
    });

    // Connect player
    const connected = await player.connect();
    if (!connected) {
      playerError = "Failed to connect Spotify player";
      notifyObservers();
      return null;
    }

    // Wait for device ID with timeout
    const deviceIdResult = await Promise.race([
      deviceIdPromise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 10000)),
    ]);

    if (deviceIdResult) {
      const initialState = await player.getCurrentState();
      if (initialState) {
        currentState = initialState;
        updateProgressTimer(initialState);
      }
      await ensureActiveDevice();
    }

    notifyObservers();
    return deviceIdResult ? player : null;
  } catch (error) {
    playerError = "Error initializing player";
    notifyObservers();
    return null;
  }
};

// Update progress timer for accurate progress tracking
const updateProgressTimer = (state: WebPlaybackState) => {
  if (progressUpdateInterval) {
    window.clearInterval(progressUpdateInterval);
    progressUpdateInterval = null;
  }

  if (!state.paused) {
    let currentPosition = state.position;
    const startTime = Date.now();

    progressUpdateInterval = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      currentPosition = Math.min(state.position + elapsed, state.duration);

      if (currentState && currentPosition < state.duration) {
        currentState = {
          ...currentState,
          position: currentPosition,
        };
        notifyObservers();
      } else if (currentPosition >= state.duration) {
        window.clearInterval(progressUpdateInterval!);
        progressUpdateInterval = null;
      }
    }, 1000);
  }
};

// Convert WebPlaybackState to TrackInfo for UI
const convertStateToTrackInfo = (
  state: WebPlaybackState | null
): TrackInfo | null => {
  if (!state || !state.track_window?.current_track) return null;

  const { track_window, paused, position, duration } = state;
  const { current_track } = track_window;

  return {
    name: current_track.name,
    artists: current_track.artists.map((a) => ({
      name: a.name,
      id: a.uri.split(":")[2],
    })),
    albumArt: current_track.album.images[0]?.url || "",
    isPlaying: !paused,
    duration,
    progress: position,
  };
};

// Notify all observers of state changes
const notifyObservers = () => {
  const trackInfo = currentState ? convertStateToTrackInfo(currentState) : null;
  stateObservers.forEach((observer) => observer(trackInfo, playerError));
};

// Subscribe to player state changes
export const subscribeToPlayerState = (
  callback: (state: TrackInfo | null, error: string | null) => void
) => {
  if (!player) {
    initializePlayer().catch(() => {
      playerError = "Failed to initialize player";
      callback(null, playerError);
    });
  }

  stateObservers.push(callback);

  if (currentState || playerError) {
    const trackInfo = currentState
      ? convertStateToTrackInfo(currentState)
      : null;
    callback(trackInfo, playerError);
  }

  return () => unsubscribeFromPlayerState(callback);
};

// Unsubscribe from player state changes
export const unsubscribeFromPlayerState = (
  callback: (state: TrackInfo | null, error: string | null) => void
) => {
  stateObservers = stateObservers.filter((observer) => observer !== callback);
};

// Get current track info
export const getCurrentTrackInfo = async (): Promise<TrackInfo | null> => {
  try {
    if (player) {
      const state = await player.getCurrentState();
      if (state) {
        const trackInfo = convertStateToTrackInfo(state);
        if (trackInfo) {
          const volume = await player.getVolume();
          return { ...trackInfo, deviceVolume: Math.round(volume * 100) };
        }
      }
    }

    // Fallback to API if local player not available
    const playback = await getCurrentPlaybackState();
    if (playback && playback.item) {
      return {
        name: playback.item.name,
        artists: playback.item.artists.map((a) => ({
          name: a.name,
          id: a.id,
        })),
        albumArt: playback.item.album.images[0]?.url || "",
        isPlaying: playback.is_playing,
        duration: playback.item.duration_ms,
        progress: playback.progress_ms || 0,
        deviceVolume: playback.device?.volume_percent,
      };
    }
    return null;
  } catch {
    return null;
  }
};

// Player state getters
export const getPlayer = (): WebPlaybackPlayer | null => player;
export const getDeviceId = (): string | null => deviceId;

// Playback control functions
export const ensureActiveDevice = async (): Promise<boolean> => {
  if (!deviceId) {
    await initializePlayer();
    if (!deviceId) return false;
  }

  try {
    const transferred = await spotifyApi.put("/me/player", {
      device_ids: [deviceId],
      play: true,
    });
    return transferred !== null;
  } catch {
    return false;
  }
};

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
  } catch {
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

    if (!response.ok) return null;

    const data = await response.json();
    localStorage.setItem("spotify_access_token", data.access_token);
    localStorage.setItem("spotify_refresh_token", data.refresh_token);
    localStorage.setItem(
      "spotify_token_expiry",
      (Date.now() + data.expires_in * 1000).toString()
    );

    return data.access_token;
  } catch {
    return null;
  }
};

// Playback control functions - simplified to only use player when available
export const pausePlayback = async (): Promise<boolean> => {
  if (!player) return false;
  try {
    await player.pause();
    return true;
  } catch {
    return false;
  }
};

export const resumePlayback = async (): Promise<boolean> => {
  if (!player) return false;
  try {
    await player.resume();
    return true;
  } catch {
    return false;
  }
};

export const skipToNext = async (): Promise<boolean> => {
  if (!player) return false;
  try {
    await player.nextTrack();
    return true;
  } catch {
    return false;
  }
};

export const skipToPrevious = async (): Promise<boolean> => {
  if (!player) return false;
  try {
    await player.previousTrack();
    return true;
  } catch {
    return false;
  }
};

export const setVolume = async (volumePercent: number): Promise<boolean> => {
  if (!player) return false;
  try {
    await player.setVolume(volumePercent / 100);
    return true;
  } catch {
    return false;
  }
};

export const togglePlayback = async (playing: boolean) =>
  playing ? pausePlayback() : resumePlayback();

export const playTrack = async (uri: string) => {
  if (!deviceId) {
    const initialized = await ensureActiveDevice();
    if (!initialized) return false;
  }

  try {
    const result = await spotifyApi.put("/me/player/play", {
      uris: [uri],
      device_id: deviceId,
    });
    return result !== null;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      const activated = await ensureActiveDevice();
      if (activated) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        try {
          const retry = await spotifyApi.put("/me/player/play", {
            uris: [uri],
            device_id: deviceId,
          });
          return retry !== null;
        } catch {
          return false;
        }
      }
    }
    return false;
  }
};

// Content retrieval functions with caching
export const getUserPlaylists = async (limit = 20, offset = 0) =>
  spotifyApi.get<SpotifyPlaylistsResponse>(
    `/me/playlists?limit=${limit}&offset=${offset}`,
    undefined,
    5 * 60 * 1000 // 5 min cache
  );

export const getPlaylistDetails = async (playlistId: string) =>
  spotifyApi.get<SpotifyPlaylistDetails>(
    `/playlists/${playlistId}?fields=id,name,description,images,uri,owner.display_name,followers.total,tracks.items(added_at,track(id,name,uri,duration_ms,artists,album(id,name,images))),tracks.next,tracks.total`,
    undefined,
    5 * 60 * 1000 // 5 min cache
  );

export const getAlbumDetails = async (albumId: string) =>
  spotifyApi.get<SpotifyAlbumDetails>(
    `/albums/${albumId}`,
    undefined,
    5 * 60 * 1000
  );

export const playPlaylist = async (playlistUri: string) => {
  if (!deviceId) return false;

  try {
    const result = await spotifyApi.put("/me/player/play", {
      context_uri: playlistUri,
      device_id: deviceId,
    });
    return result !== null;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      const activated = await ensureActiveDevice();
      if (activated) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        try {
          const retry = await spotifyApi.put("/me/player/play", {
            context_uri: playlistUri,
            device_id: deviceId,
          });
          return retry !== null;
        } catch {
          return false;
        }
      }
    }
    return false;
  }
};

export const playAlbum = playPlaylist; // Same logic as playing a playlist

export const getNewReleases = async (limit = 20, offset = 0) => {
  const data = await spotifyApi.get<SpotifyNewReleasesResponse>(
    `/browse/new-releases?limit=${limit}&offset=${offset}`,
    undefined,
    60 * 60 * 1000 // 1 hour cache
  );
  return data?.albums || null;
};

export const getLikedSongs = async (limit = 50, offset = 0) =>
  spotifyApi.get<SpotifyPagingObject<SpotifySavedTrack>>(
    `/me/tracks?limit=${limit}&offset=${offset}`,
    undefined,
    5 * 60 * 1000 // 5 min cache
  );

export const getArtistDetails = async (artistId: string) =>
  spotifyApi.get<SpotifyArtistDetails>(
    `/artists/${artistId}`,
    undefined,
    30 * 60 * 1000
  );

export const getArtistTopTracks = async (artistId: string) =>
  spotifyApi.get<SpotifyTopTracksResponse>(
    `/artists/${artistId}/top-tracks?market=from_token`,
    undefined,
    30 * 60 * 1000 // 30 min cache
  );

export const getArtistAlbums = async (
  artistId: string,
  limit = 10,
  offset = 0
) =>
  spotifyApi.get<SpotifyPagingObject<SpotifyAlbum>>(
    `/artists/${artistId}/albums?include_groups=album,single&limit=${limit}&offset=${offset}&market=from_token`,
    undefined,
    30 * 60 * 1000 // 30 min cache
  );

export const getQueue = async () =>
  spotifyApi.get<SpotifyQueueResponse>(
    "/me/player/queue",
    undefined,
    10 * 1000
  ); // Short 10s cache

export const getCurrentPlayback = async () =>
  spotifyApi.get<SpotifyPlaybackState>("/me/player");
