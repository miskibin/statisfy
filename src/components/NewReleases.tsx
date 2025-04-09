import { useState, useEffect } from "react";
import { MediaGrid } from "@/components/MediaGrid";
import { getNewReleases, playAlbum } from "@/utils/spotify";
import { AlbumDetail } from "@/components/AlbumDetail";

export function NewReleases() {
  const [albums, setAlbums] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const limit = 20;

  const fetchNewReleases = async (offsetValue = 0) => {
    setLoading(true);
    setError(null);

    try {
      const result = await getNewReleases(limit, offsetValue);
      if (result && result.items) {
        setAlbums(result.items);
        setTotal(result.total);
        setOffset(offsetValue);
      } else {
        setError("Could not load new releases");
      }
    } catch (err) {
      setError("Error loading new releases");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNewReleases();
  }, []);

  const handlePlayAlbum = async (uri: string) => {
    await playAlbum(uri);
  };

  const handleSelectAlbum = (id: string) => {
    setSelectedAlbumId(id);
  };

  const handleBack = () => {
    setSelectedAlbumId(null);
  };

  const nextPage = () => {
    if (offset + limit < total) {
      fetchNewReleases(offset + limit);
    }
  };

  const prevPage = () => {
    if (offset - limit >= 0) {
      fetchNewReleases(offset - limit);
    }
  };

  // Show album detail if an album is selected
  if (selectedAlbumId) {
    return <AlbumDetail albumId={selectedAlbumId} onBack={handleBack} />;
  }

  return (
    <MediaGrid
      title="New Releases"
      items={albums}
      loading={loading}
      error={error}
      onRetry={() => fetchNewReleases()}
      onPlay={handlePlayAlbum}
      onSelect={handleSelectAlbum}
      type="album"
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
