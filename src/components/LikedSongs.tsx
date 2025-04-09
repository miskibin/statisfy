import { useState, useEffect } from "react";
import { getLikedSongs, playTrack, getCurrentPlayback } from "@/utils/spotify";
import { MediaDetail } from "@/components/MediaDetail";
import { SpotifySavedTrack } from "@/utils/spotify.types";
import { Heart } from "lucide-react";

export function LikedSongs() {
  const [likedTracks, setLikedTracks] = useState<SpotifySavedTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<{
    uri: string;
    isPlaying: boolean;
  } | null>(null);

  // Fetch liked songs
  useEffect(() => {
    const fetchLikedSongs = async (offsetValue = 0, append = false) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(null);
      }

      try {
        const result = await getLikedSongs(50, offsetValue);
        if (result && result.items) {
          if (append) {
            setLikedTracks((prev) => [...prev, ...result.items]);
          } else {
            setLikedTracks(result.items);
          }
          setTotal(result.total);
          setOffset(offsetValue);
        } else {
          if (!append) {
            setError("Could not load your liked songs");
          }
        }
      } catch (err) {
        console.error("Error loading liked songs:", err);
        if (!append) {
          setError("Error loading liked songs");
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    };

    fetchLikedSongs();

    // Check playback status
    const checkPlaybackState = async () => {
      try {
        const playback = await getCurrentPlayback();

        if (playback && playback.item) {
          setCurrentlyPlaying({
            uri: playback.item.uri,
            isPlaying: playback.is_playing,
          });
        } else {
          setCurrentlyPlaying(null);
        }
      } catch (err) {
        console.error("Error checking playback state:", err);
      }
    };

    checkPlaybackState();
    const interval = setInterval(checkPlaybackState, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleLoadMore = async () => {
    if (offset + 50 < total) {
      const fetchLikedSongs = async (offsetValue = 0, append = false) => {
        setLoadingMore(true);

        try {
          const result = await getLikedSongs(50, offsetValue);
          if (result && result.items) {
            setLikedTracks((prev) => [...prev, ...result.items]);
            setOffset(offsetValue);
          }
        } catch (err) {
          console.error("Error loading more liked songs:", err);
        } finally {
          setLoadingMore(false);
        }
      };

      fetchLikedSongs(offset + 50, true);
    }
  };

  const handlePlayTrack = async (uri: string) => {
    try {
      await playTrack(uri);
      setCurrentlyPlaying({ uri, isPlaying: true });
    } catch (err) {
      console.error("Error playing track:", err);
    }
  };

  const handleBack = () => {
    // This is a top-level view, so no back navigation needed
    // You could use navigate to return to some other view if desired
  };

  // Format date string to a more readable format
  const formatAddedDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Display your liked songs using the MediaDetail component
  return (
    <MediaDetail
      title="Liked Songs"
      loading={loading}
      error={error}
      onBack={handleBack}
      headerProps={{
        name: "Liked Songs",
        images: [
          { url: "https://misc.scdn.co/liked-songs/liked-songs-640.png" },
        ],
        onBack: handleBack,
        onPlay: async () => {
          if (likedTracks.length > 0) {
            await handlePlayTrack(likedTracks[0].track.uri);
          }
        },
        isPlaying: false,
        primaryInfo: (
          <>
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-primary" fill="#ff0000" />
              <p className="text-sm font-medium">Your Liked Songs</p>
            </div>
            <p className="text-sm text-muted-foreground mb-1">
              {total} saved tracks
            </p>
          </>
        ),
        secondaryInfo: (
          <>
            <p className="text-xs text-muted-foreground">
              Songs you've liked across Spotify
            </p>
          </>
        ),
      }}
      tracks={likedTracks.map((item, i) => {
        const track = item.track;
        const isCurrentTrack = currentlyPlaying?.uri === track.uri;

        return {
          id: track.id,
          index: i + 1,
          name: track.name,
          artists: track.artists.map((a) => a.name).join(", "),
          duration: track.duration_ms,
          uri: track.uri,
          onPlay: handlePlayTrack,
          isCurrentTrack,
          addedAt: formatAddedDate(item.added_at),
        };
      })}
    />
  );
}
