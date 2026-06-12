import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, ShieldCheck, Brain, FileSearch } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PriorFlow AI — Healthcare Prior Authorization Copilot" },
      { name: "description", content: "AI-powered prior authorization platform that helps providers cut denial rates, draft appeals, and surface operational insights." },
      { property: "og:title", content: "PriorFlow AI" },
      { property: "og:description", content: "AI-powered prior authorization copilot for healthcare teams." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <header className="border-b bg-background/70 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 grid place-items-center text-primary-foreground">
              <Activity className="size-4" />
            </div>
            <span className="font-semibold tracking-tight">PriorFlow AI</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost"><Link to="/auth">Sign in</Link></Button>
            <Button asChild><Link to="/auth" search={{ tab: "signup" }}>Get started</Link></Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <section className="pt-24 pb-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-success" /> AI-powered prior authorization
          </div>
          <h1 className="mt-6 text-5xl md:text-6xl font-bold tracking-tight text-foreground">
            Cut denials. Draft appeals. <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">In minutes.</span>
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground">
            PriorFlow AI scores every authorization request for denial risk, drafts payer-ready appeal packets, and gives your operations team the dashboard they actually need.
          </p>
          <div className="mt-10 flex items-center justify-center gap-3">
            <Button asChild size="lg"><Link to="/auth" search={{ tab: "signup" }}>Start free</Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/auth">Sign in</Link></Button>
          </div>
        </section>

        <section className="grid md:grid-cols-3 gap-6 pb-24">
          {[
            { icon: ShieldCheck, title: "Denial risk engine", body: "Every authorization gets approval, denial, documentation, coding, and payer-complexity scores in seconds." },
            { icon: Brain, title: "AI appeal drafting", body: "Letter, clinical justification, supporting evidence and payer-specific reply — generated and version-tracked." },
            { icon: FileSearch, title: "Operational insights", body: "Denial patterns, bottlenecks, documentation gaps, and approval-rate optimizations powered by your data." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="size-10 rounded-lg bg-primary/10 text-primary grid place-items-center"><Icon className="size-5" /></div>
              <h3 className="mt-4 font-semibold tracking-tight">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} PriorFlow AI · Built for healthcare operations teams.
      </footer>
    </div>
  );
}
