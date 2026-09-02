import Link from "next/link";

type Task1Route = "data" | "submit" | "leaderboard";

const items: Array<{ href: string; label: string; route: Task1Route }> = [
  { href: "/task1/", label: "Data", route: "data" },
  { href: "/task1/submit/", label: "Submit", route: "submit" },
  {
    href: "/task1/leaderboard/",
    label: "Leaderboard",
    route: "leaderboard",
  },
];

export function Task1Nav({ current }: { current: Task1Route }) {
  return (
    <nav className="task-hub-nav" aria-label="Task 1 navigation">
      <Link className="task-hub-brand" href="/">
        <span className="task-hub-brand-mark" aria-hidden="true">
          FR
        </span>
        <span>
          <strong>FinReason Cup</strong>
          <small>IEEE Big Data 2026</small>
        </span>
      </Link>
      <div className="task-hub-nav-links">
        {items.map((item) => (
          <Link
            href={item.href}
            key={item.route}
            aria-current={item.route === current ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
