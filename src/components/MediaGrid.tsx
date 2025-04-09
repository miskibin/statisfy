import { Button } from "@/components/ui/button";
import { Play, ListMusic, Disc, ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";

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
  error: string | null;
  onRetry: () => void;
  onPlay?: (uri: string) => void; // Optional for albums without playback
  pagination?: {
    offset: number;
    limit: number;
    total: number;
    onNext: () => void;
    onPrevious: () => void;
  };
  type: "playlist" | "album"; // To differentiate between playlists and albums
}

export function MediaGrid({
  title,
  items,
  loading,
  error,
  onRetry,
  onPlay,
  pagination,
  type,
}: MediaGridProps) {
  if (loading) {
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

  if (error) {
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{title}</h1>
        {pagination && pagination.total > pagination.limit && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={pagination.onPrevious}
              disabled={pagination.offset === 0}
              className="flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <span className="text-sm px-2">
              {pagination.offset + 1}-
              {Math.min(pagination.offset + pagination.limit, pagination.total)}{" "}
              of {pagination.total}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={pagination.onNext}
              disabled={
                pagination.offset + pagination.limit >= pagination.total
              }
              className="flex items-center gap-1"
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {items.map((item) => (
          <div
            key={item.id}
            className={`group ${onPlay ? "cursor-pointer" : ""}`}
            onClick={() => onPlay && item.uri && onPlay(item.uri)}
          >
            <div className="aspect-square bg-muted/40 rounded-md overflow-hidden relative mb-2 group-hover:opacity-80 transition-opacity">
              {item.images && item.images.length > 0 && item.images[0]?.url ? (
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
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="default"
                    size="icon"
                    className="rounded-full h-12 w-12"
                  >
                    <Play className="h-6 w-6 ml-0.5" />
                  </Button>
                </div>
              )}
            </div>
            <div className="truncate font-medium">{item.name}</div>
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
        ))}
      </div>
    </div>
  );
}
