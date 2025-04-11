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

// Store access helpers
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

export const getPlaybackContext = (): PlaybackContext => {
  const { sourceType, sourceId, queueTracks, currentQueueIndex } =
    usePlayerStore.getState();
  return {
    sourceType,
    sourceId,
    trackUris: queueTracks,
    currentIndex: currentQueueIndex,
  };
};

// Queue management
export const getInternalQueue = () => usePlayerStore.getState().queueTracks;
export const getCurrentQueueIndex = () =>
  usePlayerStore.getState().currentQueueIndex;
export const clearInternalQueue = () => usePlayerStore.getState().clearQueue();
export const addToInternalQueue = (trackUri: string, addToFront = false) =>
  usePlayerStore.getState().addToQueue(trackUri, addToFront);
export const setInternalQueue = (tracks: string[], startIndex = 0) =>
  usePlayerStore.getState().setQueueTracks(tracks, startIndex);
export const clearPlaybackContext = () => {
  const store = usePlayerStore.getState();
  store.setPlaybackSource("none", "");
  store.clearQueue();
};

export const removeFromInternalQueue = (index: number): boolean => {
  const store = usePlayerStore.getState();
  if (index < 0 || index >= store.queueTracks.length) return false;
  store.removeFromQueue(index);
  return true;
};

// Playback navigation
export const playNextInQueue = async (): Promise<boolean> => {
  const store = usePlayerStore.getState();
  const { queueTracks, isShuffleEnabled } = store;

  if (queueTracks.length === 0) return false;

  // Get next track index based on shuffle state
  const nextIndex = isShuffleEnabled
    ? store.getNextShuffledIndex()
    : store.currentQueueIndex < queueTracks.length - 1
    ? store.currentQueueIndex + 1
    : store.isCircular
    ? 0
    : -1;

  if (nextIndex === -1) return false;

  try {
    store.updateCurrentIndex(nextIndex);
    return await playTrack(queueTracks[nextIndex]);
  } catch (error) {
    console.error("Error playing next track:", error);
    return false;
  }
};

export const playPreviousInQueue = async (): Promise<boolean> => {
  const store = usePlayerStore.getState();
  const { queueTracks, isShuffleEnabled } = store;

  if (queueTracks.length === 0) return false;

  // Get previous track index based on shuffle state
  const prevIndex = isShuffleEnabled
    ? store.getPreviousShuffledIndex()
    : store.currentQueueIndex > 0
    ? store.currentQueueIndex - 1
    : store.isCircular
    ? queueTracks.length - 1
    : -1;

  if (prevIndex === -1) return false;

  try {
    store.updateCurrentIndex(prevIndex);
    return await playTrack(queueTracks[prevIndex]);
  } catch (error) {
    console.error("Error playing previous track:", error);
    return false;
  }
};

// Track info fetching
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

      if (tracksData?.tracks) {
        results.push(...tracksData.tracks);
      }
    }

    // Update store with track details
    usePlayerStore.getState().setQueueTrackItems(results);
    return results;
  } catch (error) {
    console.error("Error fetching tracks:", error);
    return [];
  }
};

// Playback actions
export const playTrackWithContext = async (uri: string) => {
  const store = usePlayerStore.getState();
  const trackIndex = store.queueTracks.indexOf(uri);

  if (trackIndex === -1) {
    // Just play this single track
    store.setQueueTracks([uri], 0);
    return await playTrack(uri);
  }

  // Update queue to start from this track
  store.updateCurrentIndex(trackIndex);

  // Play the selected track
  const success = await playTrack(uri);
  store.setIsPlaying(success);
  return success;
};

// Load tracks into queue from source
export const loadTracksIntoQueue = async (
  sourceType: "album" | "playlist",
  sourceId: string,
  maxTracks = 1000
): Promise<boolean> => {
  try {
    let trackUris: string[] = [];
    const endpoint =
      sourceType === "playlist"
        ? `/playlists/${sourceId}`
        : `/albums/${sourceId}`;

    // First fetch metadata and initial tracks
    const data: any = await spotifyApi.get(endpoint);

    if (sourceType === "playlist" && data?.tracks?.items) {
      // Get initial tracks
      trackUris = data.tracks.items
        .filter((item: any) => item?.track)
        .map((item: any) => item.track.uri);

      // Fetch more tracks if available
      let nextUrl = data.tracks.next;
      while (nextUrl && trackUris.length < maxTracks) {
        const moreData: any = await spotifyApi.getByUrl(nextUrl);
        if (moreData?.items) {
          const moreTracks = moreData.items
            .filter((item: any) => item?.track)
            .map((item: any) => item.track.uri);
          trackUris.push(...moreTracks);
          nextUrl = moreData.next;
        } else {
          break;
        }
      }
    } else if (sourceType === "album" && data?.tracks?.items) {
      // Get album tracks
      trackUris = data.tracks.items.map((track: any) => track.uri);

      // Fetch more tracks if available
      let nextUrl = data.tracks.next;
      while (nextUrl && trackUris.length < maxTracks) {
        const moreData: { items?: any[]; next?: string } =
          (await spotifyApi.getByUrl(nextUrl)) ?? {};
        if (moreData?.items) {
          const moreTracks = moreData.items.map((track: any) => track.uri);
          trackUris.push(...moreTracks);
          nextUrl = moreData.next;
        } else {
          break;
        }
      }
    }

    // Ensure we stay within the maxTracks limit
    trackUris = trackUris.slice(0, maxTracks);

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

// Add track to queue with manual track marking
export const addTrackToQueue = async (
  trackUri: string,
  addToFront = false
): Promise<boolean> => {
  try {
    // Add to our internal queue (this preserves the existing queue)
    usePlayerStore.getState().addToQueue(trackUri, addToFront);

    // Mark as manually added
    usePlayerStore.getState().markTrackAsManuallyAdded(trackUri);

    // Fetch track details
    await getTracksByUris([trackUri]);

    return true;
  } catch (error) {
    console.error("Failed to add track to queue:", error);
    return false;
  }
};

// Toggle shuffle mode
export const toggleShuffleMode = (): boolean => {
  const store = usePlayerStore.getState();
  store.toggleShuffle();
  return store.isShuffleEnabled;
};
