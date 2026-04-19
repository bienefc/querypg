'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';

export function Navbar() {
  const path = usePathname();
  return (
    <header className="h-12 border-b border-slate-800 bg-slate-950 flex items-center px-4 gap-6 shrink-0">
      <Link href="/" className="font-bold text-white text-sm tracking-tight flex items-center gap-2">
        <span className="text-blue-400">{'</>'}</span> QueryPG
      </Link>
      <nav className="flex gap-1">
        {[
          { href: '/playground', label: 'Playground' },
          { href: '/quiz',       label: 'Quiz' },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'px-3 py-1 rounded-md text-sm transition-colors',
              path.startsWith(item.href)
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
