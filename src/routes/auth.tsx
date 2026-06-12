import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Activity, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const search = z.object({
  tab: z.enum(["signin", "signup", "forgot"]).optional(),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Sign in — PriorFlow AI" },
      { name: "description", content: "Sign in to PriorFlow AI to manage prior authorizations, appeals, and analytics." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { tab } = useSearch({ from: "/auth" });
  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-background">
      <div className="hidden md:flex flex-col justify-between p-12 bg-sidebar text-sidebar-foreground">
        <div>
          <Link to="/" className="inline-flex items-center gap-2 font-semibold">
            <div className="size-8 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground grid place-items-center"><Activity className="size-4" /></div>
            PriorFlow AI
          </Link>
        </div>
        <div>
          <p className="text-2xl font-semibold leading-snug">
            "Our appeal win rate jumped from 38% to 71% in the first quarter on PriorFlow AI."
          </p>
          <p className="mt-3 text-sm opacity-70">— VP Revenue Cycle, Regional Health System</p>
        </div>
        <div className="text-xs opacity-60">© PriorFlow AI · HIPAA-aware platform</div>
      </div>

      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md border-0 shadow-none md:border md:shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Welcome to PriorFlow AI</CardTitle>
            <CardDescription>Sign in to your provider workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={tab ?? "signin"} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
                <TabsTrigger value="forgot">Reset</TabsTrigger>
              </TabsList>
              <TabsContent value="signin"><SignInForm /></TabsContent>
              <TabsContent value="signup"><SignUpForm /></TabsContent>
              <TabsContent value="forgot"><ForgotForm /></TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function GoogleButton() {
  const [loading, setLoading] = useState(false);
  const handler = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/dashboard" });
    if (result.error) { toast.error("Google sign-in failed"); setLoading(false); return; }
    if (result.redirected) return;
    window.location.href = "/dashboard";
  };
  return (
    <Button variant="outline" type="button" onClick={handler} disabled={loading} className="w-full">
      {loading ? <Loader2 className="size-4 animate-spin" /> : (
        <>
          <svg className="size-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC04" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18A10.97 10.97 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.83z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
          Continue with Google
        </>
      )}
    </Button>
  );
}

function SignInForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Welcome back");
    navigate({ to: "/dashboard" });
  };

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-4">
      <GoogleButton />
      <div className="relative text-center text-xs text-muted-foreground"><span className="bg-background px-2 relative z-10">or with email</span><div className="absolute left-0 top-1/2 w-full border-t" /></div>
      <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
      <Button type="submit" className="w-full" disabled={loading}>{loading ? <Loader2 className="size-4 animate-spin" /> : "Sign in"}</Button>
    </form>
  );
}

function SignUpForm() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: window.location.origin + "/dashboard", data: { full_name: fullName } },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Account created — signing you in");
    navigate({ to: "/dashboard" });
  };

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-4">
      <GoogleButton />
      <div className="relative text-center text-xs text-muted-foreground"><span className="bg-background px-2 relative z-10">or with email</span><div className="absolute left-0 top-1/2 w-full border-t" /></div>
      <div className="space-y-2"><Label htmlFor="full_name">Full name</Label><Input id="full_name" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Dr. Anita Shah" /></div>
      <div className="space-y-2"><Label htmlFor="email2">Work email</Label><Input id="email2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="password2">Password</Label><Input id="password2" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
      <p className="text-xs text-muted-foreground">The first account on this workspace becomes the admin.</p>
      <Button type="submit" className="w-full" disabled={loading}>{loading ? <Loader2 className="size-4 animate-spin" /> : "Create account"}</Button>
    </form>
  );
}

function ForgotForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/reset-password" });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password reset email sent");
  };
  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-4">
      <div className="space-y-2"><Label htmlFor="email3">Email</Label><Input id="email3" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <Button type="submit" className="w-full" disabled={loading}>{loading ? <Loader2 className="size-4 animate-spin" /> : "Send reset link"}</Button>
    </form>
  );
}
