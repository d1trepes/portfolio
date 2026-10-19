// Разметка панели — одна и та же для кольца и для карточки в «Избранных проектах».
export type Panel =
  | { type: 'p'; id: string; title: string; tag: string; c: [string, string, string]; map?: boolean }
  | { type: 't'; title: string; text: string; icon: string };

export function panelHTML(p: Panel): string {
  if (p.type === 'p') {
    return `<div class="pc" style="--c1:${p.c[0]};--c2:${p.c[1]};--c3:${p.c[2]}"><div class="bar"><i></i><i></i><i></i><i></i></div><div class="h"></div><div class="h2"></div><div class="p"></div><div class="blk"></div>${p.map ? '<div class="pin"></div>' : ''}<div class="chip">${p.tag}</div></div>`;
  }
  return `<div class="tc"><div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p.icon}</svg></div><b>${p.title}</b><span>${p.text}</span></div>`;
}
