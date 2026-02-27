import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const DASHBOARD_VIEW_TITLES: Record<string, string> = {
  dashboard: "Quadro de vendas",
  crm: "CRM",
  csm: "CSM",
  "cs-nps": "NPS",
  "cs-csat": "CSAT",
  "cs-churn": "CHURN",
  users: "Usuários",
  profile: "Meu Perfil",
  wallet: "Wallet",
  "lista-espera": "Lista de espera",
  "gestao-csat": "CSAT",
  "gestao-nps": "NPS",
  "gestao-cancelamentos": "CHURN",
  copy: "Copy",
  aprovacao: "Aprovação",
  "analise-bench": "Análise e Benchmarking",
};

function titleForPath(pathname: string, dashboardView: string | null) {
  if (pathname.startsWith("/dashboard")) {
    if (dashboardView && DASHBOARD_VIEW_TITLES[dashboardView]) return DASHBOARD_VIEW_TITLES[dashboardView];
    return "Dashboard";
  }

  if (pathname === "/cases-sucesso") return "Cases de sucesso";
  if (pathname === "/aprovacao") return "Aprovação";
  if (pathname === "/gestao-csat") return "CSAT";
  if (pathname === "/gestao-nps") return "NPS";
  if (pathname === "/gestao-cancelamentos") return "CHURN";
  if (pathname === "/pesquisa-csat-interno" || pathname === "/pesquisa-csat") return "Formulário CSAT";
  if (pathname === "/pesquisa-nps-interno" || pathname === "/pesquisa-nps") return "Formulário NPS";
  if (pathname === "/solicitacao-cancelamento-interno" || pathname === "/solicitacao-cancelamento") return "Solicitação de cancelamento";

  // Blog público
  if (pathname === "/cases" || pathname.startsWith("/cases/")) return "Cases de sucesso";

  return null;
}

export function TitleManager() {
  const location = useLocation();

  useEffect(() => {
    const view = new URLSearchParams(location.search).get("view");
    const pageTitle = titleForPath(location.pathname, view);
    document.title = pageTitle ? `DOT - Skala ${pageTitle}` : "DOT - Skala";
  }, [location.pathname, location.search]);

  return null;
}
