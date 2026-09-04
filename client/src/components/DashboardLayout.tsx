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
import { startLogin } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { getInitials } from "@/lib/veriscan";
import { FileCheck2, FileSearch, History, LayoutDashboard, LogOut, PanelLeft, Settings2, ShieldCheck } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";

const menuItems = [
  { icon: LayoutDashboard, label: "Overview", path: "/dashboard" },
  { icon: FileSearch, label: "Verify document", path: "/verify" },
  { icon: FileCheck2, label: "Reports", path: "/reports" },
  { icon: History, label: "Scan history", path: "/history" },
  { icon: Settings2, label: "Settings", path: "/settings" },
];

const SIDEBAR_WIDTH_KEY = "veriscan-sidebar-width";
const DEFAULT_WIDTH = 246;
const MIN_WIDTH = 210;
const MAX_WIDTH = 360;

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
  const { loading, user, loginAsDemo } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user && !allowGuest) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-charcoal px-6 text-paper">
        <div className="w-full max-w-md rounded-[20px] border border-paper/10 bg-charcoal-light p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-[18px] border border-bronze/50 bg-bronze/10 text-bronze">
            <ShieldCheck className="h-7 w-7" strokeWidth={1.5} />
          </div>
          <p className="eyebrow text-bronze">Private workspace</p>
          <h1 className="mt-3 font-serif text-3xl font-semibold">Access VeriScan Workspace</h1>
          <p className="mt-3 text-sm leading-6 text-paper/65">
            Continue to access your forensic screening workbench, recent audit reports, and organization settings.
          </p>
          <div className="mt-7 space-y-3">
            <Button
              onClick={() => loginAsDemo()}
              size="lg"
              className="w-full bg-bronze text-ink hover:bg-bronze-light font-semibold"
            >
              Sign In as Institutional Analyst
            </Button>
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/auth/login")}
              className="w-full border-paper/20 bg-transparent text-paper hover:bg-paper/10"
            >
              Sign in with Email & Password
            </Button>
          </div>
          <p className="mt-5 text-xs text-paper/45">
            Instant evaluation access enabled for forensic inspection.
          </p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>{children}</DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = { children: React.ReactNode; setSidebarWidth: (width: number) => void };

function DashboardLayoutContent({ children, setSidebarWidth }: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const activeMenuItem = menuItems.find((item) => location === item.path || (item.path !== "/dashboard" && location.startsWith(item.path))) ?? menuItems[0];

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = event.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div ref={sidebarRef} className="relative">
        <Sidebar collapsible="icon" className="border-paper/10 bg-charcoal text-paper" disableTransition={isResizing}>
          <SidebarHeader className="h-[82px] justify-center border-b border-paper/10 px-3">
            <div className="flex items-center gap-3 px-2">
              <button onClick={toggleSidebar} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-paper/10 text-paper/70 transition-colors hover:border-bronze/50 hover:text-bronze focus:outline-none focus-visible:ring-2 focus-visible:ring-bronze" aria-label="Toggle navigation">
                <PanelLeft className="h-4 w-4" />
              </button>
              {!isCollapsed && <div className="min-w-0"><p className="font-serif text-lg font-semibold tracking-[-0.02em] text-paper">VeriScan</p><p className="text-[10px] uppercase tracking-[0.18em] text-paper/45">Trust, examined.</p></div>}
            </div>
          </SidebarHeader>
          <SidebarContent className="px-3 py-6">
            <p className="eyebrow mb-3 px-3 text-paper/35 group-data-[collapsible=icon]:hidden">Workspace</p>
            <SidebarMenu className="gap-1">
              {menuItems.map((item) => {
                const isActive = location === item.path || (item.path !== "/dashboard" && location.startsWith(item.path));
                return <SidebarMenuItem key={item.path}><SidebarMenuButton isActive={isActive} onClick={() => setLocation(item.path)} tooltip={item.label} className="h-11 rounded-xl px-3 text-paper/65 transition-colors hover:bg-paper/5 hover:text-paper data-[active=true]:bg-bronze data-[active=true]:text-ink data-[active=true]:shadow-[0_6px_18px_rgba(138,109,31,0.18)]"><item.icon className="h-4 w-4 shrink-0" strokeWidth={1.7} /><span>{item.label}</span></SidebarMenuButton></SidebarMenuItem>;
              })}
            </SidebarMenu>
            {!isCollapsed && <div className="mt-auto px-3 pt-12"><div className="rounded-2xl border border-paper/10 bg-paper/5 p-4"><div className="flex items-center gap-2 text-bronze"><ShieldCheck className="h-4 w-4" strokeWidth={1.6} /><span className="text-xs font-medium">Private by design</span></div><p className="mt-2 text-xs leading-5 text-paper/50">Files are held as secure references so your reports stay available without keeping document bytes in application records.</p></div></div>}
          </SidebarContent>
          <SidebarFooter className="border-t border-paper/10 p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild><button className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-paper/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-bronze group-data-[collapsible=icon]:justify-center"><Avatar className="h-9 w-9 border border-bronze/40 bg-paper/10"><AvatarFallback className="bg-paper/10 text-xs font-medium text-paper">{getInitials(user?.name)}</AvatarFallback></Avatar><div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden"><p className="truncate text-sm font-medium text-paper">{user?.name || "Account holder"}</p><p className="mt-1 truncate text-xs text-paper/45">{user?.email || "Private account"}</p></div></button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 border-border bg-paper text-ink"><DropdownMenuItem onClick={logout} className="cursor-pointer text-forged focus:text-forged"><LogOut className="mr-2 h-4 w-4" /><span>Sign out</span></DropdownMenuItem></DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div className={`absolute right-0 top-0 z-50 h-full w-1 cursor-col-resize transition-colors hover:bg-bronze/40 ${isCollapsed ? "hidden" : ""}`} onMouseDown={() => setIsResizing(true)} />
      </div>
      <SidebarInset className="min-h-screen bg-paper text-ink">
        {isMobile && <div className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-paper/95 px-3 backdrop-blur"><SidebarTrigger className="h-9 w-9 rounded-lg border border-border" /><span className="font-serif text-lg font-semibold">{activeMenuItem.label}</span></div>}
        <main className="min-h-screen p-4 sm:p-6 lg:p-10">{children}</main>
      </SidebarInset>
    </>
  );
}
