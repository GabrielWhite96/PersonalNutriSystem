import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // Wait for OAuth code/hash exchange before checking the user.
    await supabase.auth.getSession();

    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarded_at")
      .eq("id", data.user.id)
      .maybeSingle();

    const onboarded = Boolean(profile?.onboarded_at);
    const isOnboarding = location.pathname === "/onboarding";

    if (!onboarded && !isOnboarding) {
      throw redirect({ to: "/onboarding" });
    }
    if (onboarded && isOnboarding) {
      throw redirect({ to: "/home" });
    }

    return { user: data.user, onboarded };
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
