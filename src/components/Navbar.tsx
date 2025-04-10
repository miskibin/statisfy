import { Button } from "@/components/ui/button";
import { Home, Search, Library, LogOut } from "lucide-react";

interface NavbarProps {
  onLogout: () => void;
}

export function Navbar({ onLogout }: NavbarProps) {
  return (
    <div className="w-full px-4 py-3 border-b bg-background flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="font-bold text-lg">SpotiLite</span>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="rounded-full">
          <Home className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Search className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Library className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={onLogout}
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
