import { Button } from "@/components/ui/button";
import { Play, Pause, ListMusic, Disc } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useEffect, useRef } from "react";

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
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">{title}</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-square bg-muted/40 rounded-md mb-2"></div>
              <div className="h-4 bg-muted/40 rounded-md w-3/4 mb-1"></div>
              <div className="h-3 bg-muted/40 rounded-md w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div className="p-6">
        <Card className="p-6 text-center">
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={onRetry}>Retry</Button>
        </Card>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="p-6">
        <Card className="p-6 text-center">
          <p className="text-muted-foreground">
            {type === "playlist"
              ? "You don't have any playlists yet"
              : "No albums available"}
          </p>
        </Card>
      </div>
    );
  }

  const Icon = type === "playlist" ? ListMusic : Disc;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{title}</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {items.map((item) => {
          const isPlaying = currentlyPlayingId === item.id;
          return (
            <div key={item.id} className="group">
              <div
                className={`aspect-square bg-muted/40 rounded-md overflow-hidden relative mb-2 cursor-pointer
                  ${
                    isPlaying
                      ? "opacity-100 ring-1 ring-primary"
                      : "group-hover:opacity-80"
                  } transition-opacity`}
                onClick={() => onSelect && item.id && onSelect(item.id)}
              >
                {item.images &&
                item.images.length > 0 &&
                item.images[0]?.url ? (
                  <img
                    src={item.images[0].url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Icon className="h-1/4 w-1/4 text-muted-foreground" />
                  </div>
                )}
                {onPlay && (
                  <div
                    className={`absolute inset-0 flex items-center justify-center ${
                      isPlaying
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-100"
                    } transition-opacity`}
                  >
                    <Button
                      variant={isPlaying ? "secondary" : "default"}
                      size="icon"
                      className="rounded-full h-12 w-12"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent triggering the parent onClick
                        item.uri && onPlay(item.uri);
                      }}
                    >
                      {isPlaying ? (
                        <Pause className="h-6 w-6" />
                      ) : (
                        <Play className="h-6 w-6 ml-0.5" />
                      )}
                    </Button>
                  </div>
                )}
              </div>
              <div
                className={`truncate font-medium cursor-pointer ${
                  isPlaying ? "text-primary" : ""
                }`}
                onClick={() => onSelect && item.id && onSelect(item.id)}
              >
                {item.name}
              </div>
              {type === "playlist" ? (
                <div className="truncate text-xs text-muted-foreground">
                  {item.tracks?.total || 0} tracks
                </div>
              ) : (
                <div className="truncate text-xs text-muted-foreground">
                  {item.artists?.map((a) => a.name).join(", ")}
                  {item.total_tracks && ` • ${item.total_tracks} tracks`}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Element to observe for infinite scrolling */}
      {hasMore && (
        <div ref={loadMoreRef} className="flex justify-center py-8">
          {loadingMore ? (
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              <p className="text-xs text-muted-foreground">Loading more...</p>
            </div>
          ) : (
            <div className="h-8" /> // Invisible element for intersection observer
          )}
        </div>
      )}
    </div>
  );
}
