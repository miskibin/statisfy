import {
  Home,
  Search,
  Library,
  ListMusic,
  Heart,
  History,
  LineChart,
  Disc,
  PersonStandingIcon,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
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
    title: "Your Library",
    url: "/library",
    icon: Library,
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
    title: "Recently Played",
    url: "/recent",
    icon: History,
  },
  {
    title: "Queue",
    url: "/queue",
    icon: History,
  },
  {
    title: "New Releases",
    url: "/new-releases",
    icon: Disc,
  },
  // {
  //   title: "Statistics",
  //   url: "/stats",
  //   icon: LineChart,
  // },
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
          <SidebarGroupLabel>Statisfy</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a
                      href={item.url}
                      onClick={(e) => handleNavigation(item.url, e)}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
