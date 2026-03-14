import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import CalendarPage from "./pages/CalendarPage";
import GoalsPage from "./pages/GoalsPage";
import SettingsPage from "./pages/SettingsPage";
import AppLayout from "./components/AppLayout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoutes = () => {
  const { user, loading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();

  if (loading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-2xl font-bold tracking-tighter text-primary animate-pulse">LF</div>
      </div>
    );
  }

  if (!user) return <Auth />;
  if (profile && !profile.onboarded) return <Onboarding />;

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/goals" element={<GoalsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
