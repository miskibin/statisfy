import { useState, useEffect } from "react";
import { getUserPlaylists, playPlaylist } from "@/utils/spotify";
import { MediaGrid } from "@/components/MediaGrid";

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
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const fetchPlaylists = async (offsetValue = 0) => {
    setLoading(true);
    setError(null);

    try {
      const result = await getUserPlaylists(limit, offsetValue);
      if (result && result.items) {
        setPlaylists(result.items);
        setTotal(result.total);
        setOffset(offsetValue);
      } else {
        setError("Could not load your playlists");
      }
    } catch (err) {
      setError("Error loading playlists");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const handlePlayPlaylist = async (uri: string) => {
    await playPlaylist(uri);
  };

  const nextPage = () => {
    if (offset + limit < total) {
      fetchPlaylists(offset + limit);
    }
  };

  const prevPage = () => {
    if (offset - limit >= 0) {
      fetchPlaylists(offset - limit);
    }
  };

  return (
    <MediaGrid
      title="Your Playlists"
      items={playlists}
      loading={loading}
      error={error}
      onRetry={() => fetchPlaylists()}
      onPlay={handlePlayPlaylist}
      type="playlist"
      pagination={{
        offset,
        limit,
        total,
        onNext: nextPage,
        onPrevious: prevPage,
      }}
    />
  );
}
