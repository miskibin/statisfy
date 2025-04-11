import { Check, Clock, Image, Pause, Play, Plus } from "lucide-react";
import { Button } from "./ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { addTrackToQueue } from "@/utils/queue";
import { useState, useEffect } from "react";
import { usePlayerStore } from "@/stores/playerStore";

export interface TrackItemProps {
  id: string;
  index: number;
  name: string;
  artists: string;
  artistsData?: Array<{ id: string; name: string }>;
  duration: number;
  uri: string;
  imageUrl?: string; // Album art URL
  onPlay: (uri: string) => Promise<void>;
  isPlaying?: boolean;
  isCurrentTrack?: boolean;
  isRecentlyPlayed?: boolean;
  isManuallyAdded?: boolean;
  onArtistClick?: (artistId: string) => void;
  albumId?: string;
  albumName?: string;
  onAlbumClick?: (albumId: string) => void;
  actions?: React.ReactNode;
}

interface TrackListProps {
  tracks: TrackItemProps[];
  showHeader?: boolean;
  actionButtons?: React.ReactNode;
  showAddToQueueButton?: boolean;
}

export function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function TrackItem({
  name,
  artists,
  artistsData,
  duration,
  uri,
  imageUrl,
  onPlay,
  isCurrentTrack,
  isPlaying,
  isRecentlyPlayed,
  isManuallyAdded: propIsManuallyAdded, // Rename to avoid conflict with store check
  onArtistClick,
  albumId,
  albumName,
  onAlbumClick,
  actions,
}: TrackItemProps) {
  // Track when this item was added to queue for visual feedback
  const [justAddedToQueue, setJustAddedToQueue] = useState(false);
  const [isAddingToQueue, setIsAddingToQueue] = useState(false);
  const [isInQueue, setIsInQueue] = useState(propIsManuallyAdded || false);

  // Check if this track is in the manually added tracks set
  useEffect(() => {
    const checkIfManuallyAdded = () => {
      const manuallyAdded = usePlayerStore.getState().manuallyAddedTracks;
      setIsInQueue(manuallyAdded.has(uri) || propIsManuallyAdded || false);
    };

    // Check immediately and subscribe to store changes
    checkIfManuallyAdded();

    // Subscribe to store changes
    const unsubscribe = usePlayerStore.subscribe((state) => {
      if (state.manuallyAddedTracks) {
        checkIfManuallyAdded();
      }
    });

    return () => unsubscribe();
  }, [uri, propIsManuallyAdded]);

  // Add a track to the queue (next in line)
  const handleAddToQueue = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (justAddedToQueue || isAddingToQueue || isInQueue) return;

    setIsAddingToQueue(true);
    try {
      const success = await addTrackToQueue(uri, true);

      if (success) {
        // Show toast notification
        toast.success(`Added "${name}" to queue`);

        // Show visual feedback temporarily
        setJustAddedToQueue(true);
        setIsInQueue(true);
        setTimeout(() => setJustAddedToQueue(false), 1000);
      } else {
        toast.error("Failed to add to queue");
      }
    } catch (error) {
      toast.error("Failed to add to queue");
      console.error("Error adding track to queue:", error);
    } finally {
      setIsAddingToQueue(false);
    }
  };

  return (
    <div
      className={`grid grid-cols-[auto_2fr_1.5fr_auto] gap-4 px-4 py-2 rounded-md group cursor-pointer transition-colors duration-200
        ${isCurrentTrack ? "bg-muted/50" : "hover:bg-muted/30"} 
        ${isRecentlyPlayed ? "opacity-60" : ""} 
        ${isInQueue ? "border-l-2 border-primary" : ""}
      `}
      onClick={() => onPlay(uri)}
    >
      <div className="w-10 h-10 flex items-center justify-center relative">
        {/* Album thumbnail with play/pause overlay */}
        <div className="w-10 h-10 overflow-hidden rounded-sm">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-muted/30 flex items-center justify-center">
              <Image className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Play/Pause overlay */}
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          {isCurrentTrack && isPlaying ? (
            <Pause className="h-5 w-5 text-white" />
          ) : (
            <Play className="h-5 w-5 text-white" />
          )}
        </div>
      </div>

      <div className="min-w-0 flex flex-col justify-center">
        <div className="flex items-center">
          <div
            className={`truncate ${
              isCurrentTrack ? "font-semibold" : "font-medium"
            }`}
          >
            {name}
            {isCurrentTrack && (
              <span className="ml-1 text-primary font-bold" title="Now Playing">
                •
              </span>
            )}
          </div>

          {/* Add to queue button */}
          <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 p-0"
                    onClick={handleAddToQueue}
                    disabled={isInQueue || isAddingToQueue}
                  >
                    {isAddingToQueue ? (
                      <span className="animate-spin">•</span>
                    ) : justAddedToQueue || isInQueue ? (
                      <Check className="h-3 w-3 text-primary" />
                    ) : (
                      <Plus className="h-3 w-3" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {isInQueue
                      ? "Already in queue"
                      : isAddingToQueue
                      ? "Adding to queue..."
                      : "Add to queue (next)"}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {artistsData && onArtistClick
            ? artistsData.map((artist, i) => (
                <span key={artist.id}>
                  {i > 0 && ", "}
                  <span
                    className="hover:underline hover:text-primary cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onArtistClick(artist.id);
                    }}
                  >
                    {artist.name}
                  </span>
                </span>
              ))
            : artists}
        </div>
      </div>

      <div className="min-w-0 text-sm text-muted-foreground self-center truncate block">
        {albumName && onAlbumClick && albumId ? (
          <span
            className="truncate hover:underline hover:text-primary cursor-pointer inline-block max-w-full"
            onClick={(e) => {
              e.stopPropagation();
              onAlbumClick(albumId);
            }}
          >
            {albumName}
          </span>
        ) : albumName ? (
          <span className="truncate inline-block max-w-full">{albumName}</span>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        {actions}
        <div className="text-xs text-muted-foreground self-center">
          {formatDuration(duration)}
        </div>
      </div>
    </div>
  );
}

export function TrackList({
  tracks,
  showHeader = true,
  actionButtons,
}: TrackListProps) {
  return (
    <div>
      {showHeader && (
        <div className="grid grid-cols-[auto_2fr_1.5fr_auto] gap-4 mb-1 px-4 text-xs text-muted-foreground font-medium border-b border-muted/20 pb-2">
          <div className="w-10">#</div>
          <div>TITLE</div>
          <div>ALBUM</div>
          <div className="flex items-center gap-2 justify-self-end">
            <Clock className="h-3 w-3" />
          </div>
        </div>
      )}

      {tracks.map((track) => (
        <TrackItem key={`${track.id}-${track.index}`} {...track} />
      ))}

      {actionButtons && <div className="mt-2">{actionButtons}</div>}
    </div>
  );
}
