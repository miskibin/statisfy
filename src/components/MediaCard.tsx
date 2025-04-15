import { Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReactNode } from "react";

interface MediaCardProps {
  id: string;
  name: string;
  images: { url: string }[];
  uri?: string;
  onClick?: () => void;
  onPlay?: (uri: string) => void;
  isPlaying?: boolean;
  // type: "playlist" | "album" | "artist";
  secondaryInfo?: string;
  useCircularImage?: boolean;
  placeholderIcon?: ReactNode;
}

export function MediaCard({
  name,
  images,
  uri,
  onClick,
  onPlay,
  isPlaying = false,
  secondaryInfo,
  useCircularImage = false,
  placeholderIcon,
}: MediaCardProps) {
  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (uri && onPlay) {
      onPlay(uri);
    }
  };

  return (
    <div
      className={`group relative rounded-md bg-background hover:bg-muted/20 transition-colors ${
        onClick ? "cursor-pointer" : ""
      }`}
      onClick={onClick}
    >
      <div
        className={`relative overflow-hidden bg-muted/40 ${
          useCircularImage
            ? "rounded-full aspect-square p-1 flex items-center justify-center"
            : "rounded-md aspect-square"
        }`}
      >
        {images && images.length > 0 ? (
          <img
            src={images[0].url}
            alt={name}
            className={`h-full w-full object-cover transition-all group-hover:opacity-90 ${
              useCircularImage ? "rounded-full" : ""
            }`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            {placeholderIcon}
          </div>
        )}

        {onPlay && uri && (
          <Button
            size="icon"
            variant="secondary"
            className={`absolute shadow-lg transition-opacity ${
              useCircularImage
                ? "bottom-1/2 right-1/2 translate-x-1/2 translate-y-1/2 h-7 w-7 opacity-0 group-hover:opacity-100"
                : "bottom-1.5 right-1.5 h-8 w-8 opacity-0 group-hover:opacity-100"
            } ${isPlaying ? "opacity-100" : ""}`}
            onClick={handlePlay}
          >
            {isPlaying ? (
              <Pause
                className={`${useCircularImage ? "h-3.5 w-3.5" : "h-4 w-4"}`}
              />
            ) : (
              <Play className={`${useCircularImage ? "h-3.5 w-3.5" : "h-4 w-4"}`} />
            )}
          </Button>
        )}
      </div>
      <div className={`mt-1.5 ${useCircularImage ? "text-center" : ""}`}>
        <div className="font-medium line-clamp-1 text-sm">{name}</div>
        {secondaryInfo && (
          <p className="text-xs text-muted-foreground line-clamp-1">{secondaryInfo}</p>
        )}
      </div>
    </div>
  );
}
