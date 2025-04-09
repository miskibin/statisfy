import { memo } from "react";
import { LogOut, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useTheme } from "@/components/theme-provider";

interface HeaderProps {
  onLogout: () => void;
}

export const Header = memo(({ onLogout }: HeaderProps) => {
  const { theme, setTheme } = useTheme();

  return (
    <header className="border-b px-4 py-2 flex items-center justify-between">
      <SidebarTrigger />
      <div className="font-medium">Statisfy</div>
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
      </div>
    </header>
  );
});
