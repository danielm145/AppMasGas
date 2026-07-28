import { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  ChevronsUpDown,
  Menu,
  RotateCcw,
  Search,
  Waves,
  X,
} from 'lucide-react';
import { BRAND_ICON, GROUP_ORDER, NAV } from '@/lib/nav';
import { useStore } from '@/lib/store';
import { LANGUAGES, useI18n } from '@/lib/i18n';
import { ROLE_LABELS } from '@/lib/types';
import { cn, relativeTime } from '@/lib/utils';
import { Avatar, Badge } from './ui';
import { CommandPalette } from './CommandPalette';

export function AppShell() {
  const { state, currentUser, role, setCurrentUser, markAllNotificationsRead, markNotificationRead, resetDemo } = useStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const location = useLocation();
  const { lang, setLang, t } = useI18n();

  const badges = useMemo(
    () => ({
      openTickets: state.tickets.filter((t) => !['resolved', 'closed'].includes(t.status)).length,
      lowStock: state.supplies.filter((s) => s.stock <= s.minStock).length,
      activeSessions: state.rideSessions.filter((s) => s.status === 'active').length,
      pendingWaivers:
        state.customers.length -
        new Set(state.waivers.filter((w) => new Date(w.expiresAt) > new Date()).map((w) => w.customerId)).size,
    }),
    [state],
  );

  const visibleNav = NAV.filter((n) => n.roles.includes(role));
  const unread = state.notifications.filter((n) => !n.read);

  const sidebar = (
    <div className="flex h-full w-64 flex-col bg-deep-950 text-slate-300">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-lagoon-500 text-white shadow-lg shadow-lagoon-500/30">
          <BRAND_ICON className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-extrabold leading-tight text-white">Miami Water Sports</p>
          <p className="text-[10px] font-medium uppercase tracking-widest text-lagoon-400">Hialeah · FL</p>
        </div>
        <button className="ml-auto text-slate-400 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close menu">
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {GROUP_ORDER.map((group) => {
          const items = visibleNav.filter((n) => n.group === group);
          if (!items.length) return null;
          return (
            <div key={group}>
              <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">{t(group)}</p>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const count = item.badgeKey ? badges[item.badgeKey] : 0;
                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.to === '/'}
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                          cn(
                            'group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition',
                            isActive
                              ? 'bg-lagoon-500/15 text-white shadow-[inset_2px_0_0_0_theme(colors.lagoon.400)]'
                              : 'text-slate-400 hover:bg-white/5 hover:text-white',
                          )
                        }
                      >
                        <item.icon className="h-[17px] w-[17px] shrink-0" />
                        <span className="truncate">{t(item.label)}</span>
                        {count > 0 && (
                          <span className="ml-auto rounded-full bg-sunset-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                            {count}
                          </span>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <button
          onClick={resetDemo}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-medium text-slate-400 transition hover:bg-white/5 hover:text-white"
        >
          <RotateCcw className="h-4 w-4" /> {t('Reset demo data')}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-full">
      {/* Sidebar escritorio */}
      <aside className="hidden shrink-0 lg:block">{sidebar}</aside>

      {/* Sidebar móvil */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-deep-950/60" onClick={() => setMobileOpen(false)} />
          <div className="animate-fade-in absolute inset-y-0 left-0">{sidebar}</div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior */}
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:px-6">
          <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>

          <button
            onClick={() => setPaletteOpen(true)}
            className="flex h-9 flex-1 max-w-md items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-left text-sm text-slate-400 transition hover:border-slate-300 hover:bg-white"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 truncate">{t('Search customer, asset, ticket…')}</span>
            <kbd className="hidden rounded border border-slate-200 bg-white px-1.5 py-0.5 font-sans text-[10px] font-semibold text-slate-500 sm:block">⌘K</kbd>
          </button>

          <div className="ml-auto flex items-center gap-1.5">
            {/* Idioma — inglés es el idioma base del sistema */}
            <div className="hidden rounded-lg bg-slate-100 p-0.5 sm:flex">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  title={l.label}
                  className={cn(
                    'rounded-[6px] px-2 py-1 text-[11px] font-bold transition',
                    lang === l.code ? 'bg-white text-deep-900 shadow-sm' : 'text-slate-500 hover:text-deep-900',
                  )}
                >
                  {l.code.toUpperCase()}
                </button>
              ))}
            </div>
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => {
                  setNotifOpen((v) => !v);
                  setUserOpen(false);
                }}
                className="relative rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-deep-900"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unread.length > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-sunset-500 px-1 text-[9px] font-bold text-white">
                    {unread.length}
                  </span>
                )}
              </button>
              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
                  <div className="animate-fade-in absolute right-0 z-20 mt-2 w-[360px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-pop">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                      <p className="text-sm font-bold text-deep-900">{t('Notifications')}</p>
                      <button onClick={markAllNotificationsRead} className="flex items-center gap-1 text-[11px] font-semibold text-lagoon-600 hover:text-lagoon-700">
                        <CheckCheck className="h-3.5 w-3.5" /> {t('Mark all read')}
                      </button>
                    </div>
                    <ul className="max-h-[380px] overflow-y-auto">
                      {state.notifications.slice(0, 20).map((n) => (
                        <li key={n.id}>
                          <NavLink
                            to={n.href ?? '#'}
                            onClick={() => {
                              markNotificationRead(n.id);
                              setNotifOpen(false);
                            }}
                            className={cn('flex gap-3 border-b border-slate-50 px-4 py-3 transition hover:bg-slate-50', !n.read && 'bg-lagoon-50/40')}
                          >
                            <span
                              className={cn(
                                'mt-1 h-2 w-2 shrink-0 rounded-full',
                                n.severity === 'critical' ? 'bg-rose-500' : n.severity === 'warning' ? 'bg-amber-500' : 'bg-lagoon-500',
                              )}
                            />
                            <span className="min-w-0">
                              <span className="block truncate text-[13px] font-semibold text-deep-900">{n.title}</span>
                              <span className="block truncate text-[11px] text-slate-500">{n.detail}</span>
                              <span className="mt-0.5 block text-[10px] text-slate-400">{relativeTime(n.at)}</span>
                            </span>
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>

            {/* Selector de usuario / rol */}
            <div className="relative">
              <button
                onClick={() => {
                  setUserOpen((v) => !v);
                  setNotifOpen(false);
                }}
                className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition hover:bg-slate-100"
              >
                <Avatar name={`${currentUser.firstName} ${currentUser.lastName}`} size="sm" />
                <span className="hidden text-left sm:block">
                  <span className="block text-[13px] font-bold leading-tight text-deep-900">{currentUser.firstName}</span>
                  <span className="block text-[10px] leading-tight text-slate-500">{t(ROLE_LABELS[currentUser.role])}</span>
                </span>
                <ChevronsUpDown className="h-3.5 w-3.5 text-slate-400" />
              </button>
              {userOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setUserOpen(false)} />
                  <div className="animate-fade-in absolute right-0 z-20 mt-2 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-pop">
                    <p className="border-b border-slate-100 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      {t('Switch user (demo)')}
                    </p>
                    <ul className="max-h-72 overflow-y-auto py-1">
                      {state.employees.map((e) => (
                        <li key={e.id}>
                          <button
                            onClick={() => {
                              setCurrentUser(e.id);
                              setUserOpen(false);
                            }}
                            className={cn(
                              'flex w-full items-center gap-2.5 px-4 py-2 text-left transition hover:bg-slate-50',
                              e.id === currentUser.id && 'bg-lagoon-50',
                            )}
                          >
                            <Avatar name={`${e.firstName} ${e.lastName}`} size="xs" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13px] font-semibold text-deep-900">
                                {e.firstName} {e.lastName}
                              </span>
                              <span className="block text-[10px] text-slate-500">{t(ROLE_LABELS[e.role])}</span>
                            </span>
                            {e.id === currentUser.id && <Badge tone="lagoon">Active</Badge>}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main key={location.pathname} className="animate-fade-in flex-1 overflow-y-auto px-4 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <Toasts />
    </div>
  );
}

function Toasts() {
  const { toasts, dismissToast } = useStore();
  if (!toasts.length) return null;
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-80 flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'animate-fade-in pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-pop',
            t.tone === 'error' ? 'border-rose-200 bg-rose-50' : t.tone === 'info' ? 'border-lagoon-200 bg-lagoon-50' : 'border-emerald-200 bg-emerald-50',
          )}
        >
          <Waves
            className={cn('mt-0.5 h-4 w-4 shrink-0', t.tone === 'error' ? 'text-rose-600' : t.tone === 'info' ? 'text-lagoon-600' : 'text-emerald-600')}
          />
          <p className="flex-1 text-[13px] font-medium text-deep-900">{t.message}</p>
          <button onClick={() => dismissToast(t.id)} className="text-slate-400 hover:text-slate-600" aria-label="Cerrar">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
