import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(30);
    return data ?? [];
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().optional(), all: z.boolean().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.all) {
      const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", userId).is("read_at", null);
      if (error) throw new Error(error.message);
    } else if (data.id) {
      const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", data.id);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const [p, r] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id,role"),
    ]);
    const rolesByUser: Record<string, string[]> = {};
    (r.data ?? []).forEach((row) => {
      rolesByUser[row.user_id] = [...(rolesByUser[row.user_id] ?? []), row.role];
    });
    return (p.data ?? []).map((prof) => ({ ...prof, roles: rolesByUser[prof.id] ?? [] }));
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    user_id: z.string(),
    role: z.enum(["admin","physician","clinical_staff","billing"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    // Replace all roles with the single new role
    await supabase.from("user_roles").delete().eq("user_id", data.user_id);
    const { error } = await supabase.from("user_roles").insert({ user_id: data.user_id, role: data.role });
    if (error) throw new Error(error.message);
    await supabase.from("audit_logs").insert({
      actor_id: userId, action: "role_changed", entity_type: "user", entity_id: data.user_id,
      after: { role: data.role },
    });
    return { ok: true };
  });

export const setUserStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    user_id: z.string(),
    status: z.enum(["active","suspended","invited"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { error } = await supabase.from("profiles").update({ status: data.status }).eq("id", data.user_id);
    if (error) throw new Error(error.message);
    await supabase.from("audit_logs").insert({
      actor_id: userId, action: "status_changed", entity_type: "user", entity_id: data.user_id,
      after: { status: data.status },
    });
    return { ok: true };
  });

export const listAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const [logs, profiles] = await Promise.all([
      supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("profiles").select("id,full_name,email"),
    ]);
    const byId: Record<string, { full_name: string | null; email: string | null }> = {};
    (profiles.data ?? []).forEach((p) => { byId[p.id] = { full_name: p.full_name, email: p.email }; });
    return (logs.data ?? []).map((l) => ({ ...l, actor: l.actor_id ? byId[l.actor_id] : null }));
  });

export const getSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data } = await supabase.from("app_settings").select("*").eq("id", 1).single();
    return data;
  });

export const updateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    organization_name: z.string().optional(),
    default_payer: z.string().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { error } = await supabase.from("app_settings").update({ ...data, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) throw new Error(error.message);
    await supabase.from("audit_logs").insert({
      actor_id: userId, action: "settings_updated", entity_type: "app_settings", after: data,
    });
    return { ok: true };
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    full_name: z.string().optional(),
    title: z.string().optional(),
    department: z.string().optional(),
    npi: z.string().optional(),
    notification_prefs: z.record(z.string(), z.boolean()).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("profiles").update(data).eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [prof, roles] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    return { profile: prof.data, roles: (roles.data ?? []).map((r) => r.role) };
  });
