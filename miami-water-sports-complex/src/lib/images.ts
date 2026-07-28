/**
 * Imágenes del prototipo.
 *
 * No dependemos de ningún CDN: las fotos "de catálogo" se generan como SVG
 * embebido en data-URL a partir de un hash del código del activo, de modo que
 * cada tabla/casco/bote tiene una imagen estable y distinta. Cuando el usuario
 * sube una foto real (`readImageFile`) simplemente reemplazamos el data-URL,
 * así que el mismo campo `photoUrl` sirve para ambos casos.
 */

import { AssetCategory } from './types';

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const PALETTES: [string, string][] = [
  ['#06b6d4', '#0e7490'],
  ['#22d3ee', '#155e75'],
  ['#f97316', '#c2410c'],
  ['#6366f1', '#3730a3'],
  ['#10b981', '#065f46'],
  ['#f43f5e', '#9f1239'],
  ['#8b5cf6', '#5b21b6'],
  ['#eab308', '#a16207'],
];

/** Siluetas simples por categoría, dibujadas con paths. */
const GLYPHS: Record<AssetCategory, string> = {
  wakeboard:
    'M100 26c14 0 26 10 30 26l10 44c4 18-14 34-40 34s-44-16-40-34l10-44c4-16 16-26 30-26z',
  wakeskate: 'M60 50h80c8 0 12 6 12 14v42c0 8-4 14-12 14H60c-8 0-12-6-12-14V64c0-8 4-14 12-14z',
  kneeboard: 'M100 34c30 0 48 18 48 44s-18 44-48 44-48-18-48-44 18-44 48-44z',
  helmet:
    'M100 44c30 0 50 20 50 48v22H50V92c0-28 20-48 50-48zm-52 74h104v14H48z',
  vest: 'M70 46h60l14 20-10 10v58H66V76l-10-10zm18 0v88M112 46v88',
  boat: 'M40 108h120l-16 30H56zM100 40v60M100 44l40 52H60z',
  obstacle: 'M40 130l50-56h34l36 56zM90 74h34',
  'cable-system': 'M30 60h140M46 60v70M154 60v70M100 60v34M100 94l-18 36h36z',
  inflatable: 'M52 80h96v40a20 20 0 01-20 20H72a20 20 0 01-20-20zM72 80V60h56v20',
  safety: 'M62 74h76v66H62zM88 74V58h24v16M100 92v34M83 109h34',
  other: 'M60 60h80v80H60z',
};

export function assetPhoto(code: string, category: AssetCategory) {
  const h = hash(code);
  const [a, b] = PALETTES[h % PALETTES.length];
  const angle = h % 90;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 180" width="200" height="180">
<defs><linearGradient id="g" gradientTransform="rotate(${angle})">
<stop offset="0%" stop-color="${a}"/><stop offset="100%" stop-color="${b}"/></linearGradient></defs>
<rect width="200" height="180" fill="url(#g)"/>
<g opacity="0.14" fill="#fff"><circle cx="30" cy="150" r="60"/><circle cx="180" cy="20" r="45"/></g>
<path d="${GLYPHS[category]}" fill="none" stroke="#fff" stroke-width="7" stroke-linejoin="round" stroke-linecap="round" opacity="0.92"/>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const AVATAR_COLORS = [
  '#0891b2', '#7c3aed', '#e11d48', '#ea580c', '#059669', '#2563eb', '#db2777', '#65a30d',
];

export function avatarColor(name: string) {
  return AVATAR_COLORS[hash(name) % AVATAR_COLORS.length];
}

/** Lee un archivo del input file y lo devuelve como data URL listo para `photoUrl`. */
export function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
