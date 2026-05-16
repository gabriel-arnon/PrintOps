import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/printers')({
  component: PrintersPage,
})

function PrintersPage() {
  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl font-semibold">Impressoras</h1>
    </div>
  )
}