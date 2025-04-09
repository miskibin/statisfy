import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useEffect, useRef } from "react";
import { MediaCard } from "./MediaCard";

interface MediaItem {
  id: string;
  name: string;
  images: { url: string }[];
  uri?: string;
  tracks?: {
    total: number;
  };
  artists?: Array<{
    name: string;
  }>;
  total_tracks?: number; // For albums
}

interface MediaGridProps {
  title: string;
  items: MediaItem[];
  loading: boolean;
  loadingMore?: boolean;
  error: string | null;
  onRetry: () => void;
  onPlay?: (uri: string) => void; // Optional for albums without playback
  onSelect?: (id: string) => void; // New prop for navigation to detail view
  onLoadMore?: () => void; // New prop for infinite scroll
  hasMore?: boolean; // Whether there are more items to load
  type: "playlist" | "album"; // To differentiate between playlists and albums
  currentlyPlayingId?: string | null; // New prop to track currently playing item
}

export function MediaGrid({
  title,
  items,
  loading,
  loadingMore = false,
  error,
  onRetry,
  onPlay,
  onSelect,
  onLoadMore,
  hasMore = false,
  type,
  currentlyPlayingId,
}: MediaGridProps) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Set up intersection observer for infinite scrolling
  useEffect(() => {
    if (loading || !onLoadMore || !hasMore) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loadingMore) {
          onLoadMore();
        }
      },
      {
        rootMargin: "100px",
      }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loading, loadingMore, hasMore, onLoadMore]);

  if (loading && items.length === 0) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-medium mb-4">{title}</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-square bg-muted/40 rounded-md mb-2"></div>
              <div className="h-2.5 bg-muted/40 rounded-md w-3/4 mb-1"></div>
              <div className="h-2 bg-muted/40 rounded-md w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div className="p-4">
        <Card className="p-4 text-center">
          <p className="text-muted-foreground text-sm mb-3">{error}</p>
          <Button size="sm" onClick={onRetry}>
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="p-4">
        <Card className="p-4 text-center">
          <p className="text-muted-foreground text-sm">
            {type === "playlist"
              ? "You don't have any playlists yet"
              : "No albums available"}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-4">
        <h1 className="text-xl font-medium">{title}</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {items.map((item) => {
          const isPlaying = currentlyPlayingId === item.id;

          return (
            <MediaCard
              key={item.id}
              id={item.id}
              name={item.name}
              images={item.images}
              uri={item.uri}
              onClick={() => onSelect && onSelect(item.id)}
              onPlay={onPlay}
              isPlaying={isPlaying}
              type={type}
              secondaryInfo={
                type === "playlist"
                  ? `${item.tracks?.total || 0} tracks`
                  : item.artists?.map((a) => a.name).join(", ")
              }
            />
          );
        })}
      </div>

      {/* Element to observe for infinite scrolling */}
      {hasMore && (
        <div ref={loadMoreRef} className="flex justify-center py-4">
          {loadingMore ? (
            <div className="flex flex-col items-center gap-1">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              <p className="text-xs text-muted-foreground">Loading more...</p>
            </div>
          ) : (
            <div className="h-4" /> // Invisible element for intersection observer
          )}
        </div>
      )}
    </div>
  );
}
