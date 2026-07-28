/**
 * Primitivas de UI del sistema de diseño.
 *
 * Todo el look & feel vive aquí: si mañana cambia la marca, se cambia en este
 * archivo y no en las 20 pantallas.
 */

import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useId,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { avatarColor, readImageFile } from '@/lib/images';
import { useT } from '@/lib/i18n';
import { cn, initials } from '@/lib/utils';

/**
 * Traducción en el borde de presentación.
 *
 * Las primitivas traducen los textos que reciben, así que las pantallas se
 * escriben en inglés plano y el español sale solo. Solo se traduce cuando el
 * valor es una cadena: un ReactNode pasa intacto.
 */
function useTx() {
  const t = useT();
  return (value: ReactNode): ReactNode => (typeof value === 'string' ? t(value) : value);
}

/* ──────────────────────────────── Botón ────────────────────────────────── */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'accent';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-lagoon-600 text-white hover:bg-lagoon-700 shadow-sm',
  accent: 'bg-sunset-500 text-white hover:bg-sunset-600 shadow-sm',
  secondary: 'bg-deep-900 text-white hover:bg-deep-800 shadow-sm',
  outline: 'border border-slate-300 bg-white text-deep-900 hover:bg-slate-50',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-deep-900',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
  icon: 'h-9 w-9',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  const t = useT();
  return (
    <button
      className={cn(
        'focus-ring inline-flex items-center justify-center rounded-lg font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
      {...props}
    >
      {Array.isArray(children)
        ? children.map((child, i) => (typeof child === 'string' ? <span key={i}>{t(child)}</span> : child))
        : typeof children === 'string'
          ? t(children)
          : children}
    </button>
  );
}

/* ──────────────────────────────── Tarjetas ─────────────────────────────── */

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('rounded-2xl border border-slate-200/80 bg-white shadow-card', className)}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  const tx = useTx();
  return (
    <div className={cn('flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon && <div className="mt-0.5 text-lagoon-600">{icon}</div>}
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold tracking-tight text-deep-900">{tx(title)}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{tx(subtitle)}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ──────────────────────────────── Badges ───────────────────────────────── */

type BadgeTone = 'slate' | 'lagoon' | 'green' | 'amber' | 'rose' | 'indigo' | 'sunset';

const BADGE_TONES: Record<BadgeTone, string> = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  lagoon: 'bg-lagoon-50 text-lagoon-700 ring-lagoon-200',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  rose: 'bg-rose-50 text-rose-700 ring-rose-200',
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  sunset: 'bg-orange-50 text-orange-700 ring-orange-200',
};

export function Badge({
  tone = 'slate',
  className,
  children,
  dot,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
  dot?: boolean;
}) {
  const tx = useTx();
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset',
        BADGE_TONES[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {tx(children)}
    </span>
  );
}

/* ──────────────────────────────── Formularios ──────────────────────────── */

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const t = useT();
  return (
    <label className={cn('block', className)}>
      {label && (
        <span className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-slate-700">
          {t(label)}
          {required && <span className="text-rose-500">*</span>}
        </span>
      )}
      {children}
      {hint && !error && <span className="mt-1 block text-[11px] text-slate-500">{t(hint)}</span>}
      {error && <span className="mt-1 block text-[11px] font-medium text-rose-600">{t(error)}</span>}
    </label>
  );
}

const inputBase =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-deep-900 placeholder:text-slate-400 transition focus:border-lagoon-500 focus:outline-none focus:ring-2 focus:ring-lagoon-500/25 disabled:bg-slate-50 disabled:text-slate-500';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(inputBase, className)} {...props} />;
  },
);

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputBase, 'min-h-[84px] resize-y', className)} {...props} />;
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <div className="relative">
      <select className={cn(inputBase, 'appearance-none pr-9', className)} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

