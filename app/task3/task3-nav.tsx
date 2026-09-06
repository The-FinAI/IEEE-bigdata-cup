import Link from "next/link";

type Task3Route = "overview" | "submit" | "leaderboard";

const items: Array<{ href: string; label: string; route: Task3Route }> = [
  { href: "/task3/", label: "Overview", route: "overview" },
  { href: "/task3/submit/", label: "Submit", route: "submit" },
  { href: "/task3/leaderboard/", label: "Leaderboard", route: "leaderboard" },
];

export function Task3Nav({ current }: { current: Task3Route }) {
  return (
    <nav className="task-hub-nav" aria-label="Task 3 navigation">
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
