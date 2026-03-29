"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/prompts", label: "Prompts", icon: "✨" },
  { href: "/tracks", label: "Tracks", icon: "🎵" },
  { href: "/videos", label: "Videos", icon: "🎬" },
  { href: "/distribution", label: "Distribution", icon: "🚀" },
  { href: "/calendar", label: "Calendar", icon: "📅" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 border-r border-[var(--border)] bg-[var(--card)] flex flex-col">
      <div className="p-4 border-b border-[var(--border)]">
        <h1 className="text-xl font-bold">
          <span className="text-[var(--primary)]">Suno</span>Flow
        </h1>
        <p className="text-xs text-[var(--muted)] mt-1">AI Music Automation</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-[var(--primary)] text-white"
                  : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card-hover)]"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[var(--border)] text-xs text-[var(--muted)]">
        SunoFlow v0.1.0
      </div>
    </aside>
  );
}
