import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { NowPlayingBar } from "@/components/NowPlayingBar";
import { Header } from "@/components/layout/Header";

interface LayoutProps {
  children: ReactNode;
  onLogout: () => void;
  navigate: (path: string) => void;
}

export function Layout({ children, onLogout, navigate }: LayoutProps) {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="flex h-screen w-full font-sans">
        <AppSidebar navigate={navigate} />

        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          <Header onLogout={onLogout} />

          <main className="flex-1 overflow-auto scrollbar scrollbar-thumb-accent scrollbar-track-base-100 scrollbar-thumb-rounded-full scrollbar-track-rounded-full">
            {children}
          </main>

          <NowPlayingBar />
        </div>
      </div>
    </SidebarProvider>
  );
}
