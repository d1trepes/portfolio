import { getCollection } from 'astro:content';

// Разделы фильтра на странице «Все проекты» (порядок = порядок кнопок).
export const KINDS = {
  landing: 'Лендинги',
  multipage: 'Многостраничники',
  b2b: 'B2B',
  pet: 'Пет-проекты',
} as const;
export const KIND_ONE = { landing: 'Лендинг', multipage: 'Многостраничный сайт', b2b: 'B2B-сайт', pet: 'Пет-проект' } as const;

// Все проекты по порядку (поле order).
export const allProjects = async () => (await getCollection('projects')).sort((a, b) => a.data.order - b.data.order);

// 1 работа, 2 работы, 5 работ
export const plural = (n: number, [one, few, many]: [string, string, string]) => {
  const a = n % 100, b = n % 10;
  if (a > 10 && a < 20) return many;
  if (b === 1) return one;
  if (b > 1 && b < 5) return few;
  return many;
};

// тёмный ли цвет фона (тогда текст светлый)
export const isDark = (h: string) => {
  const c = h.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16));
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.5;
};
export const pad = (i: number) => String(i).padStart(2, '0');
