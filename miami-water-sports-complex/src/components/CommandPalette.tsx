import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Boxes, CornerDownLeft, Search, Sun, Users, Wrench } from 'lucide-react';
import { useStore } from '@/lib/store';
import { NAV } from '@/lib/nav';
import { cn } from '@/lib/utils';

type Result = { id: string; label: string; sub: string; to: string; kind: string; icon: typeof Users };

/**
 * Buscador global (⌘K). Recepción vive aquí: teclea el apellido, el código de
 * pulsera o el código del activo y salta directo al registro.
 */
export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { state, role } = useStore();
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenChange(true);
      }
      if (e.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onOpenChange]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setCursor(0);
    }
  }, [open]);

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    const out: Result[] = [];

    NAV.filter((n) => n.roles.includes(role))
      .filter((n) => !q || n.label.toLowerCase().includes(q))
      .slice(0, q ? 4 : 6)
      .forEach((n) => out.push({ id: n.to, label: n.label, sub: `Go to ${n.group}`, to: n.to, kind: 'Navigate', icon: n.icon }));

    if (q.length >= 2) {
      state.customers
        .filter((c) => `${c.firstName} ${c.lastName} ${c.email} ${c.memberCode} ${c.phone}`.toLowerCase().includes(q))
        .slice(0, 5)
        .forEach((c) =>
          out.push({ id: c.id, label: `${c.firstName} ${c.lastName}`, sub: `${c.memberCode} · ${c.email}`, to: `/customers/${c.id}`, kind: 'Customer', icon: Users }),
        );

      state.assets
        .filter((a) => `${a.code} ${a.name} ${a.brand} ${a.serial ?? ''}`.toLowerCase().includes(q))
        .slice(0, 5)
        .forEach((a) => out.push({ id: a.id, label: `${a.code} · ${a.name}`, sub: `${a.brand} — ${a.location}`, to: `/assets/${a.id}`, kind: 'Asset', icon: Boxes }));

      state.tickets
        .filter((t) => `${t.code} ${t.title} ${t.area}`.toLowerCase().includes(q))
        .slice(0, 4)
        .forEach((t) => out.push({ id: t.id, label: `${t.code} · ${t.title}`, sub: t.area, to: '/maintenance', kind: 'Ticket', icon: Wrench }));

      state.campers
        .filter((c) => `${c.firstName} ${c.lastName} ${c.camperCode}`.toLowerCase().includes(q))
        .slice(0, 4)
        .forEach((c) => out.push({ id: c.id, label: `${c.firstName} ${c.lastName}`, sub: `${c.camperCode} · ${c.groupName}`, to: `/summer-camp/${c.id}`, kind: 'Camper', icon: Sun }));
    }

    return out;
  }, [query, state, role]);

  if (!open) return null;

  const go = (r?: Result) => {
    if (!r) return;
    navigate(r.to);
    onOpenChange(false);
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 bg-deep-950/50 backdrop-blur-[2px]" onClick={() => onOpenChange(false)} />
      <div className="animate-fade-in relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-pop">
        <div className="flex items-center gap-3 border-b border-slate-100 px-4">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setCursor((c) => Math.min(c + 1, results.length - 1));
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                setCursor((c) => Math.max(c - 1, 0));
              }
              if (e.key === 'Enter') go(results[cursor]);
            }}
            placeholder="Customer, helmet, board, ticket, camper…"
            className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-slate-400"
          />
          <kbd className="rounded border border-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">ESC</kbd>
        </div>
        <ul className="max-h-[52vh] overflow-y-auto py-2">
          {results.length === 0 && <li className="px-4 py-8 text-center text-sm text-slate-400">No results para “{query}”</li>}
          {results.map((r, i) => (
            <li key={`${r.kind}-${r.id}`}>
              <button
                onMouseEnter={() => setCursor(i)}
                onClick={() => go(r)}
                className={cn('flex w-full items-center gap-3 px-4 py-2.5 text-left transition', i === cursor ? 'bg-lagoon-50' : 'hover:bg-slate-50')}
              >
                <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', i === cursor ? 'bg-lagoon-100 text-lagoon-700' : 'bg-slate-100 text-slate-500')}>
                  <r.icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-deep-900">{r.label}</span>
                  <span className="block truncate text-[11px] text-slate-500">{r.sub}</span>
                </span>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">{r.kind}</span>
                {i === cursor && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
