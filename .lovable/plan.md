

## Plano: Atribuir receita CRM da Versatil Banheiras ao card CSM #0031

### Problema
A Versatil Banheiras tem dois cards CSM (Social Media e Performance). O card CRM está com um `display_id` que não corresponde ao card de Performance (#0031), então aparece como linha separada na tabela.

### Solução
Executar um UPDATE simples no banco para setar o `display_id` do card CRM da Versatil Banheiras para `31` (correspondente ao card de Performance).

```sql
UPDATE csm_cards
SET display_id = 31
WHERE LOWER(TRIM(company_name)) LIKE '%versatil%banheiras%'
  AND pipeline_id != '749ccdc2-5127-41a1-997b-3dcb47979555'
  AND monthly_revenue > 0;
```

Isso fará com que o merge na aba Projetos vincule automaticamente a receita CRM ao card de Performance #0031, eliminando a linha duplicada.

### Nenhuma alteração de código necessária
A lógica de merge por `display_id` já está implementada e funcionando. Este é apenas um ajuste de dados.

