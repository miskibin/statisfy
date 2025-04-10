import { useState, useEffect } from "react";
import { getUserPlaylists, playPlaylist } from "@/utils/spotify";
import { MediaGrid } from "@/components/MediaGrid";
import { PlaylistDetail } from "@/components/PlaylistDetail";

interface Playlist {
  id: string;
  name: string;
  images: { url: string }[];
  uri: string;
  tracks: {
    total: number;
  };
}

export function UserPlaylists() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(
    null
  );
  const [playingPlaylistId, setPlayingPlaylistId] = useState<string | null>(
    null
  );
  const limit = 20;
  const maxItems = 100; // Maximum number of items to load with infinite scroll

  const fetchPlaylists = async (offsetValue = 0, append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setError(null);
    }

    try {
      const result = await getUserPlaylists(limit, offsetValue);
      if (result && result.items) {
        // Create playlists array, adding Liked Songs at the beginning in first batch only
        const updatedPlaylists = !append
          ? [
              // Add Liked Songs virtual playlist
              {
                id: "liked-songs",
                name: "Liked Songs",
                images: [
                  {
                    url: "https://misc.scdn.co/liked-songs/liked-songs-640.png",
                  },
                ],
                uri: "spotify:playlist:liked-songs",
                tracks: { total: 0 },
              },
              ...result.items,
            ]
          : result.items;

        if (append) {
          setPlaylists((prev) => [...prev, ...updatedPlaylists]);
        } else {
          setPlaylists(updatedPlaylists);
        }
        setTotal(result.total + 1); // +1 for the liked songs playlist
        setOffset(offsetValue + updatedPlaylists.length);
      } else {
        if (!append) {
          setError("Could not load your playlists");
        }
      }
    } catch (err) {
      console.error("Error loading playlists:", err);
      if (!append) {
        setError("Error loading playlists");
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const handlePlayPlaylist = async (uri: string) => {
    try {
      await playPlaylist(uri);
      // Find the playlist ID from the URI
      const playlistId = uri.split(":").pop() || null;
      setPlayingPlaylistId((prevId) =>
        prevId === playlistId ? null : playlistId
      );
    } catch (error) {
      console.error("Failed to play playlist:", error);
    }
  };

  const handleSelectPlaylist = (id: string) => {
    setSelectedPlaylistId(id);
  };

  const handleLoadMore = () => {
    console.log("Loading more playlists...", {
      offset,
      total,
      current: playlists.length,
    });
    if (offset < total && playlists.length < maxItems) {
      // Pass the actual offset without liked songs for API call since it's added manually
      fetchPlaylists(offset - 1, true);
    }
  };

  const handleBack = () => {
    setSelectedPlaylistId(null);
  };

  // Show playlist detail if a playlist is selected
  if (selectedPlaylistId) {
    return (
      <PlaylistDetail
        playlistId={selectedPlaylistId}
        onBack={handleBack}
        isPlaying={selectedPlaylistId === playingPlaylistId}
        onPlay={(uri: string) => handlePlayPlaylist(uri)}
      />
    );
  }

  const hasMore = offset < total && playlists.length < maxItems;

  return (
    <MediaGrid
      title="Your Playlists"
      items={playlists}
      loading={loading}
      loadingMore={loadingMore}
      error={error}
      onRetry={() => fetchPlaylists()}
      onPlay={handlePlayPlaylist}
      onSelect={handleSelectPlaylist}
      onLoadMore={handleLoadMore}
      hasMore={hasMore}
      type="playlist"
      currentlyPlayingId={playingPlaylistId}
    />
  );
}
