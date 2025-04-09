import { useState, useEffect } from "react";
import { MediaGrid } from "@/components/MediaGrid";
import { getNewReleases } from "@/utils/spotify";

export function NewReleases() {
  const [albums, setAlbums] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
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

  return (
    <MediaGrid
      title="New Releases"
      items={albums}
      loading={loading}
      error={error}
      onRetry={() => fetchNewReleases()}
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
