import { useState, useEffect } from "react";
import { getCurrentPlayback, getQueue, playTrack } from "@/utils/spotify";
import { MediaDetail } from "@/components/MediaDetail";
import { SpotifyTrackItem } from "@/utils/spotify.types";

export function Queue() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queue, setQueue] = useState<SpotifyTrackItem[]>([]);
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrackItem | null>(
    null
  );
  const [isPlaying, setIsPlaying] = useState(false);

  // Fetch queue data
  useEffect(() => {
    async function fetchQueueData() {
      try {
        setLoading(true);

        // Get current playback to know what's currently playing
        const playback = await getCurrentPlayback();
        if (playback && "item" in playback) {
          setCurrentTrack(playback.item as SpotifyTrackItem);
          setIsPlaying(playback.is_playing);
        }

        // Get the user's queue
        const queueData = await getQueue();
        if (queueData && queueData.queue) {
          setQueue(queueData.queue);
        }

        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch queue:", err);
        setError("Failed to load your queue. Please try again.");
        setLoading(false);
      }
    }

    fetchQueueData();
  }, []);

  // Handle playing a track
  const handlePlay = async (uri: string) => {
    const success = await playTrack(uri);
    if (success) {
      // Optimistically update UI
      const playback = await getCurrentPlayback();
      if (playback && "item" in playback) {
        setCurrentTrack(playback.item as SpotifyTrackItem);
        setIsPlaying(true);
      }
    }
  };

  // Handle play/pause for currently playing track
  const handlePlayPause = async () => {
    try {
      const playback = await getCurrentPlayback();
      if (playback) {
        // Toggle playback state
        // This would be a call to your existing togglePlayback function
        setIsPlaying(!isPlaying);
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
  const tracks = queue.map((track, index) => ({
    id: track.id,
    index: index + 1, // +1 because we're showing position in queue
    name: track.name,
    artists: track.artists.map((a) => a.name).join(", "),
    artistsData: track.artists,
    duration: track.duration_ms,
    uri: track.uri,
    imageUrl: track.album?.images?.[0]?.url,
    isCurrentTrack: currentTrack?.id === track.id,
    isPlaying: isPlaying && currentTrack?.id === track.id,
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
              Next up in your queue ({queue.length} tracks)
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
            <p className="mt-1">Tracks in your queue: {queue.length}</p>
          </div>
        ),
        secondaryInfo: <div className="mb-4"></div>,
        onPlay: handlePlayPause,
        onBack: handleBack,
        isPlaying: false,
      };

  return (
    <MediaDetail
      title="Queue"
      loading={loading}
      error={error}
      headerProps={headerProps}
      tracks={tracks}
      onBack={handleBack}
    />
  );
}
