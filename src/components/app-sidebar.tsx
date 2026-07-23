import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FolderTree,
  Network,
  BookOpen,
  GitCompare,
  FileCode2,
  Github,
  Plug,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const items = [
  { title: "Overview", url: "/", icon: LayoutDashboard },
  { title: "Code tree", url: "/tree", icon: FolderTree },
  { title: "Architecture", url: "/architecture", icon: Network },
  { title: "Hodges papers", url: "/papers", icon: BookOpen },
  { title: "vs EPA SWMM5 (C)", url: "/c-alternative", icon: GitCompare },
  { title: "C translation", url: "/c-translation", icon: FileCode2 },
  { title: "Connect via MCP", url: "/mcp-setup", icon: Plug },
] as const;

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (url: string) =>
    url === "/" ? pathname === "/" : pathname.startsWith(url);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2 px-2 py-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground font-display text-base">
            S+
          </div>
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="font-display text-base">SWMM5+</span>
            <span className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">
              Repo Explorer
            </span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Sections</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="View on GitHub">
              <a
                href="https://github.com/CIMM-ORG/SWMM5plus-1"
                target="_blank"
                rel="noreferrer"
              >
                <Github />
                <span>CIMM-ORG/SWMM5plus-1</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
