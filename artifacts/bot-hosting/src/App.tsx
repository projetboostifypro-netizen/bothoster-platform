import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Loader2 } from "lucide-react";

import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";

const DashboardLayout = lazy(() => import("./components/dashboard/DashboardLayout"));
const DashboardHome = lazy(() => import("./pages/dashboard/DashboardHome"));
const BotsList = lazy(() => import("./pages/dashboard/BotsList"));
const CreateBot = lazy(() => import("./pages/dashboard/CreateBot"));
const EditBot = lazy(() => import("./pages/dashboard/EditBot"));
const BotFileManager = lazy(() => import("./pages/dashboard/BotFileManager"));
const Logs = lazy(() => import("./pages/dashboard/Logs"));
const Resources = lazy(() => import("./pages/dashboard/Resources"));
const Credits = lazy(() => import("./pages/dashboard/Credits"));
const Support = lazy(() => import("./pages/dashboard/Support"));
const SettingsPage = lazy(() => import("./pages/dashboard/SettingsPage"));
const AdminPanel = lazy(() => import("./pages/dashboard/AdminPanel"));
const Domains = lazy(() => import("./pages/dashboard/Domains"));
const WebHosting = lazy(() => import("./pages/dashboard/WebHosting"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <DashboardLayout />
                  </Suspense>
                </ProtectedRoute>
              }
            >
              <Route index element={<Suspense fallback={<PageLoader />}><DashboardHome /></Suspense>} />
              <Route path="bots" element={<Suspense fallback={<PageLoader />}><BotsList /></Suspense>} />
              <Route path="bots/new" element={<Suspense fallback={<PageLoader />}><CreateBot /></Suspense>} />
              <Route path="bots/:id/edit" element={<Suspense fallback={<PageLoader />}><EditBot /></Suspense>} />
              <Route path="bots/:id/files" element={<Suspense fallback={<PageLoader />}><BotFileManager /></Suspense>} />
              <Route path="logs" element={<Suspense fallback={<PageLoader />}><Logs /></Suspense>} />
              <Route path="resources" element={<Suspense fallback={<PageLoader />}><Resources /></Suspense>} />
              <Route path="credits" element={<Suspense fallback={<PageLoader />}><Credits /></Suspense>} />
              <Route path="support" element={<Suspense fallback={<PageLoader />}><Support /></Suspense>} />
              <Route path="settings" element={<Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>} />
              <Route path="admin" element={<Suspense fallback={<PageLoader />}><AdminPanel /></Suspense>} />
              <Route path="domains" element={<Suspense fallback={<PageLoader />}><Domains /></Suspense>} />
              <Route path="hosting" element={<Suspense fallback={<PageLoader />}><WebHosting /></Suspense>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
