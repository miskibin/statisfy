import { useState, useEffect } from "react";
import { MediaDetail } from "@/components/MediaDetail";
import { Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { usePlayerStore } from "@/stores/playerStore";
import {
  playTrack,
  pausePlayback,
  resumePlayback,
  getTracksByUris,
} from "@/utils/spotify";

export function Queue() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get all state from the player store
  const {
    queueTracks,
    queueTrackItems,
    currentQueueIndex,
    isPlaying,
    currentTrack,
    removeFromQueue,
    clearQueue,
  } = usePlayerStore();

  // Fetch track details when the queue changes
  useEffect(() => {
    const loadQueueTracks = async () => {
      try {
        setLoading(true);
        
        if (queueTracks.length > 0 && queueTrackItems.length !== queueTracks.length) {
          await getTracksByUris(queueTracks);
        }
        
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch queue details:", err);
        setError("Failed to load your queue. Please try again.");
        setLoading(false);
      }
    };

    loadQueueTracks();
  }, [queueTracks]);

  // Event handlers
  const handlePlay = (uri: string) => playTrack(uri);
  const handleRemoveTrack = (index: number) => removeFromQueue(index);
  const handlePlayPause = () => isPlaying ? pausePlayback() : resumePlayback();
  const handleBack = () => window.history.back();

  // Navigation helpers
  const navigateToArtist = (artistId: string) => {
    window.history.pushState({}, "", `/artists/${artistId}`);
    window.dispatchEvent(new Event("popstate"));
  };

  const navigateToAlbum = (albumId: string) => {
    window.history.pushState({}, "", `/albums/${albumId}`);
    window.dispatchEvent(new Event("popstate"));
  };

  // Format tracks for the MediaDetail component
  const tracks = queueTrackItems.map((track, index) => ({
    id: track.id,
    index: index + 1,
    name: track.name,
    artists: track.artists.map(a => a.name).join(", "),
    artistsData: track.artists,
    duration: track.duration_ms,
    uri: track.uri,
    imageUrl: track.album?.images?.[0]?.url,
    isCurrentTrack: index === currentQueueIndex,
    isPlaying: isPlaying && index === currentQueueIndex,
    onPlay: () => handlePlay(track.uri),
    albumId: track.album?.id,
    albumName: track.album?.name,
    onArtistClick: navigateToArtist,
    onAlbumClick: navigateToAlbum,
    actions: index !== currentQueueIndex ? (
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

  // Create header props
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
              Next up: {Math.max(0, queueTrackItems.length - 1 - currentQueueIndex)} tracks
            </p>
          </div>
        ),
        secondaryInfo: <div className="mb-4"></div>,
        onPlay: handlePlayPause,
        onBack: handleBack,
        isPlaying,
      }
    : {
        images: [],
        name: "Your Queue",
        primaryInfo: (
          <div className="mb-2 text-sm text-muted-foreground">
            <p>No track currently playing</p>
            <p className="mt-1">Tracks in your queue: {queueTrackItems.length}</p>
          </div>
        ),
        secondaryInfo: <div className="mb-4"></div>,
        onBack: handleBack,
        isPlaying: false,
      };

  const clearQueueButton = queueTrackItems.length > 1 && (
    <div className="flex justify-end mb-4">
      <Button variant="outline" size="sm" className="text-xs" onClick={clearQueue}>
        Clear Queue
      </Button>
    </div>
  );

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
