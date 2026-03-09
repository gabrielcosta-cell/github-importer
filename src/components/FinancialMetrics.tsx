import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "@/components/KPICard";
import { ResponsiveGrid } from "@/components/ResponsiveGrid";
import { DollarSign, TrendingUp, ArrowUpRight, ShoppingCart, TrendingDown, Users, UserMinus, UserPlus, Percent, Database, BarChart3, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/formatCurrency";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { MonthYearPicker } from "@/components/MonthYearPicker";
import { parseISO } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const PIPELINE_CLIENTES_ATIVOS = '749ccdc2-5127-41a1-997b-3dcb47979555';

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

interface CardData {
  id: string;
  title: string;
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
  card_title?: string;
  squad?: string;
  plano?: string;
  notes?: string;
}

// Temporal filtering helpers
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

const calcMonthMetrics = (cards: CardData[], upsellRecords: UpsellRecord[], month: number, year: number) => {
  const allCards = cards;
  const recorrentes = allCards.filter(c => !c.categoria || c.categoria === 'MRR recorrente' || c.categoria === 'MRR Recorrente');
  const vendidos = allCards.filter(c => c.categoria === 'MRR Vendido');

  // Recorrente metrics
  const activeRecorrentes = recorrentes.filter(c => isActiveInMonth(c, month, year));
  const mrrRecorrente = activeRecorrentes.reduce((sum, c) => sum + c.monthly_revenue, 0);

  // Vendido metrics
  const activeVendidos = vendidos.filter(c => isActiveInMonth(c, month, year));
  const mrrVendido = activeVendidos.reduce((sum, c) => sum + c.monthly_revenue, 0);

  // Total MRR = Recorrente + Vendido
  const mrrTotal = mrrRecorrente + mrrVendido;
  const totalActiveCards = [...activeRecorrentes, ...activeVendidos];

  // Churned: all cards churned in month (any category)
  const churnedCards = allCards.filter(c => isChurnedInMonth(c, month, year));
  const mrrPerdido = churnedCards.reduce((sum, c) => sum + c.monthly_revenue, 0);

  // New cards (recorrentes only for backward compat)
  const newCards = recorrentes.filter(c => isNewInMonth(c, month, year));
  const mrrNovos = newCards.reduce((sum, c) => sum + c.monthly_revenue, 0);

  // Base MRR (relevant recorrentes - used for churn % calculation)
  const relevantRecorrentes = recorrentes.filter(c => wasRelevantInMonth(c, month, year));
  const mrrBase = relevantRecorrentes.reduce((sum, c) => sum + c.monthly_revenue, 0);

  const ticketMedio = totalActiveCards.length > 0 ? mrrTotal / totalActiveCards.length : 0;
  const ticketMedioPerdido = churnedCards.length > 0 ? mrrPerdido / churnedCards.length : 0;
  // Revenue Churn % and Churn Líquido % as simple average per squad (matching Squads tab)
  const squadsSet = new Set<string>();
  allCards.forEach(c => { if (c.squad) squadsSet.add(c.squad); });
  const squadNames = Array.from(squadsSet);

  const monthUpsells = upsellRecords.filter(r => r.upsell_month === month && r.upsell_year === year);
  const upsells = monthUpsells.filter(r => r.upsell_type === 'upsell');
  const crosssells = monthUpsells.filter(r => r.upsell_type === 'crosssell');
  const receitaAdicionalTotal = monthUpsells.reduce((sum, r) => sum + r.upsell_value, 0);
  const upsellRecorrente = upsells.filter(r => r.payment_type === 'recorrente').reduce((sum, r) => sum + r.upsell_value, 0);

  let revenueChurnPercent = 0;
  let churnLiquidoPercent = 0;

  if (squadNames.length > 0) {
    const squadPercentages = squadNames.map(squad => {
      const squadRecorrentes = recorrentes.filter(c => c.squad === squad);
      const squadRelevant = squadRecorrentes.filter(c => wasRelevantInMonth(c, month, year));
      const squadMrrBase = squadRelevant.reduce((sum, c) => sum + c.monthly_revenue, 0);
      const squadChurned = squadRecorrentes.filter(c => isChurnedInMonth(c, month, year));
      const squadMrrPerdido = squadChurned.reduce((sum, c) => sum + c.monthly_revenue, 0);
      const squadRevChurn = squadMrrBase > 0 ? (squadMrrPerdido / squadMrrBase) * 100 : 0;
      const squadChurnLiquido = squadMrrBase > 0 ? ((squadMrrPerdido - upsellRecorrente) / squadMrrBase) * 100 : 0;
      return { revChurn: squadRevChurn, churnLiquido: squadChurnLiquido, hasData: squadRelevant.length > 0 };
    }).filter(s => s.hasData);

    if (squadPercentages.length > 0) {
      revenueChurnPercent = squadPercentages.reduce((s, p) => s + p.revChurn, 0) / squadPercentages.length;
      churnLiquidoPercent = squadPercentages.reduce((s, p) => s + p.churnLiquido, 0) / squadPercentages.length;
    }
  } else {
    revenueChurnPercent = mrrBase > 0 ? (mrrPerdido / mrrBase) * 100 : 0;
    churnLiquidoPercent = mrrBase > 0 ? ((mrrPerdido - upsellRecorrente) / mrrBase) * 100 : 0;
  }

  return {
    mrrRecorrente, mrrVendido, mrrTotal, mrrBase, mrrPerdido, mrrNovos,
    ticketMedio, ticketMedioPerdido, revenueChurnPercent, churnLiquidoPercent,
    receitaAdicionalTotal, upsellRecorrente, upsells, crosssells,
    activeRecorrentes, activeVendidos, totalActiveCards, churnedCards, newCards,
    relevantRecorrentes,
  };
};

const calcTrend = (current: number, previous: number, invertColors = false) => {
  if (previous === 0) return current > 0 ? { value: 100, label: 'vs mês anterior', invertColors } : { value: 0, label: 'vs mês anterior', invertColors };
  return { value: ((current - previous) / Math.abs(previous)) * 100, label: 'vs mês anterior', invertColors };
};

const getPrevMonth = (month: number, year: number) => {
  return month === 0 ? { month: 11, year: year - 1 } : { month: month - 1, year };
};

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
  const [detailModal, setDetailModal] = useState<{ title: string; clients?: CardData[]; upsellRecords?: UpsellRecord[] } | null>(null);
  const [activeTab, setActiveTab] = useState<'mrr' | 'churn' | 'ticket' | 'vendas'>('mrr');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [cardsRes, upsellRes] = await Promise.all([
        supabase
          .from('csm_cards')
          .select('id, title, monthly_revenue, plano, data_inicio, data_contrato, created_at, data_perda, client_status, categoria, squad')
          .eq('pipeline_id', PIPELINE_CLIENTES_ATIVOS),
        supabase
          .from('csm_card_upsell_history')
          .select('upsell_type, upsell_value, payment_type, upsell_month, upsell_year, notes, card_id, csm_cards(title, squad, plano)')
      ]);

      setCards((cardsRes.data || []).map((card: any) => ({
        id: card.id,
        title: card.title || 'Sem nome',
        monthly_revenue: Number(card.monthly_revenue) || 0,
        plano: card.plano || 'Starter',
        data_inicio: card.data_inicio,
        data_contrato: card.data_contrato,
        created_at: card.created_at,
        data_perda: card.data_perda,
        client_status: card.client_status,
        categoria: card.categoria,
        squad: card.squad,
      })));

      setUpsellRecords((upsellRes.data || []).map((r: any) => ({
        upsell_type: r.upsell_type || 'upsell',
        upsell_value: Number(r.upsell_value) || 0,
        payment_type: r.payment_type || 'unico',
        upsell_month: r.upsell_month,
        upsell_year: r.upsell_year,
        card_title: r.csm_cards?.title || 'Sem nome',
        squad: r.csm_cards?.squad || '-',
        plano: r.csm_cards?.plano || '-',
        notes: r.notes || '',
      })));

      setLoading(false);
    };
    fetchData();
  }, []);

  // Current + previous month metrics
  const { current, prev } = useMemo(() => {
    const { month, year } = selectedPeriod;
    const p = getPrevMonth(month, year);
    return {
      current: calcMonthMetrics(cards, upsellRecords, month, year),
      prev: calcMonthMetrics(cards, upsellRecords, p.month, p.year),
    };
  }, [cards, upsellRecords, selectedPeriod]);

  // Plan-specific metrics (depend on toggle state)
  const planMetrics = useMemo(() => {
    const { month, year } = selectedPeriod;
    const p = getPrevMonth(month, year);
    const recorrentes = cards.filter(c => c.categoria === 'MRR recorrente' || c.categoria === 'MRR Recorrente');

    const curActiveMRR = recorrentes.filter(c => isActiveInMonth(c, month, year) && c.plano === selectedPlanMRR);
    const prevActiveMRR = recorrentes.filter(c => isActiveInMonth(c, p.month, p.year) && c.plano === selectedPlanMRR);
    const curActiveTicket = recorrentes.filter(c => isActiveInMonth(c, month, year) && c.plano === selectedPlanTicket);
    const prevActiveTicket = recorrentes.filter(c => isActiveInMonth(c, p.month, p.year) && c.plano === selectedPlanTicket);

    return {
      mrrPorPlano: curActiveMRR.reduce((s, c) => s + c.monthly_revenue, 0),
      mrrPorPlanoPrev: prevActiveMRR.reduce((s, c) => s + c.monthly_revenue, 0),
      activeByPlanMRR: curActiveMRR,
      ticketMedioPorPlano: curActiveTicket.length > 0 ? curActiveTicket.reduce((s, c) => s + c.monthly_revenue, 0) / curActiveTicket.length : 0,
      ticketMedioPorPlanoPrev: prevActiveTicket.length > 0 ? prevActiveTicket.reduce((s, c) => s + c.monthly_revenue, 0) / prevActiveTicket.length : 0,
      activeByPlanTicket: curActiveTicket,
    };
  }, [cards, selectedPeriod, selectedPlanMRR, selectedPlanTicket]);

  // Upsell/Crosssell with payment filter
  const upsellFiltered = useMemo(() => {
    const { month, year } = selectedPeriod;
    const monthUpsells = upsellRecords.filter(r => r.upsell_month === month && r.upsell_year === year);
    const upsells = monthUpsells.filter(r => r.upsell_type === 'upsell');
    const crosssells = monthUpsells.filter(r => r.upsell_type === 'crosssell');

    const filteredUpsells = selectedUpsellPayment === 'todos' ? upsells : upsells.filter(r => r.payment_type === selectedUpsellPayment);
    const filteredCrosssells = selectedCrosssellPayment === 'todos' ? crosssells : crosssells.filter(r => r.payment_type === selectedCrosssellPayment);

    return {
      upsellTotal: filteredUpsells.reduce((s, r) => s + r.upsell_value, 0),
      crosssellTotal: filteredCrosssells.reduce((s, r) => s + r.upsell_value, 0),
      filteredUpsells, filteredCrosssells,
    };
  }, [upsellRecords, selectedPeriod, selectedUpsellPayment, selectedCrosssellPayment]);

  // MRR Evolution chart data (Jan 2025 → current month)
  const chartData = useMemo(() => {
    const startYear = 2025;
    const startMonth = 0;
    const data: { name: string; mrrAtivo: number; mrrPerdido: number; mrrNovos: number; clientes: number }[] = [];

    let m = startMonth, y = startYear;
    const endM = now.getMonth(), endY = now.getFullYear();

    while (y < endY || (y === endY && m <= endM)) {
      const recorrentes = cards.filter(c => c.categoria === 'MRR recorrente' || c.categoria === 'MRR Recorrente');
      const vendidos = cards.filter(c => c.categoria === 'MRR Vendido');
      const activeRec = recorrentes.filter(c => isActiveInMonth(c, m, y));
      const activeVend = vendidos.filter(c => isActiveInMonth(c, m, y));
      const churned = cards.filter(c => isChurnedInMonth(c, m, y));
      const novos = recorrentes.filter(c => isNewInMonth(c, m, y));

      data.push({
        name: `${MONTH_LABELS[m]}/${y.toString().slice(2)}`,
        mrrAtivo: activeRec.reduce((s, c) => s + c.monthly_revenue, 0) + activeVend.reduce((s, c) => s + c.monthly_revenue, 0),
        mrrPerdido: churned.reduce((s, c) => s + c.monthly_revenue, 0),
        mrrNovos: novos.reduce((s, c) => s + c.monthly_revenue, 0),
        clientes: activeRec.length + activeVend.length,
      });

      m++;
      if (m > 11) { m = 0; y++; }
    }
    return data;
  }, [cards]);

  // Churn Evolution chart data (Jan 2025 → current month)
  const churnChartData = useMemo(() => {
    const startYear = 2025;
    const startMonth = 0;
    const data: { name: string; revenueChurn: number; churnLiquido: number; mrrPerdido: number; cancelamentos: number }[] = [];

    let m = startMonth, y = startYear;
    const endM = now.getMonth(), endY = now.getFullYear();

    while (y < endY || (y === endY && m <= endM)) {
      const metrics = calcMonthMetrics(cards, upsellRecords, m, y);
      data.push({
        name: `${MONTH_LABELS[m]}/${y.toString().slice(2)}`,
        revenueChurn: parseFloat(metrics.revenueChurnPercent.toFixed(2)),
        churnLiquido: parseFloat(metrics.churnLiquidoPercent.toFixed(2)),
        mrrPerdido: metrics.mrrPerdido,
        cancelamentos: metrics.churnedCards.length,
      });
      m++;
      if (m > 11) { m = 0; y++; }
    }
    return data;
  }, [cards, upsellRecords]);

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

  const formatTooltipValue = (value: number) => formatCurrency(value);

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

      {/* Sub-tabs */}
      <div className="flex items-center px-2">
        <div className="inline-flex rounded-xl bg-card border border-border p-1 shadow-sm">
          {([
            { key: 'mrr' as const, label: 'MRR', icon: DollarSign },
            { key: 'churn' as const, label: 'Churn', icon: Percent },
            { key: 'ticket' as const, label: 'Ticket Médio', icon: Target },
            { key: 'vendas' as const, label: 'Vendas', icon: ShoppingCart },
          ]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all duration-200 ${
                activeTab === key
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* MRR Tab */}
      {activeTab === 'mrr' && (
        <>
          <ResponsiveGrid cols={{ default: 1, md: 2, xl: 3 }} gap={{ default: 6 }}>
            <KPICard
              title="MRR da Base"
              value={formatCurrency(current.mrrBase)}
              subtitle={`${current.relevantRecorrentes.length} clientes relevantes no mês`}
              icon={Database}
              variant="default"
              iconColor="text-indigo-500"
              trend={calcTrend(current.mrrBase, prev.mrrBase)}
              onValueClick={() => setDetailModal({ title: 'MRR da Base', clients: current.relevantRecorrentes })}
            />
            <KPICard
              title="MRR Recorrente"
              value={formatCurrency(current.mrrRecorrente)}
              subtitle={`${current.activeRecorrentes.length} clientes recorrentes ativos`}
              icon={Users}
              variant="default"
              iconColor="text-blue-500"
              trend={calcTrend(current.mrrRecorrente, prev.mrrRecorrente)}
              onValueClick={() => setDetailModal({ title: 'MRR Recorrente', clients: current.activeRecorrentes })}
            />
            <KPICard
              title="MRR Total"
              value={formatCurrency(current.mrrTotal)}
              subtitle={`${current.totalActiveCards.length} clientes ativos (Recorrente + Vendido)`}
              icon={DollarSign}
              variant="default"
              iconColor="text-red-500"
              trend={calcTrend(current.mrrTotal, prev.mrrTotal)}
              onValueClick={() => setDetailModal({ title: 'MRR Total', clients: current.totalActiveCards })}
            />
            <KPICard
              title="MRR Vendido"
              value={formatCurrency(current.mrrVendido)}
              subtitle={`${current.activeVendidos.length} clientes vendidos ativos`}
              icon={UserPlus}
              variant="success"
              iconColor="text-green-500"
              trend={calcTrend(current.mrrVendido, prev.mrrVendido)}
              onValueClick={() => setDetailModal({ title: 'MRR Vendido', clients: current.activeVendidos })}
            />
            <KPICard
              title="MRR Perdido"
              value={formatCurrency(current.mrrPerdido)}
              subtitle={`${current.churnedCards.length} cancelamentos no mês`}
              icon={TrendingDown}
              variant="danger"
              iconColor="text-red-500"
              trend={calcTrend(current.mrrPerdido, prev.mrrPerdido, true)}
              onValueClick={() => setDetailModal({ title: 'MRR Perdido', clients: current.churnedCards })}
            />
            <KPICard
              title="MRR por Plano"
              value={formatCurrency(planMetrics.mrrPorPlano)}
              subtitle={`Plano ${selectedPlanMRR} (${planMetrics.activeByPlanMRR.length} clientes)`}
              icon={DollarSign}
              variant="default"
              iconColor="text-blue-500"
              trend={calcTrend(planMetrics.mrrPorPlano, planMetrics.mrrPorPlanoPrev)}
              onValueClick={() => setDetailModal({ title: `MRR por Plano - ${selectedPlanMRR}`, clients: planMetrics.activeByPlanMRR })}
              filterComponent={
                <ToggleGroup type="single" value={selectedPlanMRR} onValueChange={(v) => v && setSelectedPlanMRR(v)} className="flex flex-wrap gap-2">
                  {plans.map(plan => (
                    <ToggleGroupItem key={plan} value={plan} className="text-xs px-3 py-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">{plan}</ToggleGroupItem>
                  ))}
                </ToggleGroup>
              }
            />
          </ResponsiveGrid>

          {/* MRR Evolution Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Evolução do MRR</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorMrrAtivo" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorMrrPerdido" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorMrrNovos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }}
                      formatter={(value: number, name: string) => [formatCurrency(value), name === 'mrrAtivo' ? 'MRR Ativo' : name === 'mrrPerdido' ? 'MRR Perdido' : 'MRR Novos']}
                    />
                    <Legend formatter={(value) => value === 'mrrAtivo' ? 'MRR Ativo' : value === 'mrrPerdido' ? 'MRR Perdido' : 'MRR Novos'} />
                    <Area type="monotone" dataKey="mrrAtivo" stroke="hsl(var(--primary))" fill="url(#colorMrrAtivo)" strokeWidth={2} />
                    <Area type="monotone" dataKey="mrrPerdido" stroke="hsl(0, 84%, 60%)" fill="url(#colorMrrPerdido)" strokeWidth={2} />
                    <Area type="monotone" dataKey="mrrNovos" stroke="hsl(142, 71%, 45%)" fill="url(#colorMrrNovos)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Churn Tab */}
      {activeTab === 'churn' && (
        <>
        <ResponsiveGrid cols={{ default: 1, md: 2, xl: 3 }} gap={{ default: 6 }}>
          <KPICard
            title="Revenue Churn"
            value={`${current.revenueChurnPercent.toFixed(2)}%`}
            subtitle="MRR perdido / MRR base"
            icon={Percent}
            variant={current.revenueChurnPercent > 5 ? "danger" : "default"}
            iconColor="text-orange-500"
            trend={calcTrend(current.revenueChurnPercent, prev.revenueChurnPercent, true)}
          />
          <KPICard
            title="Churn Líquido + Upsell"
            value={`${current.churnLiquidoPercent.toFixed(2)}%`}
            subtitle="(MRR perdido - upsell recorrente) / MRR base"
            icon={Percent}
            variant={current.churnLiquidoPercent > 5 ? "warning" : "default"}
            iconColor="text-amber-500"
            trend={calcTrend(current.churnLiquidoPercent, prev.churnLiquidoPercent, true)}
          />
          <KPICard
            title="MRR Perdido"
            value={formatCurrency(current.mrrPerdido)}
            subtitle={`${current.churnedCards.length} cancelamentos no mês`}
            icon={TrendingDown}
            variant="danger"
            iconColor="text-red-500"
            trend={calcTrend(current.mrrPerdido, prev.mrrPerdido, true)}
            onValueClick={() => setDetailModal({ title: 'MRR Perdido', clients: current.churnedCards })}
          />
        </ResponsiveGrid>

          {/* Churn Evolution Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Evolução do Churn</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={churnChartData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevChurn" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(25, 95%, 53%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(25, 95%, 53%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorChurnLiquido" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(45, 93%, 47%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(45, 93%, 47%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }}
                      formatter={(value: number, name: string) => [`${value.toFixed(2)}%`, name === 'revenueChurn' ? 'Revenue Churn' : 'Churn Líquido']}
                    />
                    <Legend formatter={(value) => value === 'revenueChurn' ? 'Revenue Churn %' : 'Churn Líquido + Upsell %'} />
                    <Area type="monotone" dataKey="revenueChurn" stroke="hsl(25, 95%, 53%)" fill="url(#colorRevChurn)" strokeWidth={2} />
                    <Area type="monotone" dataKey="churnLiquido" stroke="hsl(45, 93%, 47%)" fill="url(#colorChurnLiquido)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Ticket Médio Tab */}
      {activeTab === 'ticket' && (
        <ResponsiveGrid cols={{ default: 1, md: 2, xl: 3 }} gap={{ default: 6 }}>
          <KPICard
            title="Ticket Médio MRR"
            value={formatCurrency(current.ticketMedio)}
            subtitle={`Média por cliente ativo (${current.totalActiveCards.length})`}
            icon={TrendingUp}
            variant="default"
            iconColor="text-green-500"
            trend={calcTrend(current.ticketMedio, prev.ticketMedio)}
            onValueClick={() => setDetailModal({ title: 'Ticket Médio MRR', clients: current.totalActiveCards })}
          />
          <KPICard
            title="Ticket Médio Perdido"
            value={formatCurrency(current.ticketMedioPerdido)}
            subtitle={`Média por churn (${current.churnedCards.length})`}
            icon={UserMinus}
            variant="danger"
            iconColor="text-red-400"
            trend={calcTrend(current.ticketMedioPerdido, prev.ticketMedioPerdido, true)}
            onValueClick={() => setDetailModal({ title: 'Ticket Médio Perdido', clients: current.churnedCards })}
          />
          <KPICard
            title="Ticket Médio por Plano"
            value={formatCurrency(planMetrics.ticketMedioPorPlano)}
            subtitle={`Plano ${selectedPlanTicket} (${planMetrics.activeByPlanTicket.length} clientes)`}
            icon={TrendingUp}
            variant="default"
            iconColor="text-blue-600"
            trend={calcTrend(planMetrics.ticketMedioPorPlano, planMetrics.ticketMedioPorPlanoPrev)}
            onValueClick={() => setDetailModal({ title: `Ticket Médio por Plano - ${selectedPlanTicket}`, clients: planMetrics.activeByPlanTicket })}
            filterComponent={
              <ToggleGroup type="single" value={selectedPlanTicket} onValueChange={(v) => v && setSelectedPlanTicket(v)} className="flex flex-wrap gap-2">
                {plans.map(plan => (
                  <ToggleGroupItem key={plan} value={plan} className="text-xs px-3 py-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">{plan}</ToggleGroupItem>
                ))}
              </ToggleGroup>
            }
          />
        </ResponsiveGrid>
      )}

      {/* Vendas Tab */}
      {activeTab === 'vendas' && (
        <ResponsiveGrid cols={{ default: 1, md: 2, xl: 2 }} gap={{ default: 6 }}>
          <KPICard
            title="Receita Adicional Total"
            value={formatCurrency(current.receitaAdicionalTotal)}
            subtitle={`${current.upsells.length} upsells + ${current.crosssells.length} crosssells no mês`}
            icon={TrendingUp}
            variant="success"
            iconColor="text-green-500"
            trend={calcTrend(current.receitaAdicionalTotal, prev.receitaAdicionalTotal)}
          />
          <KPICard
            title="Upsell Recorrente"
            value={formatCurrency(current.upsellRecorrente)}
            subtitle={`Impacto no MRR (${current.upsells.filter(r => r.payment_type === 'recorrente').length} registros)`}
            icon={ArrowUpRight}
            variant="default"
            iconColor="text-emerald-500"
            trend={calcTrend(current.upsellRecorrente, prev.upsellRecorrente)}
            onValueClick={() => setDetailModal({ title: 'Upsell Recorrente', upsellRecords: current.upsells.filter(r => r.payment_type === 'recorrente') })}
          />
          <KPICard
            title="Upsell Total"
            value={formatCurrency(upsellFiltered.upsellTotal)}
            subtitle={`${upsellFiltered.filteredUpsells.length} registros`}
            icon={ArrowUpRight}
            variant="default"
            iconColor="text-purple-500"
            onValueClick={() => setDetailModal({ title: 'Upsell Total', upsellRecords: upsellFiltered.filteredUpsells })}
            filterComponent={
              <ToggleGroup type="single" value={selectedUpsellPayment} onValueChange={(v) => v && setSelectedUpsellPayment(v)} className="flex flex-wrap gap-2">
                {paymentTypes.map(pt => (
                  <ToggleGroupItem key={pt.value} value={pt.value} className="text-xs px-3 py-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">{pt.label}</ToggleGroupItem>
                ))}
              </ToggleGroup>
            }
          />
          <KPICard
            title="Crosssell Total"
            value={formatCurrency(upsellFiltered.crosssellTotal)}
            subtitle={`${upsellFiltered.filteredCrosssells.length} registros`}
            icon={ShoppingCart}
            variant="default"
            iconColor="text-orange-500"
            onValueClick={() => setDetailModal({ title: 'Crosssell Total', upsellRecords: upsellFiltered.filteredCrosssells })}
            filterComponent={
              <ToggleGroup type="single" value={selectedCrosssellPayment} onValueChange={(v) => v && setSelectedCrosssellPayment(v)} className="flex flex-wrap gap-2">
                {paymentTypes.map(pt => (
                  <ToggleGroupItem key={pt.value} value={pt.value} className="text-xs px-3 py-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">{pt.label}</ToggleGroupItem>
                ))}
              </ToggleGroup>
            }
          />
        </ResponsiveGrid>
      )}

      {/* Client Detail Modal */}
      <Dialog open={!!detailModal} onOpenChange={(open) => !open && setDetailModal(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{detailModal?.title}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            {detailModal?.upsellRecords ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Tipo Pagamento</TableHead>
                    <TableHead>Notas</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailModal.upsellRecords.sort((a, b) => b.upsell_value - a.upsell_value).map((record, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{record.card_title || '-'}</TableCell>
                      <TableCell className="capitalize">{record.payment_type}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground text-xs">{record.notes || '-'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(record.upsell_value)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 font-bold">
                    <TableCell colSpan={3}>Total ({detailModal.upsellRecords.length} registros)</TableCell>
                    <TableCell className="text-right">{formatCurrency(detailModal.upsellRecords.reduce((sum, r) => sum + r.upsell_value, 0))}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Squad</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead className="text-right">MRR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(detailModal?.clients || []).sort((a, b) => b.monthly_revenue - a.monthly_revenue).map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.title}</TableCell>
                      <TableCell>{client.squad || '-'}</TableCell>
                      <TableCell>{client.plano || '-'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(client.monthly_revenue)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 font-bold">
                    <TableCell colSpan={3}>Total ({detailModal?.clients?.length || 0} clientes)</TableCell>
                    <TableCell className="text-right">{formatCurrency((detailModal?.clients || []).reduce((sum, c) => sum + c.monthly_revenue, 0))}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};
