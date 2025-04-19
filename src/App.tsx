
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/auth-context";
import { LocationProvider } from "./contexts/location-context";
import { MainLayout } from "./components/layout/main-layout";
import { ProtectedRoute } from "./components/auth/protected-route";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import RegistroPonto from "./pages/RegistroPonto";
import Relatorios from "./pages/Relatorios";
import Escalas from "./pages/Escalas";
import Usuarios from "./pages/Usuarios";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <LocationProvider>
        <TooltipProvider>
          <BrowserRouter>
            <Toaster />
            <Sonner />
            <Routes>
              <Route path="/" element={<Login />} />
              
              {/* Rotas protegidas dentro do layout principal */}
              <Route element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/registro-ponto" element={<RegistroPonto />} />
                <Route path="/relatorios" element={<Relatorios />} />
                <Route path="/escalas" element={<Escalas />} />
                <Route path="/usuarios" element={
                  <ProtectedRoute adminOnly>
                    <Usuarios />
                  </ProtectedRoute>
                } />
              </Route>
              
              {/* Página 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </LocationProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
