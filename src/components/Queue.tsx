import { useState, useEffect, useRef, useCallback } from "react";
import {
  getCurrentPlayback,
  getInternalQueue,
  getCurrentQueueIndex,
  playTrack,
  getTracksByUris,
  removeFromInternalQueue,
  pausePlayback,
  resumePlayback,
} from "@/utils/spotify";
import { MediaDetail } from "@/components/MediaDetail";
import { SpotifyTrackItem } from "@/utils/spotify.types";
import { Trash2 } from "lucide-react";
import { Button } from "./ui/button";

export function Queue() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queueTracks, setQueueTracks] = useState<SpotifyTrackItem[]>([]);
  const [queueUris, setQueueUris] = useState<string[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState<number>(-1);
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrackItem | null>(
    null
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cancel any refresh timeout on unmount
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  // Fetch queue data
  const fetchQueueData = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) {
          setLoading(true);
        }

        // Get current playback to know what's currently playing
        const playback = await getCurrentPlayback();
        if (playback && "item" in playback) {
          setCurrentTrack(playback.item as SpotifyTrackItem);
          setIsPlaying(playback.is_playing);
        }

        // Get our internal queue URIs
        const internalQueueUris = getInternalQueue();
        const currentIndex = getCurrentQueueIndex();

        // Only update the state if something has changed to prevent unnecessary re-renders
        if (
          JSON.stringify(internalQueueUris) !== JSON.stringify(queueUris) ||
          currentIndex !== currentQueueIndex
        ) {
          setQueueUris(internalQueueUris);
          setCurrentQueueIndex(currentIndex);

          console.log("📱 Internal queue:", internalQueueUris);
          console.log("📱 Current index:", currentIndex);

          // Fetch full track data for each URI in our internal queue
          if (internalQueueUris.length > 0) {
            const tracks = await getTracksByUris(internalQueueUris);
            // Make sure we have the tracks in the same order as the URIs
            const orderedTracks = internalQueueUris.map((uri) => {
              const foundTrack = tracks.find((track) => track.uri === uri);

              if (foundTrack) return foundTrack;

              // Create placeholder track with proper typing
              return {
                id: uri.split(":").pop() || "",
                name: "Unknown Track",
                uri,
                duration_ms: 0,
                artists: [],
                album: {
                  id: "",
                  name: "",
                  images: [],
                  uri: "",
                  artists: [],
                },
                type: "track",
              } as SpotifyTrackItem;
            });

            setQueueTracks(orderedTracks);
          } else {
            setQueueTracks([]);
          }
        }

        if (showLoading) {
          setLoading(false);
        }

        // Schedule next refresh
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
        }
        refreshTimeoutRef.current = setTimeout(() => {
          fetchQueueData(false); // Don't show loading on background refreshes
        }, 10000);
      } catch (err) {
        console.error("Failed to fetch queue:", err);
        if (showLoading) {
          setError("Failed to load your queue. Please try again.");
          setLoading(false);
        }
      }
    },
    [queueUris, currentQueueIndex]
  );

  // Initial fetch
  useEffect(() => {
    fetchQueueData();
  }, [fetchQueueData]);

  // Handle playing a track
  const handlePlay = async (uri: string) => {
    const success = await playTrack(uri);
    if (success) {
      // Optimistic update for better UX
      setIsPlaying(true);
      // Find track index in queue
      const index = queueUris.findIndex((queueUri) => queueUri === uri);
      if (index >= 0) {
        setCurrentQueueIndex(index);
      }
      // Refresh data after a short delay to ensure state is updated
      setTimeout(() => fetchQueueData(false), 500);
    }
  };

  // Handle removing a track from the queue
  const handleRemoveTrack = async (index: number) => {
    const removed = removeFromInternalQueue(index);
    if (removed) {
      // Optimistically update the UI
      const newQueueUris = [...queueUris];
      newQueueUris.splice(index, 1);
      setQueueUris(newQueueUris);

      const newTracks = [...queueTracks];
      newTracks.splice(index, 1);
      setQueueTracks(newTracks);

      // If we removed the current track or a track before it, adjust the current index
      if (index <= currentQueueIndex) {
        setCurrentQueueIndex((prev) => (prev > 0 ? prev - 1 : 0));
      }

      // Refresh to ensure consistency
      setTimeout(() => fetchQueueData(false), 500);
    }
  };

  // Handle play/pause for currently playing track
  const handlePlayPause = async () => {
    try {
      if (isPlaying) {
        const success = await pausePlayback();
        if (success) setIsPlaying(false);
      } else {
        const success = await resumePlayback();
        if (success) setIsPlaying(true);
      }
    } catch (err) {
      console.error("Failed to toggle playback:", err);
    }
  };

  const handleBack = () => {
    // Go back to previous view
    window.history.back();
  };

  // Format queue tracks for MediaDetail component
  const tracks = queueTracks.map((track, index) => ({
    id: track.id,
    index: index + 1, // +1 because we're showing position in queue
    name: track.name,
    artists: track.artists.map((a) => a.name).join(", "),
    artistsData: track.artists,
    duration: track.duration_ms,
    uri: track.uri,
    imageUrl: track.album?.images?.[0]?.url,
    isCurrentTrack: index === currentQueueIndex,
    isPlaying: isPlaying && index === currentQueueIndex,
    onPlay: handlePlay,
    albumId: track.album?.id,
    albumName: track.album?.name,
    onArtistClick: (artistId: string) => {
      window.history.pushState({}, "", `/artists/${artistId}`);
      window.dispatchEvent(new Event("popstate"));
    },
    onAlbumClick: (albumId: string) => {
      window.history.pushState({}, "", `/albums/${albumId}`);
      window.dispatchEvent(new Event("popstate"));
    },
    // Add custom action buttons for each track
    actions:
      index !== currentQueueIndex ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            handleRemoveTrack(index);
          }}
          title="Remove from queue"
        >
          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
        </Button>
      ) : undefined,
  }));

  // Create header props for MediaDetail
  const headerProps = currentTrack
    ? {
        images: currentTrack.album?.images || [],
        name: "Your Queue",
        primaryInfo: (
          <div className="mb-2 text-sm text-muted-foreground">
            <p>
              Currently playing: <strong>{currentTrack.name}</strong> by{" "}
              {currentTrack.artists.map((a) => a.name).join(", ")}
            </p>
            <p className="mt-1">
              Next up in your queue (
              {queueTracks.length > 0
                ? queueTracks.length - 1 - currentQueueIndex
                : 0}{" "}
              tracks)
            </p>
          </div>
        ),
        secondaryInfo: <div className="mb-4"></div>,
        onPlay: handlePlayPause,
        onBack: handleBack,
        isPlaying: isPlaying,
      }
    : {
        images: [],
        name: "Your Queue",
        primaryInfo: (
          <div className="mb-2 text-sm text-muted-foreground">
            <p>No track currently playing</p>
            <p className="mt-1">Tracks in your queue: {queueTracks.length}</p>
          </div>
        ),
        secondaryInfo: <div className="mb-4"></div>,
        onPlay: handlePlayPause,
        onBack: handleBack,
        isPlaying: false,
      };

  const clearQueueButton =
    queueTracks.length > 1 ? (
      <div className="flex justify-end mb-4">
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => {
            for (let i = queueTracks.length - 1; i >= 0; i--) {
              if (i !== currentQueueIndex) {
                handleRemoveTrack(i);
              }
            }
          }}
        >
          Clear Queue
        </Button>
      </div>
    ) : null;

  return (
    <MediaDetail
      title="Queue"
      loading={loading}
      error={error}
      headerProps={headerProps}
      tracks={tracks}
      onBack={handleBack}
      actionButtons={clearQueueButton}
    />
  );
}
