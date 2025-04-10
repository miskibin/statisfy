import { playTrack } from "./spotify";
import { SpotifyTrackItem } from "./spotify.types";
import { spotifyApi } from "./apiClient";

// Playback context tracking system to queue subsequent tracks
export interface PlaybackContext {
  sourceType: "album" | "playlist" | "artist" | "search" | "none";
  sourceId: string;
  trackUris: string[];
  currentIndex: number;
}

// Internal queue management system
interface InternalQueueSystem {
  tracks: string[]; // URIs of tracks in our queue
  currentIndex: number; // Index of currently playing track in our internal queue
  isPlaying: boolean; // Whether playback is currently active
  autoPlay: boolean; // Whether to automatically play the next track
  maxQueueSize: number; // Maximum number of tracks to keep in the queue
  isCircular: boolean; // Whether queue should loop around (first track after last, last track before first)
}

// Initialize our internal queue
let internalQueue: InternalQueueSystem = {
  tracks: [],
  currentIndex: -1,
  isPlaying: false,
  autoPlay: true,
  maxQueueSize: 100, // Increased from 10 to handle longer playlists
  isCircular: true, // Enable circular navigation by default
};

// Current playback context (for adding tracks from playlists/albums/artists)
let currentPlaybackContext: PlaybackContext = {
  sourceType: "none",
  sourceId: "",
  trackUris: [],
  currentIndex: -1,
};

export const setPlaybackContext = (
  sourceType: "album" | "playlist" | "artist" | "search" | "none",
  sourceId: string,
  trackUris: string[],
  currentTrackUri: string
) => {
  const currentIndex = trackUris.indexOf(currentTrackUri);
  if (currentIndex === -1 && trackUris.length > 0) {
    // If the track isn't found in the URIs, default to the first track
    currentPlaybackContext = {
      sourceType,
      sourceId,
      trackUris,
      currentIndex: 0,
    };
  } else {
    currentPlaybackContext = { sourceType, sourceId, trackUris, currentIndex };
  }
};

export const getPlaybackContext = (): PlaybackContext => {
  return { ...currentPlaybackContext };
};

export const clearPlaybackContext = () => {
  currentPlaybackContext = {
    sourceType: "none",
    sourceId: "",
    trackUris: [],
    currentIndex: -1,
  };

  // Also clear internal queue
  clearInternalQueue();
};

// Internal Queue Management
export const getInternalQueue = (): string[] => {
  return [...internalQueue.tracks];
};

export const getCurrentQueueIndex = (): number => {
  return internalQueue.currentIndex;
};

export const clearInternalQueue = () => {
  internalQueue = {
    ...internalQueue,
    tracks: [],
    currentIndex: -1,
  };
};

export const addToInternalQueue = (trackUri: string) => {
  // Don't add if already in queue
  if (internalQueue.tracks.includes(trackUri)) return;

  // Add to queue and trim if exceeds maxQueueSize
  internalQueue.tracks.push(trackUri);
  if (internalQueue.tracks.length > internalQueue.maxQueueSize) {
    // Remove oldest entries (those before current playing track)
    const currentIndex = internalQueue.currentIndex;
    if (currentIndex > 0) {
      internalQueue.tracks = internalQueue.tracks.slice(currentIndex);
      internalQueue.currentIndex = 0;
    } else {
      // If we're at the beginning, remove from the end
      internalQueue.tracks = internalQueue.tracks.slice(
        0,
        internalQueue.maxQueueSize
      );
    }
  }
};

export const setInternalQueue = (tracks: string[], startIndex = 0) => {
  internalQueue.tracks = tracks.slice(0, internalQueue.maxQueueSize);
  internalQueue.currentIndex = Math.min(startIndex, tracks.length - 1);
};

export const removeFromInternalQueue = (index: number): boolean => {
  // Make sure the index is valid
  if (index < 0 || index >= internalQueue.tracks.length) {
    return false;
  }

  // If removing the currently playing track, update state accordingly
  if (index === internalQueue.currentIndex) {
    // If we're removing the current track, we'll need to play the next one
    if (index < internalQueue.tracks.length - 1) {
      // There's a next track to play
      // We keep the index the same since removing the current track
      // will make the next track shift into this position
    } else if (internalQueue.tracks.length > 1) {
      // We're removing the last track and there are still other tracks
      internalQueue.currentIndex = index - 1;
    } else {
      // We're removing the only track
      internalQueue.currentIndex = -1;
    }
  } else if (index < internalQueue.currentIndex) {
    // If removing a track before the current one, adjust the current index
    internalQueue.currentIndex--;
  }

  // Remove the track
  internalQueue.tracks.splice(index, 1);

  return true;
};

