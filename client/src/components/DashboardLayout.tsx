import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import { getInitials } from "@/lib/veriscan";
import {
  FileCheck2,
  FileSearch,
  History,
  LayoutDashboard,
  LogOut,
  PanelLeft,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";
import { AshokaChakra } from "./VeriScanLogo";
import { GovMasthead } from "./common/GovMasthead";

const menuItems = [
  { icon: LayoutDashboard, label: "Overview", path: "/dashboard" },
  { icon: FileSearch, label: "Verify Document", path: "/verify" },
  { icon: FileCheck2, label: "Verdicts & Reports", path: "/reports" },
  { icon: History, label: "Audit Ledger", path: "/history" },
  { icon: Settings2, label: "Settings", path: "/settings" },
];

const SIDEBAR_WIDTH_KEY = "veriscan-sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 220;
const MAX_WIDTH = 340;

export default function DashboardLayout({
  children,
  allowGuest = false,
}: {
  children: React.ReactNode;
  allowGuest?: boolean;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user, logout } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user && !allowGuest) {
    return (
      <div className="flex min-h-screen flex-col bg-[#1C1E22] text-[#FAF7F0]">
        <GovMasthead theme="dark" />

        <div className="flex flex-1 items-center justify-center px-4 py-12">
          <div className="w-full max-w-md terminal-panel p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center border border-[#FF9933] bg-[#1C1E22] text-[#FF9933]">
              <AshokaChakra className="h-7 w-7 text-[#FF9933]" />
            </div>

            <span className="command-badge bg-[#FF9933]/15 text-[#FF9933] border-[#FF9933]/40 font-bold">
              🇮🇳 भारत सरकार · NATIONAL COMPLIANCE TERMINAL
            </span>

            <h1 className="mt-4 font-serif text-2xl font-bold tracking-tight text-[#FAF7F0]">
              Access Institutional Forensic Workspace
            </h1>

            <p className="mt-2 text-xs leading-relaxed text-[#A09D95]">
              Screening records are strictly isolated and cryptographically signed. Authenticate with verified credentials.
            </p>

            <div className="mt-6">
              <Button
                onClick={() => (window.location.href = "/auth/login")}
                size="lg"
                className="w-full border border-[#FF9933] bg-[#FF9933] text-slate-950 hover:bg-[#E68524] font-mono font-bold text-xs h-10"
              >
                Sign In with Email OTP
              </Button>
            </div>

            <p className="mt-6 font-mono text-[10px] text-[#A09D95]">
              सत्यमेव जयते · Evidentiary Document Screening Node
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
      <DashboardLayoutContent
        sidebarWidth={sidebarWidth}
        setSidebarWidth={setSidebarWidth}
        user={user}
        logout={logout}
      >
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

function DashboardLayoutContent({
  children,
  sidebarWidth,
  setSidebarWidth,
  user,
  logout,
}: {
  children: React.ReactNode;
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;
  user: any;
  logout: () => void;
}) {
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const isMobile = useIsMobile();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);

  const activeMenuItem =
    menuItems.find(
      (item) =>
        location === item.path ||
        (item.path !== "/dashboard" && location.startsWith(item.path))
    ) || menuItems[0];

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      let newWidth = e.clientX;
      if (newWidth < MIN_WIDTH) newWidth = MIN_WIDTH;
      if (newWidth > MAX_WIDTH) newWidth = MAX_WIDTH;
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#1C1E22] text-[#FAF7F0]">
      {/* Official Government of India Top Masthead */}
      <GovMasthead theme="dark" />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div ref={sidebarRef} className="relative">
          <Sidebar
            collapsible="icon"
            className="border-r border-[#3A3D45] bg-[#1C1E22] text-[#FAF7F0]"
            disableTransition={isResizing}
          >
            <SidebarHeader className="h-16 justify-center border-b border-[#3A3D45] px-3 bg-[#1C1E22]">
              <div className="flex items-center gap-3 px-2">
                <button
                  onClick={toggleSidebar}
                  className="flex h-8 w-8 shrink-0 items-center justify-center border border-[#3A3D45] bg-[#26282D] text-[#D1CEC7] hover:border-[#FF9933] hover:text-[#FAF7F0] focus:outline-none transition-colors"
                  aria-label="Toggle navigation"
                >
                  <PanelLeft className="h-4 w-4" />
                </button>
                {!isCollapsed && (
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-serif text-base font-bold tracking-tight text-[#FAF7F0]">
                        VeriScan
                      </p>
                      <span className="command-badge bg-[#FF9933]/20 text-[#FF9933] border-[#FF9933]/50 text-[8px] font-bold">
                        TERMINAL
                      </span>
                    </div>
                    <p className="font-mono text-[9px] uppercase tracking-wider text-[#A09D95]">
                      राष्ट्रीय सत्यता नोड
                    </p>
                  </div>
                )}
              </div>
            </SidebarHeader>

            <SidebarContent className="px-3 py-4 bg-[#1C1E22]">
              <p className="font-mono text-[9.5px] uppercase tracking-wider mb-2.5 px-2 text-[#A09D95] group-data-[collapsible=icon]:hidden">
                Navigation
              </p>
              <SidebarMenu className="gap-1 font-mono">
                {menuItems.map((item) => {
                  const isActive =
                    location === item.path ||
                    (item.path !== "/dashboard" && location.startsWith(item.path));
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        isActive={isActive}
                        onClick={() => setLocation(item.path)}
                        tooltip={item.label}
                        className={`h-9 px-2.5 transition-all text-xs border ${
                          isActive
                            ? "border-[#FF9933] bg-[#FF9933]/20 text-[#FAF7F0] font-bold"
                            : "border-transparent text-[#A09D95] hover:bg-[#26282D] hover:text-[#FAF7F0] hover:border-[#3A3D45]"
                        }`}
                      >
                        <item.icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
                        <span className="text-[11px] tracking-wide">
                          {item.label}
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>

              {!isCollapsed && (
                <div className="mt-auto px-2 pt-6">
                  <div className="border border-[#3A3D45] bg-[#26282D] p-3 font-mono text-xs">
                    <div className="flex items-center gap-1.5 text-[#138808]">
                      <ShieldCheck className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                      <span className="text-[11px] font-bold text-[#FAF7F0]">
                        Audit Isolation
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] leading-relaxed text-[#A09D95]">
                      Local memory sandbox. Screened records are account-scoped.
                    </p>
                  </div>
                </div>
              )}
            </SidebarContent>

            <SidebarFooter className="border-t border-[#3A3D45] p-3 bg-[#1C1E22]">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex w-full items-center gap-2.5 p-1.5 text-left border border-transparent hover:border-[#3A3D45] hover:bg-[#26282D] transition-colors focus:outline-none group-data-[collapsible=icon]:justify-center font-mono">
                    <Avatar className="h-7 w-7 border border-[#FF9933]/50 bg-[#1C1E22]">
                      <AvatarFallback className="bg-[#FF9933]/20 text-[10px] font-bold text-[#FF9933]">
                        {getInitials(user?.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                      <p className="truncate text-[11px] font-bold text-[#FAF7F0]">
                        {user?.name || "OFFICER"}
                      </p>
                      <p className="truncate font-mono text-[9.5px] text-[#A09D95]">
                        {user?.email || "ACCOUNT"}
                      </p>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 border border-[#3A3D45] bg-[#26282D] p-1 text-[#FAF7F0] font-mono shadow-none"
                >
                  <div className="border-b border-[#3A3D45] p-2 text-xs">
                    <p className="font-bold text-[#FAF7F0]">{user?.name}</p>
                    <p className="truncate text-[10px] text-[#A09D95]">
                      {user?.email}
                    </p>
                    <span className="mt-1 inline-block command-badge bg-[#FF9933]/20 text-[#FF9933] border-[#FF9933] text-[9px]">
                      ROLE: {user?.role || "analyst"}
                    </span>
                  </div>
                  <DropdownMenuItem
                    onClick={() => logout()}
                    className="cursor-pointer px-2 py-1.5 text-xs text-rose-400 hover:bg-[#1C1E22] focus:bg-[#1C1E22] focus:text-rose-300"
                  >
                    <LogOut className="mr-2 h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarFooter>
          </Sidebar>
          <div
            className={`absolute right-0 top-0 z-50 h-full w-1 cursor-col-resize transition-colors hover:bg-[#FF9933] bg-[#3A3D45] ${
              isCollapsed ? "hidden" : ""
            }`}
            onMouseDown={() => setIsResizing(true)}
          />
        </div>

        {/* Main Content Pane */}
        <SidebarInset className="min-h-screen bg-[#1C1E22] text-[#FAF7F0]">
          {isMobile && (
            <div className="sticky top-0 z-40 flex h-12 items-center gap-3 border-b border-[#3A3D45] bg-[#1C1E22] px-4 font-mono">
              <SidebarTrigger className="h-8 w-8 border border-[#3A3D45] bg-[#26282D]" />
              <span className="font-serif text-sm font-bold text-[#FAF7F0]">
                {activeMenuItem.label}
              </span>
            </div>
          )}
          <main className="p-3 sm:p-6 lg:p-7">
            <div className="mx-auto max-w-[1440px]">{children}</div>
          </main>
        </SidebarInset>
      </div>
    </div>
  );
}
