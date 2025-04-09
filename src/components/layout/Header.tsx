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
      className="border-b px-4 py-2 flex items-center justify-between h-10"
    >
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <div className="font-medium">Statisfy</div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 text-xs"
          onClick={onLogout}
        >
          <LogOut className="h-3 w-3" /> Logout
        </Button>

        {/* Window controls */}
        <div className="flex items-center ml-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-none hover:bg-slate-200 dark:hover:bg-slate-800"
            onClick={handleMinimize}
            title="Minimize"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-none hover:bg-slate-200 dark:hover:bg-slate-800"
            onClick={handleMaximize}
            title="Maximize"
          >
            <Square className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-none hover:bg-red-500 text-current hover:text-white"
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
