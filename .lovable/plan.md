

## Botão "Oportunidade" no CSM + Remover "Converter para lead"

### Alterações no `src/components/kanban/CardDetailsDialog.tsx`

**1. Substituir `handleConvertToLead` por `handleCreateOpportunity`** (~linhas 1611-1708)
- Buscar pipeline "Upsell | CrossSell" em vez de "SDR | Principal"
- Buscar primeira etapa (Oportunidades) desse pipeline
- Criar cópia do card nessa etapa
- Registrar atividade no card original do CSM

**2. Adicionar botão verde "Oportunidade" ao lado do botão Churn** (duas ocorrências: desktop ~linha 2326 e mobile ~linha 3038)
- Botão verde (`bg-green-600`) com ícone `TrendingUp`
- Visível apenas em pipelines CSM e quando o card não está cancelado
- Chama `handleCreateOpportunity`

**3. Remover "Converter para lead" do menu de 3 pontos** (duas ocorrências: ~linhas 2342-2344 e ~linhas 3061-3064)

