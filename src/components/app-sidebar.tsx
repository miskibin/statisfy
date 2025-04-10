"use client";

import type React from "react";

import { Home, ListMusic, Bug, Disc, PersonStandingIcon } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

interface AppSidebarProps {
  navigate: (path: string) => void;
}

// Menu items.
const items = [
  {
    title: "Home",
    url: "/",
    icon: Home,
  },
  {
    title: "Artists",
    url: "/artists",
    icon: PersonStandingIcon,
  },
  {
    title: "Playlists",
    url: "/playlists",
    icon: ListMusic,
  },
  {
    title: "Queue",
    url: "/queue",
    icon: Bug,
  },
  {
    title: "New Releases",
    url: "/new-releases",
    icon: Disc,
  },
];

export function AppSidebar({ navigate }: AppSidebarProps) {
  // Handle click on sidebar item
  const handleNavigation = (url: string, e: React.MouseEvent) => {
    e.preventDefault();
    navigate(url);
  };

  return (
    <Sidebar variant="floating" collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>SpotiLite</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className="[&>a>svg]:size-6" // Increase icon size from default size-4 to size-6
                    tooltip={item.title} // Add tooltip for collapsed state
                  >
                    <a
                      href={item.url}
                      onClick={(e) => handleNavigation(item.url, e)}
                      className="flex items-center gap-3" // Increase gap between icon and text
                    >
                      <item.icon className="shrink-0" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
