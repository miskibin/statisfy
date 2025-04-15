import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useEffect, useRef } from "react";
import { PersonStanding } from "lucide-react";
import { MediaCard } from "./MediaCard";

interface MediaItem {
  id: string;
  name: string;
  images: { url: string }[]; // Ensure images is always an array
  uri?: string;
  tracks?: {
    total: number;
  };
  artists?: Array<{
    name: string;
  }> | null; // Allow artists to be null
  total_tracks?: number; // For albums
  followers?: {
    total: number;
  }; // For artists
}

interface MediaGridProps {
  title?: string; // Make title optional
  items?: MediaItem[]; // Make items optional
  loading?: boolean; // Make loading optional
  loadingMore?: boolean;
  error?: string | null; // Make error optional
  onRetry?: () => void; // Make onRetry optional
  onPlay?: (uri: string) => void; // Optional for albums without playback
  onSelect?: (id: string) => void; // New prop for navigation to detail view
  onLoadMore?: () => void; // New prop for infinite scroll
  hasMore?: boolean; // Whether there are more items to load
  type?: "playlist" | "album" | "artist"; // Added artist type
  currentlyPlayingId?: string | null; // New prop to track currently playing item
  useCircularImages?: boolean; // Whether to use circular images
  children?: React.ReactNode; // Add children prop
}

export function MediaGrid({
  title = "",
  items = [],
  loading = false,
  loadingMore = false,
  error = null,
  onRetry = () => {},
  onPlay,
  onSelect,
  onLoadMore,
  hasMore = false,
  type = "playlist",
  currentlyPlayingId,
  useCircularImages = false,
  children,
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

  // Display for empty or loading state
  if (loading && items.length === 0 && !children) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-medium mb-4">{title}</h1>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
          {[...Array(16)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div
                className={`aspect-square bg-muted/40 ${
                  useCircularImages ? "rounded-full" : "rounded-md"
                } mb-2`}
              ></div>
              <div className="h-2.5 bg-muted/40 rounded-md w-3/4 mb-1"></div>
              <div className="h-2 bg-muted/40 rounded-md w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && items.length === 0 && !children) {
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

  if (items.length === 0 && !children) {
    return (
      <div className="p-4">
        <Card className="p-4 text-center">
          <p className="text-muted-foreground text-sm">
            {type === "playlist"
              ? "You don't have any playlists yet"
              : type === "album"
              ? "No albums available"
              : "No artists found"}
          </p>
        </Card>
      </div>
    );
  }

  // Get secondary info text based on media type
  const getSecondaryInfo = (item: MediaItem) => {
    switch (type) {
      case "playlist":
        return `${item.tracks?.total || 0} tracks`;
      case "album":
        return item.artists?.map((a) => a.name).join(", ");
      case "artist":
        return "Artist";
      default:
        return "";
    }
  };

  // Get placeholder icon for missing images
  const getPlaceholderIcon = () => {
    if (type === "artist") {
      return <PersonStanding className="h-12 w-12 text-muted-foreground" />;
    }
    return null;
  };

  // If children are provided, render them directly
  if (children) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
        {children}
      </div>
    );
  }

  return (
    <div className="p-4">
      {title && (
        <div className="mb-4">
          <h1 className="text-xl font-medium">{title}</h1>
        </div>
      )}

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
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
              secondaryInfo={getSecondaryInfo(item)}
              useCircularImage={useCircularImages}
              placeholderIcon={getPlaceholderIcon()}
            />
          );
        })}
      </div>

      {/* Element to observe for infinite scrolling */}
      {hasMore && (
        <div ref={loadMoreRef} className="flex justify-center py-3">
          {loadingMore ? (
            <div className="flex flex-col items-center gap-1">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
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
