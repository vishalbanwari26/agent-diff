import Link from 'next/link';
import { ThemeToggle } from './theme-toggle';

const isStatic = process.env['NEXT_PUBLIC_STATIC'] === '1';

export function Shell({ crumbs, children }: { crumbs: { label: string; href?: string }[]; children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      {isStatic && (
        <div className="border-b border-line bg-accent-soft px-4 py-1.5 text-center text-[12px] text-muted">
          Read-only demo of a real run on invented data. Decisions stay in your browser.{' '}
          <a className="font-medium text-accent hover:underline" href="https://github.com/vishalbanwari26/agent-diff">Run it yourself</a>
        </div>
      )}
      <header className="sticky top-0 z-20 border-b border-line bg-bg/80 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-[1440px] items-center gap-3 px-4 sm:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold tracking-tight whitespace-nowrap">
            <Logo />
            agent-diff
          </Link>
          <nav className="hidden min-w-0 items-center gap-2 text-muted sm:flex">
            {crumbs.map((c, i) => (
              <span key={i} className="flex min-w-0 items-center gap-2">
                <span className="text-faint">/</span>
                {c.href ? (
                  <Link href={c.href} className="truncate hover:text-fg">{c.label}</Link>
                ) : (
                  <span className="truncate text-fg">{c.label}</span>
                )}
              </span>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <a href="https://github.com/vishalbanwari26/agent-diff" className="rounded-md px-2 py-1 text-muted hover:bg-hover hover:text-fg">GitHub</a>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}

function Logo() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
      <rect width="20" height="20" rx="5" fill="var(--accent)" />
      <path d="M6 7.5h5M6 12.5h8" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="14" cy="7.5" r="1.4" fill="white" />
    </svg>
  );
}
