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
        if (append) {
          setPlaylists((prev) => [...prev, ...result.items]);
        } else {
          setPlaylists(result.items);
        }
        setTotal(result.total);
        setOffset(offsetValue);
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
    if (offset + limit < total && playlists.length < maxItems) {
      fetchPlaylists(offset + limit, true);
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

  const hasMore = offset + limit < total && playlists.length < maxItems;

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
