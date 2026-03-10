

## Reordenar toolbar do CRM: Busca | Contagem + MRR | Ordenar | Filtros | Adicionar | Configurações | Pipeline | Data

### Alteração em `src/components/CRMOpsKanban.tsx`

Reordenar os elementos no bloco de controles (linhas 258-358) e adicionar MRR total + botão Filtros:

**Nova ordem dos elementos no `div` de controles à direita:**
1. **Contagem + MRR** — adicionar soma do MRR dos cards filtrados ao lado da contagem
2. **Ordenar** (Popover — já existe)
3. **Filtros** — novo `ToolbarButton` com ícone `Filter` e toast placeholder
4. **Adicionar lead** (já existe)
5. **Configurações** (dropdown — já existe)
6. **Seletor de pipeline** (Select — já existe)
7. **MonthYearPicker** (já existe, mover para o final)

**Adições:**
- Calcular `totalMRR` via `useMemo` somando `monthly_revenue` dos `filteredCards`
- Exibir `{totalMRR}` formatado ao lado da contagem de leads
- Botão Filtros com `Filter` icon e `toast.info('Filtros em breve')`

