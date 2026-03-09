import { useState, useEffect, useMemo } from "react";
import { KPICard } from "@/components/KPICard";
import { ResponsiveGrid } from "@/components/ResponsiveGrid";
import { DollarSign, TrendingUp, ArrowUpRight, ShoppingCart, TrendingDown, Users, UserMinus, UserPlus, Percent } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/formatCurrency";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { MonthYearPicker } from "@/components/MonthYearPicker";
import { parseISO } from "date-fns";

const PIPELINE_CLIENTES_ATIVOS = '749ccdc2-5127-41a1-997b-3dcb47979555';

interface CardData {
  id: string;
  monthly_revenue: number;
  plano: string;
  data_inicio?: string | null;
  data_contrato?: string | null;
  created_at: string;
  data_perda?: string | null;
  client_status?: string;
  categoria?: string;
  squad?: string;
}

interface UpsellRecord {
  upsell_type: string;
  upsell_value: number;
  payment_type: string;
  upsell_month: number;
  upsell_year: number;
}

export const FinancialMetrics = () => {
  const now = new Date();
  const [selectedPeriod, setSelectedPeriod] = useState<{ month: number; year: number }>({ month: now.getMonth(), year: now.getFullYear() });
  const [cards, setCards] = useState<CardData[]>([]);
  const [upsellRecords, setUpsellRecords] = useState<UpsellRecord[]>([]);
  const [selectedPlanMRR, setSelectedPlanMRR] = useState<string>("Business");
  const [selectedPlanTicket, setSelectedPlanTicket] = useState<string>("Business");
  const [selectedUpsellPayment, setSelectedUpsellPayment] = useState<string>("todos");
  const [selectedCrosssellPayment, setSelectedCrosssellPayment] = useState<string>("todos");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [cardsRes, upsellRes] = await Promise.all([
        supabase
          .from('csm_cards')
          .select('id, monthly_revenue, plano, data_inicio, data_contrato, created_at, data_perda, client_status, categoria, squad')
          .eq('pipeline_id', PIPELINE_CLIENTES_ATIVOS),
        supabase
          .from('csm_card_upsell_history')
          .select('upsell_type, upsell_value, payment_type, upsell_month, upsell_year')
      ]);

      const parsedCards: CardData[] = (cardsRes.data || []).map((card: any) => ({
        id: card.id,
        monthly_revenue: Number(card.monthly_revenue) || 0,
        plano: card.plano || 'Starter',
        data_inicio: card.data_inicio,
        data_contrato: card.data_contrato,
        created_at: card.created_at,
        data_perda: card.data_perda,
        client_status: card.client_status,
        categoria: card.categoria,
        squad: card.squad,
      }));

      const parsedUpsells: UpsellRecord[] = (upsellRes.data || []).map((r: any) => ({
        upsell_type: r.upsell_type || 'upsell',
        upsell_value: Number(r.upsell_value) || 0,
        payment_type: r.payment_type || 'unico',
        upsell_month: r.upsell_month,
        upsell_year: r.upsell_year,
      }));

      setCards(parsedCards);
      setUpsellRecords(parsedUpsells);
      setLoading(false);
    };
    fetchData();
  }, []);

  // Temporal filtering logic (same as SquadsDashboard)
  const wasRelevantInMonth = (card: CardData, month: number, year: number): boolean => {
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);
    const startDateStr = card.data_inicio || card.data_contrato || card.created_at;
    if (startDateStr) {
      const dateOnly = startDateStr.substring(0, 10);
      const startDate = new Date(dateOnly + 'T12:00:00');
      if (startDate > endOfMonth) return false;
    }
    if (card.client_status !== 'cancelado') return true;
    if (!card.data_perda) return false;
    const perdaDate = parseISO(card.data_perda);
    const perdaMonth = perdaDate.getMonth();
    const perdaYear = perdaDate.getFullYear();
    if (perdaYear > year) return true;
    if (perdaYear === year && perdaMonth >= month) return true;
    return false;
  };

  const isChurnedInMonth = (card: CardData, month: number, year: number): boolean => {
    if (card.client_status !== 'cancelado' || !card.data_perda) return false;
    const perdaDate = parseISO(card.data_perda);
    return perdaDate.getMonth() === month && perdaDate.getFullYear() === year;
  };

  const isActiveInMonth = (card: CardData, month: number, year: number): boolean => {
    return wasRelevantInMonth(card, month, year) && !isChurnedInMonth(card, month, year);
  };

  const isNewInMonth = (card: CardData, month: number, year: number): boolean => {
    const startDateStr = card.data_inicio || card.data_contrato || card.created_at;
    if (!startDateStr) return false;
    const dateOnly = startDateStr.substring(0, 10);
    const d = new Date(dateOnly + 'T12:00:00');
    return d.getMonth() === month && d.getFullYear() === year;
  };

  const metrics = useMemo(() => {
    const { month, year } = selectedPeriod;
    const recorrentes = cards.filter(c => c.categoria === 'MRR recorrente' || c.categoria === 'MRR Recorrente');

    // Cards relevantes/ativos/churned no mês
    const relevantCards = recorrentes.filter(c => wasRelevantInMonth(c, month, year));
    const activeCards = recorrentes.filter(c => isActiveInMonth(c, month, year));
    const churnedCards = recorrentes.filter(c => isChurnedInMonth(c, month, year));
    const newCards = recorrentes.filter(c => isNewInMonth(c, month, year));

    // MRR
    const mrrBase = relevantCards.reduce((sum, c) => sum + c.monthly_revenue, 0);
    const mrrActive = activeCards.reduce((sum, c) => sum + c.monthly_revenue, 0);
    const mrrPerdido = churnedCards.reduce((sum, c) => sum + c.monthly_revenue, 0);
    const mrrNovos = newCards.reduce((sum, c) => sum + c.monthly_revenue, 0);
    const ticketMedio = activeCards.length > 0 ? mrrActive / activeCards.length : 0;
    const ticketMedioPerdido = churnedCards.length > 0 ? mrrPerdido / churnedCards.length : 0;

    // By plan
    const activeByPlanMRR = activeCards.filter(c => c.plano === selectedPlanMRR);
    const mrrPorPlano = activeByPlanMRR.reduce((sum, c) => sum + c.monthly_revenue, 0);
    const activeByPlanTicket = activeCards.filter(c => c.plano === selectedPlanTicket);
    const ticketMedioPorPlano = activeByPlanTicket.length > 0
      ? activeByPlanTicket.reduce((sum, c) => sum + c.monthly_revenue, 0) / activeByPlanTicket.length
      : 0;

    // Churn %
    const revenueChurnPercent = mrrBase > 0 ? (mrrPerdido / mrrBase) * 100 : 0;
    const logoChurnPercent = relevantCards.length > 0 ? (churnedCards.length / relevantCards.length) * 100 : 0;

    // Upsell/Crosssell filtered by month
    const monthUpsells = upsellRecords.filter(r => r.upsell_month === month && r.upsell_year === year);
    const upsells = monthUpsells.filter(r => r.upsell_type === 'upsell');
    const crosssells = monthUpsells.filter(r => r.upsell_type === 'crosssell');

    const receitaAdicionalTotal = monthUpsells.reduce((sum, r) => sum + r.upsell_value, 0);
    const upsellRecorrente = upsells.filter(r => r.payment_type === 'recorrente').reduce((sum, r) => sum + r.upsell_value, 0);

    const filteredUpsells = selectedUpsellPayment === 'todos'
      ? upsells
      : upsells.filter(r => r.payment_type === selectedUpsellPayment);
    const upsellTotal = filteredUpsells.reduce((sum, r) => sum + r.upsell_value, 0);

    const filteredCrosssells = selectedCrosssellPayment === 'todos'
      ? crosssells
      : crosssells.filter(r => r.payment_type === selectedCrosssellPayment);
    const crosssellTotal = filteredCrosssells.reduce((sum, r) => sum + r.upsell_value, 0);

    // Churn líquido + upsell
    const churnLiquidoPercent = mrrBase > 0 ? ((mrrPerdido - upsellRecorrente) / mrrBase) * 100 : 0;

    return {
      mrrBase, mrrActive, mrrPerdido, mrrNovos, ticketMedio, ticketMedioPerdido,
      mrrPorPlano, activeByPlanMRR, ticketMedioPorPlano, activeByPlanTicket,
      revenueChurnPercent, logoChurnPercent, churnLiquidoPercent,
      receitaAdicionalTotal, upsellRecorrente, upsellTotal, crosssellTotal,
      filteredUpsells, filteredCrosssells, upsells, crosssells,
      relevantCards, activeCards, churnedCards, newCards,
    };
  }, [cards, upsellRecords, selectedPeriod, selectedPlanMRR, selectedPlanTicket, selectedUpsellPayment, selectedCrosssellPayment]);

  const plans = ["Business", "Pro", "Conceito", "Social", "Starter"];
  const paymentTypes = [
    { value: "todos", label: "Todos" },
    { value: "recorrente", label: "Recorrente" },
    { value: "unico", label: "Único" },
    { value: "parcelado", label: "Parcelado" },
  ];

  if (loading) {
    return (
      <div className="p-6">
        <h2 className="text-3xl font-bold mb-8">Métricas Financeiras</h2>
        <p className="text-muted-foreground">Carregando dados...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-3xl font-bold">Métricas Financeiras</h2>
        <MonthYearPicker
          selectedPeriods={[selectedPeriod]}
          onPeriodsChange={(periods) => {
            if (periods.length > 0) setSelectedPeriod(periods[0]);
          }}
          singleSelect
        />
      </div>

      <ResponsiveGrid cols={{ default: 1, md: 2, xl: 3 }} gap={{ default: 6 }}>
        {/* MRR Total (ativos no mês) */}
        <KPICard
          title="MRR Total"
          value={formatCurrency(metrics.mrrActive)}
          subtitle={`${metrics.activeCards.length} clientes ativos no mês`}
          icon={DollarSign}
          variant="default"
          iconColor="text-red-500"
        />

        {/* MRR da Base (relevantes) */}
        <KPICard
          title="MRR da Base"
          value={formatCurrency(metrics.mrrBase)}
          subtitle={`${metrics.relevantCards.length} clientes na base`}
          icon={Users}
          variant="default"
          iconColor="text-blue-500"
        />

        {/* MRR Perdido */}
        <KPICard
          title="MRR Perdido"
          value={formatCurrency(metrics.mrrPerdido)}
          subtitle={`${metrics.churnedCards.length} cancelamentos no mês`}
          icon={TrendingDown}
          variant="danger"
          iconColor="text-red-500"
        />

        {/* MRR Vendido (novos) */}
        <KPICard
          title="MRR Vendido"
          value={formatCurrency(metrics.mrrNovos)}
          subtitle={`${metrics.newCards.length} novos clientes`}
          icon={UserPlus}
          variant="success"
          iconColor="text-green-500"
        />

        {/* Revenue Churn % */}
        <KPICard
          title="Revenue Churn"
          value={`${metrics.revenueChurnPercent.toFixed(2)}%`}
          subtitle="MRR perdido / MRR base"
          icon={Percent}
          variant={metrics.revenueChurnPercent > 5 ? "danger" : "default"}
          iconColor="text-orange-500"
        />

        {/* Churn Líquido + Upsell */}
        <KPICard
          title="Churn Líquido + Upsell"
          value={`${metrics.churnLiquidoPercent.toFixed(2)}%`}
          subtitle="(MRR perdido - upsell recorrente) / MRR base"
          icon={Percent}
          variant={metrics.churnLiquidoPercent > 5 ? "warning" : "default"}
          iconColor="text-amber-500"
        />

        {/* Ticket Médio MRR */}
        <KPICard
          title="Ticket Médio MRR"
          value={formatCurrency(metrics.ticketMedio)}
          subtitle={`Média por cliente ativo (${metrics.activeCards.length})`}
          icon={TrendingUp}
          variant="default"
          iconColor="text-green-500"
        />

        {/* Ticket Médio Perdido */}
        <KPICard
          title="Ticket Médio Perdido"
          value={formatCurrency(metrics.ticketMedioPerdido)}
          subtitle={`Média por churn (${metrics.churnedCards.length})`}
          icon={UserMinus}
          variant="danger"
          iconColor="text-red-400"
        />

        {/* MRR por Plano */}
        <KPICard
          title="MRR por Plano"
          value={formatCurrency(metrics.mrrPorPlano)}
          subtitle={`Plano ${selectedPlanMRR} (${metrics.activeByPlanMRR.length} clientes)`}
          icon={DollarSign}
          variant="default"
          iconColor="text-blue-500"
          filterComponent={
            <ToggleGroup
              type="single"
              value={selectedPlanMRR}
              onValueChange={(value) => value && setSelectedPlanMRR(value)}
              className="flex flex-wrap gap-2"
            >
              {plans.map(plan => (
                <ToggleGroupItem
                  key={plan}
                  value={plan}
                  className="text-xs px-3 py-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                >
                  {plan}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          }
        />

        {/* Ticket Médio por Plano */}
        <KPICard
          title="Ticket Médio por Plano"
          value={formatCurrency(metrics.ticketMedioPorPlano)}
          subtitle={`Plano ${selectedPlanTicket} (${metrics.activeByPlanTicket.length} clientes)`}
          icon={TrendingUp}
          variant="default"
          iconColor="text-blue-600"
          filterComponent={
            <ToggleGroup
              type="single"
              value={selectedPlanTicket}
              onValueChange={(value) => value && setSelectedPlanTicket(value)}
              className="flex flex-wrap gap-2"
            >
              {plans.map(plan => (
                <ToggleGroupItem
                  key={plan}
                  value={plan}
                  className="text-xs px-3 py-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                >
                  {plan}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          }
        />

        {/* Receita Adicional Total */}
        <KPICard
          title="Receita Adicional Total"
          value={formatCurrency(metrics.receitaAdicionalTotal)}
          subtitle={`${metrics.upsells.length} upsells + ${metrics.crosssells.length} crosssells no mês`}
          icon={TrendingUp}
          variant="success"
          iconColor="text-green-500"
        />

        {/* Upsell Recorrente */}
        <KPICard
          title="Upsell Recorrente"
          value={formatCurrency(metrics.upsellRecorrente)}
          subtitle={`Impacto no MRR (${metrics.upsells.filter(r => r.payment_type === 'recorrente').length} registros)`}
          icon={ArrowUpRight}
          variant="default"
          iconColor="text-emerald-500"
        />

        {/* Upsell Total com filtro */}
        <KPICard
          title="Upsell Total"
          value={formatCurrency(metrics.upsellTotal)}
          subtitle={`${metrics.filteredUpsells.length} registros`}
          icon={ArrowUpRight}
          variant="default"
          iconColor="text-purple-500"
          filterComponent={
            <ToggleGroup
              type="single"
              value={selectedUpsellPayment}
              onValueChange={(value) => value && setSelectedUpsellPayment(value)}
              className="flex flex-wrap gap-2"
            >
              {paymentTypes.map(pt => (
                <ToggleGroupItem
                  key={pt.value}
                  value={pt.value}
                  className="text-xs px-3 py-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                >
                  {pt.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          }
        />

        {/* Crosssell Total com filtro */}
        <KPICard
          title="Crosssell Total"
          value={formatCurrency(metrics.crosssellTotal)}
          subtitle={`${metrics.filteredCrosssells.length} registros`}
          icon={ShoppingCart}
          variant="default"
          iconColor="text-orange-500"
          filterComponent={
            <ToggleGroup
              type="single"
              value={selectedCrosssellPayment}
              onValueChange={(value) => value && setSelectedCrosssellPayment(value)}
              className="flex flex-wrap gap-2"
            >
              {paymentTypes.map(pt => (
                <ToggleGroupItem
                  key={pt.value}
                  value={pt.value}
                  className="text-xs px-3 py-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                >
                  {pt.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          }
        />
      </ResponsiveGrid>
    </div>
  );
};
