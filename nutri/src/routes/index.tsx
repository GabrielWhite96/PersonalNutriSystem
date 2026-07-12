import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles, MessageCircle, TrendingUp, Sprout } from "lucide-react";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/home" });
  },
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <Sprout className="h-6 w-6 text-primary" />
          <span className="font-serif text-xl font-semibold">Nutri</span>
        </div>
        <Link to="/auth">
          <Button variant="ghost" size="sm">Entrar</Button>
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-6 pt-10 pb-24 md:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Registro alimentar por conversa
          </div>
          <h1 className="mt-6 font-serif text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
            Sua alimentação,
            <br />
            <span className="text-primary">em uma conversa.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Escreva o que comeu como você contaria para um amigo. A IA entende, estima calorias e
            macronutrientes, monta um resumo para você confirmar e então registra no histórico.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/auth">
              <Button size="lg" className="min-w-48">Entrar com Google</Button>
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Estimativa inteligente para acompanhamento diário. Não substitui um nutricionista.
          </p>
        </div>

        <div className="mx-auto mt-20 grid max-w-4xl gap-6 md:grid-cols-3">
          <Feature
            icon={<MessageCircle className="h-5 w-5" />}
            title="Conversa natural"
            body='"Comi dois pães com manteiga e um café." Pronto — sem preencher nada.'
          />
          <Feature
            icon={<Sparkles className="h-5 w-5" />}
            title="Estimativa esperta"
            body="A IA aprende seus padrões: 'meu café de sempre' vira registro em segundos."
          />
          <Feature
            icon={<TrendingUp className="h-5 w-5" />}
            title="Acompanhamento real"
            body="Metas, evolução do peso, relatórios diários, semanais e mensais."
          />
        </div>
      </main>
    </div>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mt-4 font-serif text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