export const playNextInQueue = async (): Promise<boolean> => {
  const queueLength = internalQueue.tracks.length;

  if (queueLength === 0) return false;

  if (internalQueue.currentIndex < queueLength - 1) {
    // Normal case: We have a next track
    internalQueue.currentIndex++;
  } else if (internalQueue.isCircular && queueLength > 0) {
    // Circular behavior: Go back to first track
    internalQueue.currentIndex = 0;
  } else {
    // End of queue and not circular
    return false;
  }

  const nextTrack = internalQueue.tracks[internalQueue.currentIndex];
  return await playTrack(nextTrack);
};

export const playPreviousInQueue = async (): Promise<boolean> => {
  const queueLength = internalQueue.tracks.length;

  if (queueLength === 0) return false;

  if (internalQueue.currentIndex > 0) {
    // Normal case: We have a previous track
    internalQueue.currentIndex--;
  } else if (internalQueue.isCircular && queueLength > 0) {
    // Circular behavior: Jump to last track
    internalQueue.currentIndex = queueLength - 1;
  } else {
    // Beginning of queue and not circular
    return false;
  }

  const prevTrack = internalQueue.tracks[internalQueue.currentIndex];
  return await playTrack(prevTrack);
};

// Get track details by URI
export const getTracksByUris = async (
  uris: string[]
): Promise<SpotifyTrackItem[]> => {
  if (!uris.length) return [];

  // Extract track IDs from URIs
  const ids = uris
    .filter((uri) => uri.startsWith("spotify:track:"))
    .map((uri) => uri.split(":")[2]);

  if (!ids.length) return [];

  try {
    // Spotify API has a limit of 50 IDs per request
    const results: SpotifyTrackItem[] = [];
    for (let i = 0; i < ids.length; i += 50) {
      const batch = ids.slice(i, i + 50);
      const tracksData = await spotifyApi.get<{ tracks: SpotifyTrackItem[] }>(
        `/tracks?ids=${batch.join(",")}`,
        undefined,
        60 * 1000 // 1 minute cache
      );

      if (tracksData && tracksData.tracks) {
        results.push(...tracksData.tracks);
      }
    }
    return results;
  } catch (error) {
    console.error("Error fetching tracks by URIs:", error);
    return [];
  }
};

// Enhanced play track with auto-queuing using our internal queue
export const playTrackWithContext = async (uri: string) => {
  // Find the current index in the context
  const trackIndex = currentPlaybackContext.trackUris.indexOf(uri);
  if (trackIndex === -1) {
    // Just play this single track
    internalQueue = {
      ...internalQueue,
      tracks: [uri],
      currentIndex: 0,
    };
    return await playTrack(uri);
  }

  // Set up our internal queue with this track and subsequent tracks
  const subsequentTracks = currentPlaybackContext.trackUris.slice(trackIndex);

  // Update our internal queue
  setInternalQueue(subsequentTracks, 0);

  // Play the selected track (which is now first in our queue)
  const success = await playTrack(uri);
  internalQueue.isPlaying = success;

  return success;
};

// New function to load all tracks from a playlist or album into the queue
export const loadTracksIntoQueue = async (
  sourceType: "album" | "playlist",
  sourceId: string,
  sourceUri: string
): Promise<boolean> => {
  try {
    let trackUris: string[] = [];

    if (sourceType === "playlist") {
      const playlistData = await spotifyApi.get(`/playlists/${sourceId}`);

      if (playlistData && playlistData.tracks && playlistData.tracks.items) {
        // Extract track URIs from playlist
        trackUris = playlistData.tracks.items
          .filter((item) => item.track) // Skip null tracks
          .map((item) => item.track.uri);
      }
    } else if (sourceType === "album") {
      const albumData = await spotifyApi.get(`/albums/${sourceId}`);

      if (albumData && albumData.tracks && albumData.tracks.items) {
        // Extract track URIs from album
        trackUris = albumData.tracks.items.map((track) => track.uri);
      }
    }

    if (trackUris.length > 0) {
      // Set the playback context with all tracks
      setPlaybackContext(sourceType, sourceId, trackUris, trackUris[0]);

      // Update our internal queue with all tracks
      setInternalQueue(trackUris, 0);

      // Start playing the first track
      const success = await playTrack(trackUris[0]);
      internalQueue.isPlaying = success;

      return success;
    }

    return false;
  } catch (error) {
    console.error(`Error loading ${sourceType} tracks:`, error);
    return false;
  }
};
