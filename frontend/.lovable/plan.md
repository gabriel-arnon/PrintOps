# Plano — Printer Details Drawer (com melhorias de performance)

## Objetivo
Drawer lateral (Sheet à direita) abre ao clicar numa linha da tabela, exibindo detalhes, consumíveis, estatísticas, gráficos de histórico e info técnica. Carregamento sob demanda + caching para sensação instantânea.

## Arquivos

**Criar**
- `src/components/dashboard/PrinterDetailsDrawer.tsx`

**Editar**
- `src/lib/api.ts` — tipos + funções:
  - `PrinterDetails`, `PrinterHistoryPoint`, `PrinterStats`
  - `fetchPrinterDetails(id)` → `GET /printers/{id}/details`
  - `fetchPrinterHistory(id)` → `GET /printers/{id}/history`
  - `fetchPrinterStats(id)` → `GET /printers/{id}/stats`
- `src/components/dashboard/PrintersTable.tsx`:
  - Linha `cursor-pointer`, clique abre drawer com `selectedId`
  - `stopPropagation` nos wrappers das ações (Editar/Excluir) para não abrir o drawer

## Drawer — estrutura

`Sheet` + `SheetContent side="right"` `sm:max-w-xl`. Três `useQuery` independentes, cada um com seu skeleton/erro.

1. **Header**: nome (xl), modelo + IP muted, badge de status grande, uptime.
   - Mapeamento de cor: idle/online → verde, printing → azul, warmup → amarelo, offline → vermelho, unknown → muted.
2. **Consumíveis**: barras grandes (toner, image unit) + % destaque. Cores via `getTonerLevel` (>50 ok, 20–50 warn, <20 danger).
3. **Estatísticas**: grid 2x2 (Hoje, 7 dias, Média diária, Total). Números via `Intl.NumberFormat('pt-BR')`.
4. **Gráficos (recharts)**:
   - 2 `LineChart` responsivos (height ~160), toner % e image unit %
   - Eixo X em `HH:mm` (date-fns)
   - Tooltip dark custom, grid suave, linha `strokeWidth={2}`, sem dots
   - **Limitar a últimos 50 pontos**: `const limitedHistory = history.slice(-50)`
   - Empty state se `limitedHistory.length < 2`: "Sem histórico suficiente"
5. **Informações técnicas**: `Collapsible` com `font-mono text-xs` — serial, hostname, MAC, firmware.

## Performance / caching

Aplicar nas três queries do drawer:

```ts
useQuery({
  queryKey: ['printer', id, 'details'], // 'history' | 'stats'
  queryFn: () => fetchPrinterDetails(id),
  enabled: open && !!printerId,
  staleTime: 1000 * 60,        // 1 min: sem refetch ao reabrir
  placeholderData: (prev) => prev, // mantém dados anteriores durante refetch (sem flicker)
})
```

- `enabled` garante zero impacto no load inicial do dashboard.
- `staleTime: 60s` → reabrir a mesma impressora é instantâneo.
- `placeholderData: (prev) => prev` (substitui o antigo `keepPreviousData`) mantém o último snapshot visível enquanto o refetch silencioso ocorre.
- Skeletons só aparecem na **primeira** carga (quando não há dados em cache).

## Detalhes técnicos
- `queryKey` por recurso: `['printer', id, 'details' | 'history' | 'stats']`.
- Status color map centralizado no componente; tokens já existentes (oklch verde/azul/amarelo/vermelho).
- Mantém identidade dark premium (`border-border/60`, `bg-card/80`, animações suaves do Sheet).

## Fora de escopo
- Sem mudanças no backend, sem polling, sem refactor amplo da tabela.
