"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Cohorts" },
  { href: "/instructors", label: "Instructors" },
  { href: "/audit", label: "Audit log" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="flex gap-1 md:flex-col md:gap-0.5">
      {LINKS.map((l) => {
        const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`flex h-9 items-center rounded-lg px-3 transition-colors duration-150 ease-out-soft ${
              active
                ? "bg-raised text-fg shadow-[inset_0_0_0_1px_var(--line)]"
                : "text-fg-2 hover:bg-raised hover:text-fg"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
