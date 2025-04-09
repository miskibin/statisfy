import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Play, Clock, ArrowLeft, Pause, Music } from "lucide-react";

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
  artistsData?: Array<{ id: string; name: string }>;
  duration: number;
  uri: string;
  onPlay: (uri: string) => Promise<void>;
  isPlaying?: boolean;
  isCurrentTrack?: boolean;
  onArtistClick?: (artistId: string) => void;
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
  noScrollContainer?: boolean; // New prop to control whether to add scrollable container
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
        <h1 className="text-2xl font-bold text-ellipsis overflow-hidden whitespace-nowrap">
          {name}
        </h1>
      </div>

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

        <div className="w-48 h-48 shrink-0 bg-muted/40 rounded-md overflow-hidden">
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
    </>
  );
}

function MediaDetailTrack({
  index,
  name,
  artists,
  artistsData,
  duration,
  uri,
  onPlay,
  isCurrentTrack,
  onArtistClick,
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
        <div className="truncate text-xs text-muted-foreground">
          {artistsData && onArtistClick
            ? // Render clickable artist names
              artistsData.map((artist, i) => (
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
            : // Default non-clickable artist string
              artists}
        </div>
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
  noScrollContainer = false, // Default to false to maintain backward compatibility
}: MediaDetailProps) {
  if (loading) {
    return <MediaDetailLoading onBack={onBack} title={title} />;
  }

  if (error || !headerProps) {
    return <MediaDetailError error={error} onBack={onBack} title={title} />;
  }

  // The content of the component
  const content = (
    <>
      <div className="bg-background">
        <div className="p-6 pb-0">
          <MediaDetailHeader {...headerProps} />
        </div>
      </div>

      {/* Track listing */}
      <div className="px-6 pb-6 mt-12">
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
    </>
  );

  // Return with or without the scrollable container based on noScrollContainer prop
  return noScrollContainer ? (
    content
  ) : (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto scrollbar scrollbar-thumb-accent scrollbar-track-base-100 scrollbar-thumb-rounded-full scrollbar-track-rounded-full">
        {content}
      </div>
    </div>
  );
}
