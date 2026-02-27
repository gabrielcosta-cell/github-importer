
import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TitleManager } from "@/components/TitleManager";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DotLogo } from "@/components/DotLogo";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
const Index = lazy(() => import("./pages/Index"));
import Auth from "./pages/Auth";
import Logout from "./pages/Logout";
import SetPassword from "./pages/SetPassword";
import AuthHandoff from "./pages/AuthHandoff";


import NotFound from "./pages/NotFound";
import Aprovacao from "./pages/Aprovacao";
import AprovacaoCliente from "./pages/AprovacaoCliente";
import SolicitacaoCancelamento from "./pages/SolicitacaoCancelamento";
import GestaoCancelamentos from "./pages/GestaoCancelamentos";
import FormCSAT from "./pages/FormCSAT";
import FormNPS from "./pages/FormNPS";
import GestaoNPS from "./pages/GestaoNPS";
import GestaoCSAT from "./pages/GestaoCSAT";
import CasesSuccesso from "./pages/CasesSuccesso";
import CasesRouter from "./pages/CasesRouter";
import GerarForms from "./pages/GerarForms";
import { PublicPageWithSidebar } from "@/components/PublicPageWithSidebar";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutos
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" storageKey="dot-ui-theme">
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <PWAInstallPrompt />
          <BrowserRouter>
            <TitleManager />
            <Routes>
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Suspense fallback={
                    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                      <DotLogo size={48} animate />
                      <div className="text-lg">Carregando...</div>
                    </div>
                  }>
                    <Index />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/aprovacao" element={
                <ProtectedRoute>
                  <Aprovacao />
                </ProtectedRoute>
              } />
              <Route path="/aprovacao-cliente/:token" element={<AprovacaoCliente />} />
              <Route path="/solicitacao-cancelamento" element={
                <PublicPageWithSidebar>
                  <SolicitacaoCancelamento />
                </PublicPageWithSidebar>
              } />
              <Route path="/solicitacao-cancelamento-interno" element={
                <ProtectedRoute>
                  <PublicPageWithSidebar>
                    <SolicitacaoCancelamento />
                  </PublicPageWithSidebar>
                </ProtectedRoute>
              } />
              <Route path="/gestao-cancelamentos" element={
                <ProtectedRoute>
                  <PublicPageWithSidebar>
                    <GestaoCancelamentos />
                  </PublicPageWithSidebar>
                </ProtectedRoute>
              } />
              <Route path="/pesquisa-csat" element={
                <PublicPageWithSidebar>
                  <FormCSAT />
                </PublicPageWithSidebar>
              } />
              <Route path="/pesquisa-csat-interno" element={
                <ProtectedRoute>
                  <PublicPageWithSidebar>
                    <FormCSAT />
                  </PublicPageWithSidebar>
                </ProtectedRoute>
              } />
              <Route path="/pesquisa-nps" element={
                <PublicPageWithSidebar>
                  <FormNPS />
                </PublicPageWithSidebar>
              } />
              <Route path="/pesquisa-nps-interno" element={
                <ProtectedRoute>
                  <PublicPageWithSidebar>
                    <FormNPS />
                  </PublicPageWithSidebar>
                </ProtectedRoute>
              } />
              <Route path="/gestao-nps" element={
                <ProtectedRoute>
                  <PublicPageWithSidebar>
                    <GestaoNPS />
                  </PublicPageWithSidebar>
                </ProtectedRoute>
              } />
              <Route path="/gestao-csat" element={
                <ProtectedRoute>
                  <PublicPageWithSidebar>
                    <GestaoCSAT />
                  </PublicPageWithSidebar>
                </ProtectedRoute>
              } />
              <Route path="/gerar-forms" element={
                <ProtectedRoute>
                  <GerarForms />
                </ProtectedRoute>
              } />
              <Route path="/cases-sucesso" element={
                <ProtectedRoute>
                  <PublicPageWithSidebar>
                    <CasesSuccesso />
                  </PublicPageWithSidebar>
                </ProtectedRoute>
              } />
              <Route path="/cases" element={<CasesRouter />} />
              <Route path="/cases/:param" element={<CasesRouter />} />
              <Route path="/" element={<Auth />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/logout" element={<Logout />} />
              <Route path="/auth-handoff" element={<AuthHandoff />} />
              <Route path="/set-password" element={<SetPassword />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
