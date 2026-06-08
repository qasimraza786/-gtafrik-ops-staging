import { supabase } from "./supabase";

export type UserRole = "FOUNDER" | "ADMIN" | "SUPERVISOR";

export type SessionUser = {
  email: string;
  name: string;
  role: UserRole;
  branch: string;
  isAdmin: boolean;
};

const SESSION_KEY = "gtafrik_session";

type UserRow = {
  email: string;
  name: string;
  role: UserRole;
  branch: string;
  is_admin: boolean;
};

/**
 * Authenticate against Supabase Auth, then resolve role + branch from the
 * `users` table. On success the resolved profile is cached in localStorage so
 * the rest of the app can read it synchronously via getSession().
 */
export async function signIn(email: string, password: string): Promise<SessionUser> {
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (authError) {
    throw new Error("Invalid email or password.");
  }

  const { data, error } = await supabase
    .from("users")
    .select("email,name,role,branch,is_admin")
    .eq("email", email.trim().toLowerCase())
    .single<UserRow>();

  if (error || !data) {
    await supabase.auth.signOut();
    throw new Error("No profile found for this account. Contact an administrator.");
  }

  const user: SessionUser = {
    email: data.email,
    name: data.name,
    role: data.role,
    branch: data.branch,
    isAdmin: data.is_admin,
  };
  setSession(user);
  return user;
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
  clearSession();
}

export function setSession(user: SessionUser): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function getSession(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join("");
}
