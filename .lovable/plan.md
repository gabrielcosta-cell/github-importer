

## Busca inline por funil no CSM

### Problema
A busca do CSM abre um modal centralizado (spotlight) e pesquisa em todos os funis. O usuário quer uma busca inline igual a de Projetos: um campo `Input` direto na toolbar que filtra cards do funil atual em tempo real.

### Alterações

**`src/components/CSMKanban.tsx`**

1. **Remover** imports de `MobileGlobalSearch` e `DesktopGlobalSearch`
2. **Desktop toolbar (~linha 945-955)**: Substituir `<DesktopGlobalSearch .../>` por um `Input` inline com ícone de busca:
```tsx
<div className="relative flex-1 min-w-0 md:max-w-md">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
  <Input
    placeholder="Buscar cliente..."
    value={searchTerm}
    onChange={(e) => handleSearchChange(e.target.value)}
    className="pl-9 h-9"
  />
</div>
```
3. **Mobile toolbar**: Substituir `<MobileGlobalSearch .../>` por um campo de busca similar no header mobile
4. A filtragem já existe no `filteredCards` useMemo (linhas 228-230) e funciona por `searchTerm` — nenhuma alteração necessária na lógica de filtro

**Nenhum arquivo novo necessário.** O componente `MobileGlobalSearch.tsx` pode ser mantido no projeto mas não será mais importado pelo CSM.

