import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { ArrowRight, Check, HelpCircle, X } from 'lucide-react';
import { NAV } from '@/lib/nav';
import { cn } from '@/lib/utils';
import { Button } from './ui';

/**
 * Recorrido guiado para enseñarle el sistema al dueño.
 *
 * No es un tutorial de la interfaz: es el circuito real de un día en el parque,
 * en orden, con una frase que explica para qué sirve cada pantalla y un botón
 * que lo lleva ahí. Funciona igual en un PC que en un iPhone.
 */

interface Step {
  to: string;
  title: string;
  body: string;
  action: string;
}

const STEPS: Step[] = [
  {
    to: '/check-in',
    title: 'A rider walks in',
    body: 'Find them or create them, they declare they can swim, they sign the waiver on screen, you charge, and you hand out a helmet and a board. The helmet and board get linked to that person.',
    action: 'Open check-in',
  },
  {
    to: '/scanner',
    title: 'They ride',
    body: 'On the dock, point the phone at the QR sticker on their helmet. The lap is counted, and the scan is signed with the employee who did it. No paper, no clipboard.',
    action: 'Open the scanner',
  },
  {
    to: '/operations',
    title: 'You see the water',
    body: 'Who is riding, on which line, how many minutes they have left, how many laps and falls. When a line fills up, it turns red and the desk stops selling it.',
    action: 'See live operations',
  },
  {
    to: '/assets',
    title: 'The gear comes back',
    body: 'The board returns to the shelf, adds hours of use and moves toward its next service. Open any board and you see who had it, when it broke and what the repair cost.',
    action: 'Open the inventory',
  },
  {
    to: '/maintenance',
    title: 'Something breaks',
    body: 'Anyone on the team reports it from their phone with a photo. If it is serious, the board is pulled from rental automatically so nobody hands it out by mistake.',
    action: 'Open maintenance',
  },
  {
    to: '/customers',
    title: 'They come back',
    body: 'Every visit builds the customer record: how often they come, what they spend, what they ride. That is what turns into points, offers and a reason to return.',
    action: 'Open customers',
  },
  {
    to: '/',
    title: 'And you see all of it',
    body: 'Money, busiest hours, which day fills up, which package sells, what is broken and what is running low. Everything here came from the scans your team already does.',
    action: 'Back to the dashboard',
  },
];

/** Cualquier pantalla puede abrir el recorrido sin conocer el estado del shell. */
export const TOUR_EVENT = 'mwc:open-tour';
export const openTour = () => window.dispatchEvent(new CustomEvent(TOUR_EVENT));

export function GuidedTour({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState<number[]>([]);
  const navigate = useNavigate();

  if (!open) return null;

  const step = STEPS[index];
  const purpose = NAV.find((n) => n.to === step.to)?.purpose;
  const isLast = index === STEPS.length - 1;

  const go = () => {
    navigate(step.to);
    setDone((d) => (d.includes(index) ? d : [...d, index]));
  };

  return createPortal(
    <div className="fixed inset-x-0 bottom-0 z-[65] px-3 pb-3 sm:inset-x-auto sm:right-5 sm:w-[380px] sm:pb-5">
      <div className="animate-fade-in overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-pop">
        <div className="wave-bg flex items-center justify-between gap-3 px-4 py-3 text-white">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-lagoon-300">
              A day at the park · {index + 1} of {STEPS.length}
            </p>
            <p className="truncate text-sm font-extrabold">{step.title}</p>
          </div>
          <button onClick={() => onOpenChange(false)} className="shrink-0 rounded-lg p-1 text-white/70 hover:bg-white/10 hover:text-white" aria-label="Close the tour">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 py-3.5">
          <p className="text-[13px] leading-relaxed text-slate-600">{step.body}</p>
          {purpose && (
            <p className="mt-2.5 rounded-lg bg-lagoon-50 p-2.5 text-[11px] leading-relaxed text-lagoon-900">
              <span className="font-bold">What this screen is for: </span>
              {purpose}
            </p>
          )}

          <Button onClick={go} className="mt-3 w-full">
            {step.action} <ArrowRight className="h-4 w-4" />
          </Button>

          <div className="mt-3 flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
              Back
            </Button>
            <div className="flex flex-1 justify-center gap-1">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  aria-label={`Step ${i + 1}`}
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    i === index ? 'w-5 bg-lagoon-600' : done.includes(i) ? 'w-1.5 bg-emerald-400' : 'w-1.5 bg-slate-200',
                  )}
                />
              ))}
            </div>
            {isLast ? (
              <Button size="sm" onClick={() => onOpenChange(false)}>
                <Check className="h-3.5 w-3.5" /> Done
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setIndex((i) => Math.min(STEPS.length - 1, i + 1))}>
                Next
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Botón flotante que abre el recorrido. */
export function TourButton({ onClick, hidden }: { onClick: () => void; hidden?: boolean }) {
  if (hidden) return null;
  return createPortal(
    <button
      onClick={onClick}
      className="focus-ring fixed bottom-20 right-4 z-[60] flex items-center gap-2 rounded-full bg-deep-900 py-3 pl-3.5 pr-4 text-sm font-bold text-white shadow-pop transition hover:bg-deep-800 sm:bottom-5 sm:right-5"
    >
      <HelpCircle className="h-4 w-4 text-lagoon-300" />
      How it works
    </button>,
    document.body,
  );
}
