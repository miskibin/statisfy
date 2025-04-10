import { Clock, Image, Pause, Play } from "lucide-react";
import { Button } from "./ui/button";

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
  onArtistClick?: (artistId: string) => void;
  albumId?: string;
  albumName?: string;
  onAlbumClick?: (albumId: string) => void;
}

interface TrackListProps {
  tracks: TrackItemProps[];
  showHeader?: boolean;
  actionButtons?: React.ReactNode;
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
  onArtistClick,
  albumId,
  albumName,
  onAlbumClick,
}: TrackItemProps) {
  return (
    <div
      className={`grid grid-cols-[auto_2fr_1.5fr_auto] gap-4 px-4 py-2 hover:bg-muted/30 rounded-md group cursor-pointer ${
        isCurrentTrack ? "bg-muted/50" : ""
      }`}
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
        <div
          className={`truncate ${
            isCurrentTrack ? "font-semibold" : "font-medium"
          }`}
        >
          {name}
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

      <div className="text-xs text-muted-foreground self-center">
        {formatDuration(duration)}
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
