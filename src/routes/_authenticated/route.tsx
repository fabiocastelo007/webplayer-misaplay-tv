import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { loadSession } from "@/lib/xtream";
import { getActiveProfileId, listProfiles } from "@/lib/profiles";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: ({ location }) => {
    if (typeof window === "undefined") return {};
    const session = loadSession();
    if (!session) throw redirect({ to: "/auth" });
    const pid = getActiveProfileId();
    const onPerfis = location.pathname.startsWith("/perfis");
    if (!onPerfis) {
      // Sem perfis ainda OU sem perfil ativo => ir para seleção de perfis
      const profiles = listProfiles();
      if (!pid || !profiles.find((p) => p.id === pid)) {
        throw redirect({ to: "/perfis" });
      }
    }
    return { session };
  },
  component: () => <Outlet />,
});
