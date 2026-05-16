import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl font-semibold">Configurações</h1>
    </div>
  )
}