import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { loadSession } from "@/lib/xtream";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: () => {
    if (typeof window === "undefined") return {};
    const session = loadSession();
    if (!session) throw redirect({ to: "/auth" });
    return { session };
  },
  component: () => <Outlet />,
});
