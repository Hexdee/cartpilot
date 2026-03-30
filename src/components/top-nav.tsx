"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const routes = [
  { href: "/", label: "Home" },
  { href: "/assistant", label: "Assistant" },
  { href: "/profile", label: "Profile" },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <nav className="topnav" aria-label="Primary">
      {routes.map((route) => {
        const isActive = pathname === route.href;

        return (
          <Link
            key={route.href}
            href={route.href}
            className={isActive ? "is-active" : undefined}
          >
            {route.label}
          </Link>
        );
      })}
    </nav>
  );
}
