import { Button } from "@/components/ui/button";
import { Play, Pause, ListMusic, Disc } from "lucide-react";
import { ReactNode } from "react";

interface MediaCardProps {
  id: string;
  name: string;
  images: { url: string }[];
  uri?: string;
  onClick: (id: string) => void;
  onPlay?: (uri: string) => void;
  isPlaying?: boolean;
  type: "album" | "playlist";
  /* Secondary information like artists or number of tracks */
  secondaryInfo?: ReactNode;
  /* Additional info like release year, album type */
  additionalInfo?: ReactNode;
}

export function MediaCard({
  id,
  name,
  images,
  uri,
  onClick,
  onPlay,
  isPlaying = false,
  type,
  secondaryInfo,
  additionalInfo,
}: MediaCardProps) {
  const Icon = type === "playlist" ? ListMusic : Disc;

  return (
    <div className="group cursor-pointer" onClick={() => onClick(id)}>
      <div className="aspect-square bg-muted/40 rounded-md overflow-hidden relative mb-2">
        {/* Cover image or placeholder */}
        {images && images.length > 0 && images[0]?.url ? (
          <img
            src={images[0].url}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon className="h-12 w-12 text-muted-foreground" />
          </div>
        )}

        {/* Play overlay when hovering */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {onPlay && uri && (
            <Button
              variant="secondary"
              size="icon"
              className="rounded-full h-12 w-12"
              onClick={(e) => {
                e.stopPropagation();
                onPlay(uri);
              }}
            >
              {isPlaying ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6 ml-0.5" />
              )}
            </Button>
          )}
        </div>

        {/* Currently playing indicator */}
        {isPlaying && (
          <div className="absolute bottom-2 right-2 rounded-full bg-primary w-3 h-3 animate-pulse" />
        )}
      </div>

      {/* Media information */}
      <div
        className={`truncate font-medium ${isPlaying ? "text-primary" : ""}`}
      >
        {name}
      </div>

      {secondaryInfo && (
        <div className="truncate text-xs text-muted-foreground">
          {secondaryInfo}
        </div>
      )}

      {additionalInfo && (
        <div className="truncate text-xs text-muted-foreground">
          {additionalInfo}
        </div>
      )}
    </div>
  );
}
