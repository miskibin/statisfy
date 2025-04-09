import { useState, useEffect } from "react";
import { MediaGrid } from "@/components/MediaGrid";
import { getNewReleases, playAlbum } from "@/utils/spotify";
import { AlbumDetail } from "@/components/AlbumDetail";

export function NewReleases() {
  const [albums, setAlbums] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [playingAlbumId, setPlayingAlbumId] = useState<string | null>(null);
  const limit = 20;
  const maxItems = 100; // Maximum number of items to load with infinite scroll

  const fetchNewReleases = async (offsetValue = 0, append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setError(null);
    }

    try {
      const result = await getNewReleases(limit, offsetValue);
      if (result && result.items) {
        if (append) {
          setAlbums(prev => [...prev, ...result.items]);
        } else {
          setAlbums(result.items);
        }
        setTotal(result.total);
        setOffset(offsetValue);
      } else {
        if (!append) {
          setError("Could not load new releases");
        }
      }
    } catch (err) {
      console.error("Error loading new releases:", err);
      if (!append) {
        setError("Error loading new releases");
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchNewReleases();
  }, []);

  const handlePlayAlbum = async (uri: string) => {
    try {
      await playAlbum(uri);
      // Find the album ID from the URI
      const albumId = uri.split(":").pop() || null;
      setPlayingAlbumId((prevId) => (prevId === albumId ? null : albumId));
    } catch (error) {
      console.error("Failed to play album:", error);
    }
  };

  const handleSelectAlbum = (id: string) => {
    setSelectedAlbumId(id);
  };

  const handleBack = () => {
    setSelectedAlbumId(null);
  };

  const handleLoadMore = () => {
    if (offset + limit < total && albums.length < maxItems) {
      fetchNewReleases(offset + limit, true);
    }
  };

  // Show album detail if an album is selected
  if (selectedAlbumId) {
    return (
      <AlbumDetail
        albumId={selectedAlbumId}
        onBack={handleBack}
        isPlaying={selectedAlbumId === playingAlbumId}
        onPlay={(uri: string) => handlePlayAlbum(uri)}
      />
    );
  }

  const hasMore = offset + limit < total && albums.length < maxItems;

  return (
    <MediaGrid
      title="New Releases"
      items={albums}
      loading={loading}
      loadingMore={loadingMore}
      error={error}
      onRetry={() => fetchNewReleases()}
      onPlay={handlePlayAlbum}
      onSelect={handleSelectAlbum}
      onLoadMore={handleLoadMore}
      hasMore={hasMore}
      type="album"
      currentlyPlayingId={playingAlbumId}
    />
  );
}
