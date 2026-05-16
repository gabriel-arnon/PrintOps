import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/reports')({
  component: ReportsPage,
})

function ReportsPage() {
  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl font-semibold">Relatórios</h1>
    </div>
  )
}