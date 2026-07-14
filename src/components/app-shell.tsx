import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getProfile } from "@/lib/profile.functions";
import { Home, MessageCircle, BookOpen, BarChart3, User, Sprout, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/home", label: "Início", icon: Home },
  { to: "/chat", label: "Chat", icon: MessageCircle },
  { to: "/historico", label: "Histórico", icon: BookOpen },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/perfil", label: "Perfil", icon: User },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const getProfileFn = useServerFn(getProfile);
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => getProfileFn(),
  });

  const needsOnboarding = !isLoading && !profile?.onboarded_at;

  // Redirect to onboarding if not completed
  useEffect(() => {
    if (isLoading) return;
    if (needsOnboarding && location.pathname !== "/onboarding") {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [needsOnboarding, isLoading, location.pathname, navigate]);

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  // Onboarding takes over the screen
  if (location.pathname === "/onboarding") {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  if (needsOnboarding) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-border bg-sidebar md:flex md:flex-col">
        <div className="flex items-center gap-2 px-6 pt-6 pb-8">
          <Sprout className="h-6 w-6 text-primary" />
          <span className="font-serif text-lg font-semibold">
            {profile?.assistant_name || "Nutri"}
          </span>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-sidebar-accent/50",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3">
          <Button
            onClick={handleSignOut}
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main area */}
      <main className="flex-1 pb-20 md:pb-0">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur md:hidden">
        <div className="grid grid-cols-6">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[10px] transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={handleSignOut}
            className="flex flex-col items-center gap-1 py-2.5 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <LogOut className="h-5 w-5" />
            Sair
          </button>
        </div>
      </nav>
    </div>
  );
}
