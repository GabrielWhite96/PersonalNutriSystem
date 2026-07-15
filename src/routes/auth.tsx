import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sprout } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    // Wait for OAuth exchange when landing on /auth?code=...
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/home" });
  },
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    // Finish OAuth redirect (?code= / #access_token=) before sending the user on.
    void supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) navigate({ to: "/home", replace: true });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) navigate({ to: "/home", replace: true });
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  async function signInGoogle() {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          // Land back on /auth so the session is established before /home loads.
          redirectTo: `${window.location.origin}/auth`,
        },
      });
      if (error || !data.url) {
        toast.error("Não foi possível entrar. Tente novamente.");
        setLoading(false);
        return;
      }
      window.location.assign(data.url);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao entrar com Google.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <Sprout className="h-6 w-6 text-primary" />
          <span className="font-serif text-xl font-semibold">Nutri</span>
        </div>
        <h1 className="text-center font-serif text-2xl font-semibold">Entre para começar</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Seu diário alimentar por conversa.
        </p>
        <Button
          onClick={signInGoogle}
          disabled={loading}
          className="mt-8 w-full"
          size="lg"
        >
          {loading ? "Abrindo Google..." : "Continuar com Google"}
        </Button>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Ao entrar você concorda em ter seus dados de alimentação armazenados apenas para você.
        </p>
      </div>
    </div>
  );
}
