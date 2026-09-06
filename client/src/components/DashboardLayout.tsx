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
  const { loading, user, logout, quickLogin } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user && !allowGuest) {
    return (
      <div className="flex min-h-screen flex-col bg-[#0A192F] text-slate-100">
        <GovMasthead theme="dark" />

        <div className="flex flex-1 items-center justify-center px-4 py-12">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/15 bg-[#0F243E] p-8 text-center shadow-2xl">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-saffron/40 bg-saffron/15 text-saffron shadow-xs">
              <AshokaChakra className="h-8 w-8 text-saffron" />
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-full border border-saffron/30 bg-saffron/10 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-saffron">
              <span>🇮🇳</span> भारत सरकार · GOVT OF INDIA
            </div>

            <h1 className="mt-4 font-serif text-2xl font-bold tracking-tight text-white">
              Access National Forensic Portal
            </h1>

            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Sign in with your government or institutional credentials to access document screening, forensic heatmaps, and cryptographic reports.
            </p>

            <div className="mt-6">
              <Button
                onClick={() => (window.location.href = "/auth/login")}
                size="lg"
                className="w-full bg-saffron text-slate-950 hover:bg-saffron-dark hover:text-white font-bold text-xs h-11 shadow-xs"
              >
                Sign In with Official Email OTP
              </Button>
            </div>

            <p className="mt-6 text-[11px] font-medium text-slate-500">
              सत्यमेव जयते · Secure National Document Forensic System
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
    <div className="flex min-h-screen w-full flex-col bg-[#FAF7F0]">
      {/* Official Government of India Top Masthead */}
      <GovMasthead theme="dark" />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div ref={sidebarRef} className="relative">
          <Sidebar
            collapsible="icon"
            className="border-white/10 bg-[#2A2C30] text-[#FAF7F0]"
            disableTransition={isResizing}
          >
            <SidebarHeader className="h-20 justify-center border-b border-white/10 px-3">
              <div className="flex items-center gap-3 px-2">
                <button
                  onClick={toggleSidebar}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/15 text-slate-300 transition-colors hover:border-saffron/50 hover:text-saffron focus:outline-none"
                  aria-label="Toggle navigation"
                >
                  <PanelLeft className="h-4 w-4" />
                </button>
                {!isCollapsed && (
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-serif text-lg font-bold tracking-tight text-white">
                        VeriScan
                      </p>
                      <span className="rounded bg-saffron/20 px-1.5 py-0.2 text-[8px] font-bold uppercase tracking-wider text-saffron border border-saffron/30">
                        OFFICIAL
                      </span>
                    </div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">
                      राष्ट्रीय सत्यता पोर्टल
                    </p>
                  </div>
                )}
              </div>
            </SidebarHeader>

            <SidebarContent className="px-3 py-5">
              <p className="eyebrow mb-3 px-3 text-slate-400 group-data-[collapsible=icon]:hidden">
                Workspace Modules
              </p>
              <SidebarMenu className="gap-1.5">
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
                        className={`h-11 rounded-xl px-3 transition-all duration-150 ${
                          isActive
                            ? "bg-saffron text-slate-950 font-bold shadow-xs hover:bg-saffron"
                            : "text-slate-300 hover:bg-white/8 hover:text-white"
                        }`}
                      >
                        <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.8} />
                        <span className="text-xs font-semibold tracking-wide">
                          {item.label}
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>

              {!isCollapsed && (
                <div className="mt-auto px-2 pt-6">
                  <div className="rounded-xl border border-white/10 bg-[#0F243E] p-3.5 shadow-inner">
                    <div className="flex items-center gap-2 text-india-green">
                      <ShieldCheck className="h-4 w-4 shrink-0" strokeWidth={2} />
                      <span className="text-xs font-semibold text-white">
                        Account-Scoped Vault
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                      Screening records are strictly isolated and encrypted under your credentials.
                    </p>
                  </div>
                </div>
              )}
            </SidebarContent>

            <SidebarFooter className="border-t border-white/10 p-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-white/8 focus:outline-none group-data-[collapsible=icon]:justify-center">
                    <Avatar className="h-9 w-9 border border-saffron/40 bg-saffron/10">
                      <AvatarFallback className="bg-saffron/20 text-xs font-bold text-saffron">
                        {getInitials(user?.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                      <p className="truncate text-xs font-bold text-white">
                        {user?.name || "Government Officer"}
                      </p>
                      <p className="truncate font-mono text-[10.5px] text-slate-400">
                        {user?.email || "Account Holder"}
                      </p>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-60 rounded-xl border border-slate-200 bg-white p-1 text-slate-900 shadow-xl"
                >
                  <div className="border-b border-slate-100 p-2.5 text-xs">
                    <p className="font-bold text-slate-900">{user?.name}</p>
                    <p className="truncate font-mono text-[11px] text-slate-500">
                      {user?.email}
                    </p>
                    <span className="mt-1.5 inline-block rounded-md bg-saffron/15 px-2 py-0.5 text-[10px] font-bold text-saffron-dark uppercase">
                      Role: {user?.role || "analyst"}
                    </span>
                  </div>
                  <DropdownMenuItem
                    onClick={() => logout()}
                    className="cursor-pointer rounded-lg px-2.5 py-2 text-xs font-semibold text-red-600 focus:bg-red-50 focus:text-red-700"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign Out Immediately</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarFooter>
          </Sidebar>
          <div
            className={`absolute right-0 top-0 z-50 h-full w-1 cursor-col-resize transition-colors hover:bg-saffron ${
              isCollapsed ? "hidden" : ""
            }`}
            onMouseDown={() => setIsResizing(true)}
          />
        </div>

        {/* Main Content Pane */}
        <SidebarInset className="min-h-screen bg-[#FAF7F0] text-[#2A2C30]">
          {isMobile && (
            <div className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-[#E2DBD0] bg-[#FAF7F0]/95 px-4 backdrop-blur-md">
              <SidebarTrigger className="h-9 w-9 rounded-lg border border-slate-200" />
              <span className="font-serif text-base font-bold text-slate-900">
                {activeMenuItem.label}
              </span>
            </div>
          )}
          <main className="p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-[1400px]">{children}</div>
          </main>
        </SidebarInset>
      </div>
    </div>
  );
}
