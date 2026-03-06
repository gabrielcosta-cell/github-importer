

## Alterar "CRM:" no header para somar todas as receitas CRM

### Alteração única em `src/components/GestaoProjetosOperacao.tsx`

**Linha 589**: Trocar `totalCRM` por `totalCRM + totalVarMidia + totalVarVendas` na exibição do header:
```tsx
<span className="text-sm font-medium">CRM: {formatCurrency(totalCRM + totalVarMidia + totalVarVendas)}</span>
```

**Linhas 590-591**: Remover os indicadores condicionais de "Var. Mídia" e "Var. Vendas" do header (os separadores `|` e spans).

As colunas individuais na tabela (Vendas CRM, Var. Mídia, Var. Vendas) permanecem inalteradas.