export function Checkbox({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  const t = useT();
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <span
        className={cn(
          'mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border transition',
          checked ? 'border-lagoon-600 bg-lagoon-600 text-white' : 'border-slate-300 bg-white',
        )}
      >
        {checked && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="text-sm text-deep-900">
        {t(label)}
        {hint && <span className="block text-[11px] text-slate-500">{t(hint)}</span>}
      </span>
    </label>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const t = useT();
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t(placeholder)}
        className={cn(inputBase, 'pl-9', value && 'pr-9')}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label={t('Clear search')}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/* ───────────────────────────────── Modal ───────────────────────────────── */

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const tx = useTx();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  const widths = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-6xl' };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-deep-950/50 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'animate-fade-in relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-pop sm:rounded-2xl',
          widths[size],
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold tracking-tight text-deep-900">{tx(title)}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{tx(subtitle)}</p>}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-6 py-3.5">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/* ────────────────────────────────── Tabs ───────────────────────────────── */

const TabsCtx = createContext<{ value: string; setValue: (v: string) => void } | null>(null);

export function Tabs({
  defaultValue,
  children,
  className,
}: {
  defaultValue: string;
  children: ReactNode;
  className?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  return (
    <TabsCtx.Provider value={{ value, setValue }}>
      <div className={className}>{children}</div>
    </TabsCtx.Provider>
  );
}

export function TabList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex gap-1 overflow-x-auto border-b border-slate-200', className)} role="tablist">
      {children}
    </div>
  );
}

export function Tab({ value, children, count }: { value: string; children: ReactNode; count?: number }) {
  const ctx = useContext(TabsCtx)!;
  const tx = useTx();
  const active = ctx.value === value;
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={() => ctx.setValue(value)}
      className={cn(
        'relative -mb-px whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-semibold transition',
        active ? 'border-lagoon-600 text-lagoon-700' : 'border-transparent text-slate-500 hover:text-deep-900',
      )}
    >
      {tx(children)}
      {count != null && (
        <span className={cn('ml-1.5 rounded-full px-1.5 py-0.5 text-[10px]', active ? 'bg-lagoon-100 text-lagoon-700' : 'bg-slate-100 text-slate-600')}>
          {count}
        </span>
      )}
    </button>
  );
}

export function TabPanel({ value, children, className }: { value: string; children: ReactNode; className?: string }) {
  const ctx = useContext(TabsCtx)!;
  if (ctx.value !== value) return null;
  return <div className={cn('animate-fade-in', className)}>{children}</div>;
}

/* ───────────────────────────────── Tablas ──────────────────────────────── */

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full min-w-[640px] border-collapse text-sm', className)}>{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  const tx = useTx();
  return (
    <th className={cn('whitespace-nowrap border-b border-slate-200 bg-slate-50/80 px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500', className)}>
      {tx(children)}
    </th>
  );
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn('border-b border-slate-100 px-4 py-3 align-middle text-deep-900', className)}>{children}</td>;
}

export function Tr({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <tr onClick={onClick} className={cn('transition-colors hover:bg-lagoon-50/40', onClick && 'cursor-pointer', className)}>
      {children}
    </tr>
  );
}

/* ─────────────────────────────── Elementos ─────────────────────────────── */

export function Avatar({
  name,
  src,
  size = 'md',
  className,
}: {
  name: string;
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const sizes = {
    xs: 'h-6 w-6 text-[10px]',
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-14 w-14 text-lg',
    xl: 'h-20 w-20 text-2xl',
  };
  const [first = '', last = ''] = name.split(' ');
  if (src) {
    return <img src={src} alt={name} className={cn('shrink-0 rounded-full object-cover ring-2 ring-white', sizes[size], className)} />;
  }
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white ring-2 ring-white', sizes[size], className)}
      style={{ backgroundColor: avatarColor(name) }}
      aria-hidden
    >
      {initials(first, last)}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  const t = useT();
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {icon && <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">{icon}</div>}
      <p className="text-sm font-semibold text-deep-900">{t(title)}</p>
      {description && <p className="mt-1 max-w-sm text-xs text-slate-500">{t(description)}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ProgressBar({
  value,
  max = 100,
  tone = 'lagoon',
  className,
  showLabel,
}: {
  value: number;
  max?: number;
  tone?: 'lagoon' | 'green' | 'amber' | 'rose';
  className?: string;
  showLabel?: boolean;
}) {
  const pctValue = Math.min(100, Math.max(0, (value / max) * 100));
  const tones = { lagoon: 'bg-lagoon-500', green: 'bg-emerald-500', amber: 'bg-amber-500', rose: 'bg-rose-500' };
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className={cn('h-full rounded-full transition-all duration-500', tones[tone])} style={{ width: `${pctValue}%` }} />
      </div>
      {showLabel && <span className="w-10 text-right text-[11px] font-semibold tabular-nums text-slate-600">{Math.round(pctValue)}%</span>}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  const t = useT();
  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-deep-900">{t(title)}</h1>
          {description && <p className="mt-1 max-w-2xl text-sm text-slate-500">{t(description)}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  delta,
  icon,
  tone = 'lagoon',
  hint,
  onClick,
}: {
  label: string;
  value: ReactNode;
  delta?: { value: string; positive: boolean };
  icon?: ReactNode;
  tone?: BadgeTone;
  hint?: string;
  onClick?: () => void;
}) {
  const t = useT();
  const tx = useTx();
  const iconTones: Record<BadgeTone, string> = {
    slate: 'bg-slate-100 text-slate-600',
    lagoon: 'bg-lagoon-50 text-lagoon-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    sunset: 'bg-orange-50 text-orange-600',
  };
  return (
    <Card className={cn('p-4 transition', onClick && 'cursor-pointer hover:border-lagoon-300 hover:shadow-pop')}>
      <div onClick={onClick} className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-bold uppercase tracking-wide text-slate-500">{t(label)}</p>
          <p className="mt-1.5 text-2xl font-extrabold tracking-tight tabular-nums text-deep-900">{tx(value)}</p>
          <div className="mt-1 flex items-center gap-2">
            {delta && (
              <span className={cn('text-[11px] font-bold', delta.positive ? 'text-emerald-600' : 'text-rose-600')}>
                {delta.positive ? '▲' : '▼'} {delta.value}
              </span>
            )}
            {hint && <span className="truncate text-[11px] text-slate-500">{t(hint)}</span>}
          </div>
        </div>
        {icon && <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', iconTones[tone])}>{icon}</div>}
      </div>
    </Card>
  );
}

/* ───────────────────────────── Segmented control ───────────────────────── */

export function Segmented<T extends string | number>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  className?: string;
}) {
  const tx = useTx();
  return (
    <div className={cn('inline-flex rounded-lg bg-slate-100 p-0.5', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-[6px] px-3 py-1.5 text-xs font-semibold transition',
            value === o.value ? 'bg-white text-deep-900 shadow-sm' : 'text-slate-500 hover:text-deep-900',
          )}
        >
          {tx(o.label)}
        </button>
      ))}
    </div>
  );
}

