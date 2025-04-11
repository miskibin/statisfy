import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Play, ArrowLeft, Pause, Music } from "lucide-react";
import { TrackList, TrackItemProps } from "./TrackList";

interface MediaDetailHeaderProps {
  images: { url: string }[];
  name: string;
  primaryInfo: ReactNode;
  secondaryInfo: ReactNode;
  onPlay: () => Promise<boolean> | Promise<void>; // Updated to accept both return types
  onBack: () => void;
  isPlaying?: boolean;
  compact?: boolean;
}

interface MediaDetailProps {
  title: string;
  loading: boolean;
  error: string | null;
  headerProps?: MediaDetailHeaderProps;
  tracks: TrackItemProps[];
  onBack: () => void;
  loadingMore?: boolean;
  hasMore?: boolean;
  loadingRef?: (node: HTMLDivElement) => void;
  noScrollContainer?: boolean;
  actionButtons?: React.ReactNode;
  footer?: React.ReactNode; // Add footer prop
}

function MediaDetailHeader({
  images,
  name,
  primaryInfo,
  secondaryInfo,
  onPlay,
  onBack,
  isPlaying,
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
  noScrollContainer = false,
  actionButtons,
  footer,
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
      {actionButtons && <div className="p-6">{actionButtons}</div>}

      {/* Track listing - now using the TrackList component */}
      <div className="px-6 pb-6 mt-12">
        <TrackList
          tracks={tracks}
          showHeader={true}
          actionButtons={undefined}
        />

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

        {footer}
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
