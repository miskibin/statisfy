import { memo, useEffect } from "react";
import { LogOut, Moon, Sun, Minus, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useTheme } from "@/components/theme-provider";
import { getCurrentWindow } from "@tauri-apps/api/window";
interface HeaderProps {
  onLogout: () => void;
}

export const Header = memo(({ onLogout }: HeaderProps) => {
  const { theme, setTheme } = useTheme();

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

  return (
    <header
      data-tauri-drag-region
      className="border-b px-4 flex items-center justify-between h-14"
    >
      <div className="flex items-center gap-2">
        <SidebarTrigger className="h-10 w-10" />
        <div className="font-medium text-lg">Statisfy</div>
      </div>

      <div className="flex items-center gap-2">
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

        <Button
          variant="ghost"
          size="sm"
          className="h-10 gap-1 text-sm"
          onClick={onLogout}
        >
          <LogOut className="h-4 w-4" /> Logout
        </Button>

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