/* ─────────────────────────── Subida de imágenes ────────────────────────── */

export function ImageUpload({
  value,
  onChange,
  label = 'Photo',
  hint = 'PNG or JPG, up to 5 MB',
  className,
}: {
  value?: string;
  onChange: (dataUrl?: string) => void;
  label?: string;
  hint?: string;
  className?: string;
}) {
  const id = useId();
  const t = useT();
  return (
    <div className={className}>
      <span className="mb-1.5 block text-xs font-semibold text-slate-700">{t(label)}</span>
      <div className="flex items-center gap-3">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50">
          {value ? (
            <>
              <img src={value} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => onChange(undefined)}
                className="absolute right-1 top-1 rounded-full bg-deep-950/60 p-1 text-white hover:bg-deep-950"
                aria-label={t('Remove photo')}
              >
                <X className="h-3 w-3" />
              </button>
            </>
          ) : (
            <label htmlFor={id} className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1 text-slate-400 hover:text-lagoon-600">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M3 16.5V6a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                <circle cx="8.5" cy="9.5" r="1.5" />
                <path d="M21 15l-5-5-9 9" />
              </svg>
              <span className="text-[10px] font-semibold">{t('Upload')}</span>
            </label>
          )}
        </div>
        <div className="min-w-0">
          <label
            htmlFor={id}
            className="focus-ring inline-flex h-8 cursor-pointer items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-deep-900 hover:bg-slate-50"
          >
            {value ? t('Change image') : t('Choose file')}
          </label>
          <p className="mt-1.5 text-[11px] text-slate-500">{t(hint)}</p>
        </div>
      </div>
      <input
        id={id}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          onChange(await readImageFile(file));
          e.target.value = '';
        }}
      />
    </div>
  );
}

/* ─────────────────────────────── Timeline ──────────────────────────────── */

export function Timeline({ children }: { children: ReactNode }) {
  return <ol className="relative space-y-4 border-l border-slate-200 pl-6">{children}</ol>;
}

export function TimelineItem({
  icon,
  title,
  meta,
  children,
  tone = 'lagoon',
}: {
  icon?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  children?: ReactNode;
  tone?: 'lagoon' | 'green' | 'amber' | 'rose' | 'slate';
}) {
  const tx = useTx();
  const tones = {
    lagoon: 'bg-lagoon-100 text-lagoon-700 ring-lagoon-50',
    green: 'bg-emerald-100 text-emerald-700 ring-emerald-50',
    amber: 'bg-amber-100 text-amber-700 ring-amber-50',
    rose: 'bg-rose-100 text-rose-700 ring-rose-50',
    slate: 'bg-slate-100 text-slate-600 ring-slate-50',
  };
  return (
    <li className="relative">
      <span className={cn('absolute -left-[34px] flex h-6 w-6 items-center justify-center rounded-full ring-4', tones[tone])}>
        {icon ?? <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      </span>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-deep-900">{tx(title)}</p>
        {meta && <span className="text-[11px] text-slate-500">{meta}</span>}
      </div>
      {children && <div className="mt-0.5 text-xs text-slate-600">{children}</div>}
    </li>
  );
}

/* ──────────────────────────────── Tooltip ──────────────────────────────── */

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  const t = useT();
  return (
    <span className="group/tt relative inline-flex">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-deep-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 transition group-hover/tt:opacity-100">
        {t(label)}
      </span>
    </span>
  );
}
