import { memo, useEffect, useState, useCallback } from "react";
import {
  // LogOut,
  Moon,
  Sun,
  Minus,
  Square,
  X,
  Search as SearchIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useTheme } from "@/components/theme-provider";
import { getCurrentWindow } from "@tauri-apps/api/window";

interface HeaderProps {
  onLogout: (() => void) | undefined;
  onSearch?: (query: string) => void;
}

export const Header = memo(({ onLogout, onSearch }: HeaderProps) => {
  const { theme, setTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    // Import window controls functionality
    const initWindowControls = async () => {
      try {
        window.appWindow = getCurrentWindow();
      } catch (err) {
        console.error("Failed to initialize window controls:", err);
      }
    };

    initWindowControls();
  }, []);

  const handleMinimize = () => {
    if (window.appWindow) {
      window.appWindow.minimize();
    }
  };

  const handleMaximize = () => {
    if (window.appWindow) {
      window.appWindow.toggleMaximize();
    }
  };

  const handleClose = () => {
    if (window.appWindow) {
      window.appWindow.close();
    }
  };

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (onSearch && searchQuery.trim()) {
        onSearch(searchQuery.trim());
      }
    },
    [searchQuery, onSearch]
  );

  return (
    <header
      data-tauri-drag-region
      className="border-b px-4 flex items-center justify-between h-14"
    >
      <div className="flex items-center gap-2">
        {onLogout && <SidebarTrigger className="h-10 w-10" />}
        {/* <div className="font-medium text-lg">SpotiLite</div> */}
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>

      {onSearch && (
        <form onSubmit={handleSearch} className="flex-1 max-w-md mx-4">
          <div className="relative">
            <Input
              type="search"
              placeholder="Search songs, artists, albums..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full"
            />
            <button
              type="submit"
              className="absolute left-3 top-1/2 -translate-y-1/2"
            >
              <SearchIcon className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </form>
      )}

      <div className="flex items-center gap-2">
        {/* 
        {onLogout && (
          <Button
            variant="ghost"
            size="sm"
            className="h-10 gap-1 text-sm"
            onClick={onLogout}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        )} */}

        {/* Window controls */}
        <div className="flex items-center ml-2 -mr-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-12 rounded-none pb-1 hover:bg-muted"
            onClick={handleMinimize}
            title="Minimize"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-12 rounded-none pb-1 hover:bg-muted"
            onClick={handleMaximize}
            title="Maximize"
          >
            <Square className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-12 rounded-none pb-1 hover:bg-destructive hover:text-destructive-foreground"
            onClick={handleClose}
            title="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
});
