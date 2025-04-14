import { ReactNode, useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { NowPlayingBar } from "@/components/NowPlayingBar";
import { Header } from "@/components/layout/Header";
import Search from "@/components/Search";

interface LayoutProps {
  children: ReactNode;
  onLogout: () => void;
  navigate: (path: string) => void;
}

export function Layout({ children, onLogout, navigate }: LayoutProps) {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setIsSearching(true);
  };

  const handleNavigate = (path: string) => {
    setIsSearching(false);
    navigate(path);
  };

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="flex h-screen w-full font-sans">
        <AppSidebar navigate={handleNavigate} />
        <div className="texture" />
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          <Header onLogout={onLogout} onSearch={handleSearch} />

          <main className="flex-1 overflow-auto scrollbar scrollbar-thumb-accent scrollbar-track-base-100 scrollbar-thumb-rounded-full scrollbar-track-rounded-full">
            {isSearching ? <Search query={searchQuery} /> : children}
          </main>

          <NowPlayingBar />
        </div>
      </div>
    </SidebarProvider>
  );
}
