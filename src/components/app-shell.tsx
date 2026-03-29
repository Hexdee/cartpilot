import Link from "next/link";
import { ReactNode } from "react";
import { Logo } from "@/components/logo";
import { TopNav } from "@/components/top-nav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="page-shell">
      <header className="topbar">
        <Link className="brand" href="/">
          <Logo />
        </Link>
        <TopNav />
      </header>

      {children}
    </div>
  );
}
