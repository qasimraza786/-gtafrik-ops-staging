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
export const DEMO_PASSWORD = "Demo@2026!";
export const DEMO_ACCOUNTS = [
  "founder@gtafrik-staging.com",
  "admin.kin@gtafrik-staging.com",
  "admin.lub@gtafrik-staging.com",
  "admin.bra@gtafrik-staging.com",
  "sup.kin@gtafrik-staging.com",
  "sup.lub@gtafrik-staging.com",
  "sup.bra@gtafrik-staging.com",
] as const;

const DEMO_PROFILES: Record<(typeof DEMO_ACCOUNTS)[number], SessionUser> = {
  "founder@gtafrik-staging.com": {
    email: "founder@gtafrik-staging.com",
    name: "Staging Founder",
    role: "FOUNDER",
    branch: "Kinshasa",
    isAdmin: true,
  },
  "admin.kin@gtafrik-staging.com": {
    email: "admin.kin@gtafrik-staging.com",
    name: "Amina Kiala",
    role: "ADMIN",
    branch: "Kinshasa",
    isAdmin: true,
  },
  "admin.lub@gtafrik-staging.com": {
    email: "admin.lub@gtafrik-staging.com",
    name: "Patrick Mwamba",
    role: "ADMIN",
    branch: "Lubumbashi",
    isAdmin: true,
  },
  "admin.bra@gtafrik-staging.com": {
    email: "admin.bra@gtafrik-staging.com",
    name: "Serge Bemba",
    role: "ADMIN",
    branch: "Brazzaville",
    isAdmin: true,
  },
  "sup.kin@gtafrik-staging.com": {
    email: "sup.kin@gtafrik-staging.com",
    name: "Noel Kasongo",
    role: "SUPERVISOR",
    branch: "Kinshasa",
    isAdmin: false,
  },
  "sup.lub@gtafrik-staging.com": {
    email: "sup.lub@gtafrik-staging.com",
    name: "Mireille Mutombo",
    role: "SUPERVISOR",
    branch: "Lubumbashi",
    isAdmin: false,
  },
  "sup.bra@gtafrik-staging.com": {
    email: "sup.bra@gtafrik-staging.com",
    name: "Jean-Claude Moyo",
    role: "SUPERVISOR",
    branch: "Brazzaville",
    isAdmin: false,
  },
};

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
  const normalizedEmail = email.trim().toLowerCase();
  const isDemoAccount = (DEMO_ACCOUNTS as readonly string[]).includes(normalizedEmail);

  if (isDemoAccount) {
    if (password !== DEMO_PASSWORD && password !== "") {
      throw new Error("Use the staging demo password: Demo@2026!");
    }

    const profile = DEMO_PROFILES[normalizedEmail as keyof typeof DEMO_PROFILES];
    setSession(profile);
    return profile;
  }

  const { error: authError } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });
  if (authError) {
    throw new Error("Invalid email or password.");
  }

  const { data, error } = await supabase
    .from("users")
    .select("email,name,role,branch,is_admin")
    .eq("email", normalizedEmail)
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
