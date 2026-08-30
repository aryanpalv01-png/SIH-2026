import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import DashboardLayout from "./components/DashboardLayout";
import { ThemeProvider } from "./contexts/ThemeContext";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import History from "./pages/History";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import Report from "./pages/Report";
import Reports from "./pages/Reports";
import Scan from "./pages/Scan";
import Settings from "./pages/Settings";
import Verify from "./pages/Verify";

function WorkspaceRoute({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

function Router() {
  return <Switch>
    <Route path="/" component={Home} />
    <Route path="/auth/:mode" component={Auth} />
    <Route path="/dashboard"><WorkspaceRoute><Dashboard /></WorkspaceRoute></Route>
    <Route path="/verify"><WorkspaceRoute><Verify /></WorkspaceRoute></Route>
    <Route path="/reports"><WorkspaceRoute><Reports /></WorkspaceRoute></Route>
    <Route path="/history"><WorkspaceRoute><History /></WorkspaceRoute></Route>
    <Route path="/settings"><WorkspaceRoute><Settings /></WorkspaceRoute></Route>
    <Route path="/scan/:id"><WorkspaceRoute><Scan /></WorkspaceRoute></Route>
    <Route path="/report/:id"><WorkspaceRoute><Report /></WorkspaceRoute></Route>
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
