import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "@/components/KPICard";
import { ResponsiveGrid } from "@/components/ResponsiveGrid";
import { DollarSign, TrendingUp, ArrowUpRight, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/formatCurrency";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface BusinessData {
  mrr: number;
  plano: string;
}

interface UpsellRecord {
  upsell_type: string;
  upsell_value: number;
  payment_type: string;
}

export const FinancialMetrics = () => {
  const [businesses, setBusinesses] = useState<BusinessData[]>([]);
  const [upsellRecords, setUpsellRecords] = useState<UpsellRecord[]>([]);
  const [selectedPlanMRR, setSelectedPlanMRR] = useState<string>("Business");
  const [selectedPlanTicket, setSelectedPlanTicket] = useState<string>("Business");
  const [selectedUpsellPayment, setSelectedUpsellPayment] = useState<string>("todos");
  const [selectedCrosssellPayment, setSelectedCrosssellPayment] = useState<string>("todos");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBusinessData();
  }, []);

  const fetchBusinessData = async () => {
    try {
      setLoading(true);
      
      const [cardsRes, upsellRes] = await Promise.all([
        supabase
          .from('csm_cards')
          .select('monthly_revenue, plano')
          .eq('pipeline_id', '749ccdc2-5127-41a1-997b-3dcb47979555')
          .eq('churn', false)
          .eq('categoria', 'MRR recorrente'),
        supabase
          .from('csm_card_upsell_history')
          .select('upsell_type, upsell_value, payment_type')
      ]);

      if (cardsRes.error) throw cardsRes.error;

      const parsedBusinesses: BusinessData[] = (cardsRes.data || []).map(card => ({
        mrr: Number(card.monthly_revenue) || 0,
        plano: card.plano || 'Starter',
      }));

      const parsedUpsells: UpsellRecord[] = (upsellRes.data || []).map((r: any) => ({
        upsell_type: r.upsell_type || 'upsell',
        upsell_value: Number(r.upsell_value) || 0,
        payment_type: r.payment_type || 'unico',
      }));

      setBusinesses(parsedBusinesses);
      setUpsellRecords(parsedUpsells);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cálculos MRR
  const mrrTotal = businesses.reduce((sum, b) => sum + b.mrr, 0);
  const businessesByPlan = businesses.filter(b => b.plano === selectedPlanMRR);
  const mrrPorPlano = businessesByPlan.reduce((sum, b) => sum + b.mrr, 0);
  const ticketMedioMRR = businesses.length > 0 ? mrrTotal / businesses.length : 0;
  const businessesByPlanTicket = businesses.filter(b => b.plano === selectedPlanTicket);
  const ticketMedioPorPlano = businessesByPlanTicket.length > 0 
    ? businessesByPlanTicket.reduce((sum, b) => sum + b.mrr, 0) / businessesByPlanTicket.length 
    : 0;

  // Cálculos Upsell/Crosssell
  const upsells = upsellRecords.filter(r => r.upsell_type === 'upsell');
  const crosssells = upsellRecords.filter(r => r.upsell_type === 'crosssell');
  
  const receitaAdicionalTotal = upsellRecords.reduce((sum, r) => sum + r.upsell_value, 0);
  const upsellRecorrente = upsells.filter(r => r.payment_type === 'recorrente').reduce((sum, r) => sum + r.upsell_value, 0);
  
  const filteredUpsells = selectedUpsellPayment === 'todos' 
    ? upsells 
    : upsells.filter(r => r.payment_type === selectedUpsellPayment);
  const upsellTotal = filteredUpsells.reduce((sum, r) => sum + r.upsell_value, 0);
  
  const filteredCrosssells = selectedCrosssellPayment === 'todos' 
    ? crosssells 
    : crosssells.filter(r => r.payment_type === selectedCrosssellPayment);
  const crosssellTotal = filteredCrosssells.reduce((sum, r) => sum + r.upsell_value, 0);

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
      <h2 className="text-3xl font-bold">Métricas Financeiras</h2>
      
      <ResponsiveGrid 
        cols={{ default: 1, md: 2, xl: 3 }}
        gap={{ default: 6 }}
      >
        {/* MRR Total */}
        <KPICard
          title="MRR Total"
          value={formatCurrency(mrrTotal)}
          subtitle="Receita Recorrente Mensal"
          icon={DollarSign}
          variant="default"
          iconColor="text-red-500"
        />

        {/* MRR por Plano */}
        <KPICard
          title="MRR por Plano"
          value={formatCurrency(mrrPorPlano)}
          subtitle={`Plano ${selectedPlanMRR} (${businessesByPlan.length} clientes)`}
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

        {/* Ticket Médio MRR */}
        <KPICard
          title="Ticket Médio MRR"
          value={formatCurrency(ticketMedioMRR)}
          subtitle={`Média por cliente (${businesses.length} clientes)`}
          icon={TrendingUp}
          variant="default"
          iconColor="text-green-500"
        />

        {/* Ticket Médio por Plano */}
        <KPICard
          title="Ticket Médio por Plano"
          value={formatCurrency(ticketMedioPorPlano)}
          subtitle={`Plano ${selectedPlanTicket} (${businessesByPlanTicket.length} clientes)`}
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
          value={formatCurrency(receitaAdicionalTotal)}
          subtitle={`${upsells.length} upsells + ${crosssells.length} crosssells`}
          icon={TrendingUp}
          variant="success"
          iconColor="text-green-500"
        />

        {/* Upsell Recorrente (impacto MRR) */}
        <KPICard
          title="Upsell Recorrente"
          value={formatCurrency(upsellRecorrente)}
          subtitle={`Impacto no MRR (${upsells.filter(r => r.payment_type === 'recorrente').length} registros)`}
          icon={ArrowUpRight}
          variant="default"
          iconColor="text-emerald-500"
        />

        {/* Upsell Total com filtro */}
        <KPICard
          title="Upsell Total"
          value={formatCurrency(upsellTotal)}
          subtitle={`${filteredUpsells.length} registros`}
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
          value={formatCurrency(crosssellTotal)}
          subtitle={`${filteredCrosssells.length} registros`}
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
