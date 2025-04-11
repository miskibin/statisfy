import { playTrack } from "./spotify";
import { SpotifyTrackItem } from "./spotify.types";
import { spotifyApi } from "./apiClient";
import { usePlayerStore } from "@/stores/playerStore";

export interface PlaybackContext {
  sourceType: "album" | "playlist" | "artist" | "search" | "none";
  sourceId: string;
  trackUris: string[];
  currentIndex: number;
}

// Simplified functions that delegate to playerStore
export const setPlaybackContext = (
  sourceType: "album" | "playlist" | "artist" | "search" | "none",
  sourceId: string,
  trackUris: string[],
  currentTrackUri: string
) => {
  const playerStore = usePlayerStore.getState();
  const currentIndex = trackUris.indexOf(currentTrackUri);
  
  playerStore.setPlaybackSource(sourceType, sourceId);
  playerStore.setQueueTracks(trackUris, currentIndex >= 0 ? currentIndex : 0);
};

// Simplified getters that use playerStore directly
export const getPlaybackContext = (): PlaybackContext => {
  const { sourceType, sourceId, queueTracks, currentQueueIndex } = usePlayerStore.getState();
  return { sourceType, sourceId, trackUris: queueTracks, currentIndex: currentQueueIndex };
};

// Direct delegations to playerStore
export const clearPlaybackContext = () => {
  const store = usePlayerStore.getState();
  store.setPlaybackSource("none", "");
  store.clearQueue();
};

export const getInternalQueue = () => usePlayerStore.getState().queueTracks;
export const getCurrentQueueIndex = () => usePlayerStore.getState().currentQueueIndex;
export const clearInternalQueue = () => usePlayerStore.getState().clearQueue();
export const addToInternalQueue = (trackUri: string) => usePlayerStore.getState().addToQueue(trackUri);
export const setInternalQueue = (tracks: string[], startIndex = 0) => usePlayerStore.getState().setQueueTracks(tracks, startIndex);

export const removeFromInternalQueue = (index: number): boolean => {
  const store = usePlayerStore.getState();
  
  if (index < 0 || index >= store.queueTracks.length) return false;
  
  store.removeFromQueue(index);
  return true;
};

// Navigation functions
export const playNextInQueue = async (): Promise<boolean> => {
  const store = usePlayerStore.getState();
  const { queueTracks, currentQueueIndex, isCircular } = store;
  const queueLength = queueTracks.length;

  if (queueLength === 0) return false;

  // Determine next track index with circular support
  let nextIndex = currentQueueIndex < queueLength - 1 
    ? currentQueueIndex + 1 
    : (isCircular ? 0 : -1);

  if (nextIndex === -1) return false;

  try {
    const nextTrack = queueTracks[nextIndex];
    store.updateCurrentIndex(nextIndex);
    return await playTrack(nextTrack);
  } catch (error) {
    console.error("Error transitioning to next track:", error);
    return false;
  }
};

export const playPreviousInQueue = async (): Promise<boolean> => {
  const store = usePlayerStore.getState();
  const { queueTracks, currentQueueIndex, isCircular } = store;
  const queueLength = queueTracks.length;

  if (queueLength === 0) return false;

  // Determine previous track index with circular support
  let prevIndex = currentQueueIndex > 0 
    ? currentQueueIndex - 1 
    : (isCircular ? queueLength - 1 : -1);
    
  if (prevIndex === -1) return false;

  try {
    const prevTrack = queueTracks[prevIndex];
    store.updateCurrentIndex(prevIndex);
    return await playTrack(prevTrack);
  } catch (error) {
    console.error("Error transitioning to previous track:", error);
    return false;
  }
};

// Data fetching with store update
export const getTracksByUris = async (uris: string[]): Promise<SpotifyTrackItem[]> => {
  if (!uris.length) return [];

  // Extract track IDs from URIs
  const ids = uris
    .filter(uri => uri.startsWith("spotify:track:"))
    .map(uri => uri.split(":")[2]);

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

      if (tracksData?.tracks) {
        results.push(...tracksData.tracks);
      }
    }
    
    // Update store with track details
    usePlayerStore.getState().setQueueTrackItems(results);
    return results;
  } catch (error) {
    console.error("Error fetching tracks by URIs:", error);
    return [];
  }
};

// Enhanced play functions
export const playTrackWithContext = async (uri: string) => {
  const store = usePlayerStore.getState();
  const trackIndex = store.queueTracks.indexOf(uri);
  
  if (trackIndex === -1) {
    // Just play this single track
    store.setQueueTracks([uri], 0);
    return await playTrack(uri);
  }

  // Update queue to start from this track
  const subsequentTracks = store.queueTracks.slice(trackIndex);
  store.setQueueTracks(subsequentTracks, 0);
  
  // Play the selected track
  const success = await playTrack(uri);
  store.setIsPlaying(success);
  return success;
};

// Load tracks into queue from source
export const loadTracksIntoQueue = async (
  sourceType: "album" | "playlist",
  sourceId: string
): Promise<boolean> => {
  try {
    let trackUris: string[] = [];
    const endpoint = sourceType === "playlist" ? `/playlists/${sourceId}` : `/albums/${sourceId}`;
    
    const data = await spotifyApi.get(endpoint);
    
    if (sourceType === "playlist" && data?.tracks?.items) {
      trackUris = data.tracks.items
        .filter(item => item?.track)
        .map(item => item.track.uri);
    } else if (sourceType === "album" && data?.tracks?.items) {
      trackUris = data.tracks.items.map(track => track.uri);
    }

    if (trackUris.length > 0) {
      const store = usePlayerStore.getState();
      
      store.setPlaybackSource(sourceType, sourceId);
      store.setQueueTracks(trackUris, 0);
      
      const success = await playTrack(trackUris[0]);
      store.setIsPlaying(success);
      return success;
    }

    return false;
  } catch (error) {
    console.error(`Error loading ${sourceType} tracks:`, error);
    return false;
  }
};
