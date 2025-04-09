import { ReactNode, useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Play, Clock, ArrowLeft, Pause, Music } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MediaDetailHeaderProps {
  images: { url: string }[];
  name: string;
  primaryInfo: ReactNode;
  secondaryInfo: ReactNode;
  onPlay: () => Promise<void>;
  onBack: () => void;
  isPlaying?: boolean;
  compact?: boolean;
}

interface MediaDetailTrackProps {
  id: string;
  index: number;
  name: string;
  artists: string;
  duration: number;
  uri: string;
  onPlay: (uri: string) => Promise<void>;
  isPlaying?: boolean;
  isCurrentTrack?: boolean;
}

interface MediaDetailProps {
  title: string;
  loading: boolean;
  error: string | null;
  headerProps?: MediaDetailHeaderProps;
  tracks: MediaDetailTrackProps[];
  onBack: () => void;
  loadingMore?: boolean;
  hasMore?: boolean;
  loadingRef?: (node: HTMLDivElement) => void;
}

export function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function MediaDetailHeader({
  images,
  name,
  primaryInfo,
  secondaryInfo,
  onPlay,
  onBack,
  isPlaying,
  compact = false,
}: MediaDetailHeaderProps) {
  return (
    <>
      <div className="flex items-center mb-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1
          className={`${
            compact ? "text-xl" : "text-2xl"
          } font-bold text-ellipsis overflow-hidden whitespace-nowrap`}
        >
          {name}
        </h1>

        {compact && (
          <Button
            className="ml-auto w-fit flex items-center gap-2"
            onClick={onPlay}
            size="sm"
          >
            {isPlaying ? (
              <>
                <Pause className="h-3 w-3" /> Pause
              </>
            ) : (
              <>
                <Play className="h-3 w-3" /> Play
              </>
            )}
          </Button>
        )}
      </div>

      {!compact && (
        <div className="flex flex-row gap-6 mb-8 justify-between">
          <div className="flex flex-col justify-between">
            <div>
              {primaryInfo}
              {secondaryInfo}
            </div>

            <Button className="w-fit flex items-center gap-2" onClick={onPlay}>
              {isPlaying ? (
                <>
                  <Pause className="h-4 w-4" /> Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" /> Play
                </>
              )}
            </Button>
          </div>

          <div className="w-48 h-48 shrink-0 bg-muted/40 rounded-md overflow-hidden transition-all duration-300">
            {images && images.length > 0 ? (
              <img
                src={images[0].url}
                alt={name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function MediaDetailTrack({
  index,
  name,
  artists,
  duration,
  uri,
  onPlay,
  isCurrentTrack,
}: MediaDetailTrackProps) {
  return (
    <div
      className={`grid grid-cols-[auto_1fr_auto] gap-4 px-4 py-2 hover:bg-muted/30 rounded-md group cursor-pointer ${
        isCurrentTrack ? "bg-muted/50" : ""
      }`}
      onClick={() => onPlay(uri)}
    >
      <div className="w-8 flex items-center text-muted-foreground text-sm">
        {isCurrentTrack ? (
          <div className="relative w-4 h-4 flex items-center justify-center">
            <Pause className="h-4 w-4 absolute" />
          </div>
        ) : (
          <>
            <span className="group-hover:hidden">{index}</span>
            <Play className="h-4 w-4 hidden group-hover:block" />
          </>
        )}
      </div>

      <div className="min-w-0">
        <div
          className={`truncate ${
            isCurrentTrack ? "font-semibold" : "font-medium"
          }`}
        >
          {name}
        </div>
        <div className="truncate text-xs text-muted-foreground">{artists}</div>
      </div>

      <div className="text-xs text-muted-foreground self-center">
        {formatDuration(duration)}
      </div>
    </div>
  );
}

function MediaDetailLoading({
  onBack,
  title,
}: {
  onBack: () => void;
  title: string;
}) {
  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" onClick={onBack} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Loading {title}...</h1>
      </div>
      <div className="animate-pulse">
        <div className="flex gap-6">
          <div className="w-48 h-48 bg-muted/40 rounded-md"></div>
          <div className="flex-1">
            <div className="h-4 bg-muted/40 rounded-md w-1/4 mb-2"></div>
            <div className="h-4 bg-muted/40 rounded-md w-1/3 mb-4"></div>
            <div className="h-10 bg-muted/40 rounded-md w-32"></div>
          </div>
        </div>
        <div className="mt-8">
          <div className="h-10 bg-muted/40 rounded-md w-full mb-4"></div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-16 bg-muted/40 rounded-md w-full mb-2"
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MediaDetailError({
  error,
  onBack,
  title,
}: {
  error: string | null;
  onBack: () => void;
  title: string;
}) {
  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" onClick={onBack} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Error</h1>
      </div>
      <Card className="p-6 text-center">
        <p className="text-muted-foreground mb-4">
          {error || `Could not load ${title}`}
        </p>
        <Button onClick={() => window.location.reload()}>Refresh</Button>
      </Card>
    </div>
  );
}

export function MediaDetail({
  title,
  loading,
  error,
  headerProps,
  tracks,
  onBack,
  loadingMore = false,
  hasMore = false,
  loadingRef,
}: MediaDetailProps) {
  const [compact, setCompact] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollThreshold = 20;

  // Modified scroll handler with only threshold buffer
  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      const scrollTop = scrollRef.current.scrollTop;
      // Add a small buffer around the threshold to prevent flickering
      if (
        (compact && scrollTop < scrollThreshold - 5) ||
        (!compact && scrollTop > scrollThreshold + 5)
      ) {
        setCompact(scrollTop > scrollThreshold);
      }
    }
  }, [compact]);

  useEffect(() => {
    const currentRef = scrollRef.current;
    if (currentRef) {
      currentRef.addEventListener("scroll", handleScroll, { passive: true });
      return () => {
        currentRef.removeEventListener("scroll", handleScroll);
      };
    }
  }, [handleScroll]);

  if (loading) {
    return <MediaDetailLoading onBack={onBack} title={title} />;
  }

  if (error || !headerProps) {
    return <MediaDetailError error={error} onBack={onBack} title={title} />;
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scrollbar scrollbar-thumb-accent scrollbar-track-base-100 scrollbar-thumb-rounded-full scrollbar-track-rounded-full"
        onScroll={handleScroll}
      >
        <div className="sticky top-0 bg-background z-10">
          <div className="p-6">
            <MediaDetailHeader {...headerProps} compact={compact} />
          </div>
        </div>

        {/* Track listing */}
        <div className="px-6 pb-6">
          <div className="grid grid-cols-[auto_1fr_auto] gap-4 mb-1 px-4 text-xs text-muted-foreground font-medium border-b border-muted/20 pb-2">
            <div className="w-8">#</div>
            <div>TITLE</div>
            <div className="flex items-center gap-2 justify-self-end">
              <Clock className="h-3 w-3" />
            </div>
          </div>

          {tracks.map((track) => (
            <MediaDetailTrack key={`${track.id}-${track.index}`} {...track} />
          ))}

          {loadingMore && (
            <div className="flex justify-center py-4">
              <div className="animate-pulse flex flex-col items-center">
                <div className="h-4 bg-muted/40 rounded-md w-24 mb-2"></div>
                <div className="h-4 bg-muted/40 rounded-md w-16"></div>
              </div>
            </div>
          )}

          {hasMore && !loadingMore && loadingRef && (
            <div ref={loadingRef} className="h-8 w-full"></div>
          )}
        </div>
      </div>
    </div>
  );
}
