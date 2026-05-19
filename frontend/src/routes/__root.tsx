import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRealtime } from "@/hooks/useRealtime"; 
import { Toaster } from "@/components/ui/sonner";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe ou foi movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar ao dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight">Algo deu errado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Não foi possível carregar esta página. Tente novamente.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "PrintOps — Monitoramento de Impressoras Corporativas" },
      {
        name: "description",
        content:
          "Dashboard SaaS para monitoramento em tempo real de impressoras corporativas: status, toner, páginas e alertas.",
      },
      { name: "author", content: "PrintOps" },
      { property: "og:title", content: "PrintOps — Monitoramento de Impressoras Corporativas" },
      { property: "og:description", content: "Print Monitor Pro is a professional SaaS dashboard for monitoring corporate printers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "PrintOps — Monitoramento de Impressoras Corporativas" },
      { name: "description", content: "Print Monitor Pro is a professional SaaS dashboard for monitoring corporate printers." },
      { name: "twitter:description", content: "Print Monitor Pro is a professional SaaS dashboard for monitoring corporate printers." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/e279fcfa-7c4b-4219-9d69-cb22f67f1348/id-preview-aa054c5a--116f5add-0fee-4b53-b4d8-723a17ff28b6.lovable.app-1778683675777.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/e279fcfa-7c4b-4219-9d69-cb22f67f1348/id-preview-aa054c5a--116f5add-0fee-4b53-b4d8-723a17ff28b6.lovable.app-1778683675777.png" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <HeadContent />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-foreground antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AppRealtime() {

  useRealtime();

  return null;

}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
  <QueryClientProvider client={queryClient}>

    <AppRealtime />

    <Outlet />

    <Toaster
      richColors
      position="top-right"
    />

  </QueryClientProvider>

  );
}
