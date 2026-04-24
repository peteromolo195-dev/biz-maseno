import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  Menu, X, LayoutDashboard, PieChart, Package, Users, FileCheck2,
  Receipt, MessageSquare, FileSignature, User as UserIcon, LogOut,
  ShieldCheck, Info,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/shares", label: "My Shares", icon: PieChart },
  { to: "/app/packages", label: "Packages", icon: Package },
  { to: "/app/referrals", label: "Referrals", icon: Users },
  { to: "/app/kyc", label: "KYC", icon: FileCheck2 },
  { to: "/app/transactions", label: "Transactions", icon: Receipt },
  { to: "/app/chat", label: "Chat", icon: MessageSquare },
  { to: "/app/contract", label: "Contract", icon: FileSignature },
  { to: "/app/profile", label: "Profile", icon: UserIcon },
  { to: "/about", label: "About Us", icon: Info },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  const handleNav = (to: string) => {
    setOpen(false);
    navigate({ to });
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background px-4">
        <Link to="/app" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-navy">
            <span className="font-display text-sm font-bold text-gold">S</span>
          </div>
          <span className="font-display text-base font-semibold text-navy">Sterling</span>
        </Link>
        <button
          className="flex h-10 w-10 items-center justify-center rounded-md text-navy hover:bg-muted"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </button>
      </header>

      {/* Drawer */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-sidebar text-sidebar-foreground shadow-elegant animate-in slide-in-from-left">
            <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gold">
                  <span className="font-display text-sm font-bold text-navy">S</span>
                </div>
                <span className="font-display text-base font-semibold">Sterling</span>
              </div>
              <button
                className="text-sidebar-foreground/70 hover:text-sidebar-foreground"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-2 py-3">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = path === item.to || (item.to !== "/app" && path.startsWith(item.to));
                return (
                  <button
                    key={item.to}
                    onClick={() => handleNav(item.to)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-sidebar-accent text-gold"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </button>
                );
              })}

              {isAdmin && (
                <>
                  <div className="my-3 border-t border-sidebar-border" />
                  <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-gold/80">Admin</p>
                  <button
                    onClick={() => handleNav("/admin")}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  >
                    <ShieldCheck className="h-5 w-5" />
                    Admin Panel
                  </button>
                </>
              )}
            </nav>

            <div className="border-t border-sidebar-border p-3">
              <button
                onClick={signOut}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-destructive"
              >
                <LogOut className="h-5 w-5" />
                Logout
              </button>
            </div>
          </aside>
        </>
      )}

      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
