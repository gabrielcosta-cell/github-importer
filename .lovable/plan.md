

## Plano

### Resumo
- Remover os Select de Squad e Plano da barra de filtros
- Manter o campo de busca por nome
- Mover contadores (clientes + MRR) para o header
- Transformar cabeçalhos da tabela em botões de ordenação (asc/desc)
- Colunas categóricas (Squad, Plano, Serviço, Origem, Tipo Receita, Etapa Formal, Fase, Nicho) ganham ícone de filtro com Popover + checkboxes
- Header "Nome" ordena A-Z / Z-A ao clicar (sem filtro inline — busca permanece no topo)

### Detalhes técnicos

**Novo estado:**
- `sortColumn: string | null` + `sortDirection: 'asc' | 'desc'`
- `columnFilters: Record<string, string[]>` — valores selecionados por coluna

**Componente inline `SortableHeader`:**
- Renderiza nome da coluna como botão clicável → toggle sort
- Mostra ícone ArrowUp/ArrowDown conforme direção
- Para colunas filtráveis: ícone Filter ao lado que abre Popover com checkboxes dos valores únicos

**Remoção:**
- Selects de Squad/Plano e seus estados (`squadFilter`, `planoFilter`)
- Import de Select components (se não usados em outro lugar)

**Arquivo:** `src/components/GestaoProjetosOperacao.tsx`

