

## Corrigir cores dos squads nos badges

### Problema
O componente `Badge` usa `variant="default"` por padrão, que aplica `bg-primary text-primary-foreground`. Quando as classes de `SQUAD_COLORS` (ex: `bg-purple-100 text-purple-800`) são passadas via `className`, o Tailwind não garante que sobrescrevam `bg-primary` — ambas têm a mesma especificidade CSS. O resultado é que todos os badges de squad ficam com a cor do `bg-primary` (vermelho/âmbar) em vez da cor correta.

### Solução
Nas duas ocorrências do Badge de squad (linhas 702 e 708 de `GestaoProjetosOperacao.tsx`), adicionar `variant="outline"` para remover o `bg-primary` padrão e permitir que as classes de `SQUAD_COLORS` sejam aplicadas corretamente.

**Arquivo**: `src/components/GestaoProjetosOperacao.tsx`

Alterar as duas linhas:
```tsx
// Linha 702 (dentro do button)
<Badge variant="outline" className={`text-xs border-0 ${SQUAD_COLORS[p.squad] || '...'}`}>

// Linha 708 (sem button)
<Badge variant="outline" className={`text-xs border-0 ${SQUAD_COLORS[p.squad] || '...'}`}>
```

Isso remove `bg-primary` e `border-transparent` do default, garantindo que as cores de `SQUAD_COLORS` sejam as únicas aplicadas. `border-0` remove a borda do variant outline.

