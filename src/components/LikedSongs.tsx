import { useState, useEffect, useRef, useCallback } from "react";
import { getLikedSongs, playTrack, getCurrentPlayback } from "@/utils/spotify";
import { MediaDetail } from "@/components/MediaDetail";
import { SpotifySavedTrack } from "@/utils/spotify.types";
import { Heart } from "lucide-react";
import { useNavigate } from "@/App";

export function LikedSongs() {
  const [likedTracks, setLikedTracks] = useState<SpotifySavedTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<{
    uri: string;
    isPlaying: boolean;
  } | null>(null);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const navigate = useNavigate();

  const loadingRef = useCallback(
    (node: HTMLDivElement) => {
      if (loadingMore) return;
      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore && !loadingMore) {
            handleLoadMore();
          }
        },
        {
          rootMargin: "100px",
        }
      );

      if (node) observerRef.current.observe(node);
    },
    [loadingMore, hasMore]
  );

  // Handle navigation to artist page
  const handleArtistClick = useCallback(
    (artistId: string) => {
      navigate(`/artists/${artistId}`);
    },
    [navigate]
  );

  // Handle navigation to album page
  const handleAlbumClick = useCallback(
    (albumId: string) => {
      navigate(`/albums/${albumId}`);
    },
    [navigate]
  );

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
          // Log first track to verify album data
          if (result.items.length > 0 && !append) {
            console.log("First liked track:", result.items[0].track);
            console.log("Album data:", result.items[0].track.album);
          }

          if (append) {
            setLikedTracks((prev) => [...prev, ...result.items]);
          } else {
            setLikedTracks(result.items);
          }
          setTotal(result.total);
          setOffset(offsetValue);
          setHasMore(offsetValue + result.items.length < result.total);
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

    return () => {
      clearInterval(interval);
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  const handleLoadMore = async () => {
    if (offset + 50 < total && !loadingMore) {
      setLoadingMore(true);
      try {
        const result = await getLikedSongs(50, offset + 50);
        if (result && result.items) {
          setLikedTracks((prev) => [...prev, ...result.items]);
          setOffset(offset + 50);
          setHasMore(offset + 50 + result.items.length < result.total);
        }
      } catch (err) {
        console.error("Error loading more liked songs:", err);
      } finally {
        setLoadingMore(false);
      }
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
          artistsData: track.artists.map((artist) => ({
            id: artist.id,
            name: artist.name,
          })),
          duration: track.duration_ms,
          uri: track.uri,
          onPlay: handlePlayTrack,
          isCurrentTrack,
          addedAt: formatAddedDate(item.added_at),
          onArtistClick: handleArtistClick,
          albumId: track.album.id,
          albumName: track.album.name,
          onAlbumClick: handleAlbumClick,
        };
      })}
      loadingMore={loadingMore}
      loadingRef={loadingRef}
      hasMore={hasMore}
    />
  );
}
