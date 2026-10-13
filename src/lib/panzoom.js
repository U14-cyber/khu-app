// SVG viewBox 를 바꿔서 확대/이동(핀치·드래그·휠)을 하고, 움직이지 않은 탭은 onTap 으로 넘긴다.
// full = 전체 범위 {x,y,w,h}. 이 범위 밖으로는 나가지 않는다.
export function attachPanZoom(svg, full, { onTap, maxZoom = 8, tapSlop = 8 } = {}) {
  const vb = { ...full };
  const apply = () => svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  const clamp = () => {
    vb.x = vb.w >= full.w ? full.x : Math.min(Math.max(vb.x, full.x), full.x + full.w - vb.w);
    vb.y = vb.h >= full.h ? full.y : Math.min(Math.max(vb.y, full.y), full.y + full.h - vb.h);
  };
  const toUser = (cx, cy) => { const p = new DOMPoint(cx, cy).matrixTransform(svg.getScreenCTM().inverse()); return [p.x, p.y]; };
  const zoomAt = (cx, cy, s) => {
    const nw = Math.min(full.w, Math.max(full.w / maxZoom, vb.w / s)), k = nw / vb.w;
    const [px, py] = toUser(cx, cy);
    vb.x = px - (px - vb.x) * k; vb.y = py - (py - vb.y) * k;
    vb.w = nw; vb.h = nw * full.h / full.w;
    clamp(); apply();
  };
  const panBy = (dxPx, dyPx) => { const k = svg.getScreenCTM().a; vb.x -= dxPx / k; vb.y -= dyPx / k; clamp(); apply(); };

  const ptrs = new Map(); let moved = 0, multi = false, last = null;
  const mid = () => { const [a, b] = [...ptrs.values()]; return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y) || 1 }; };
  svg.addEventListener('pointerdown', e => {
    svg.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 1) { moved = 0; multi = false; } else multi = true;
    if (ptrs.size === 2) last = mid();
  });
  svg.addEventListener('pointermove', e => {
    const p = ptrs.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (ptrs.size === 1) { moved += Math.hypot(dx, dy); if (moved > tapSlop) panBy(dx, dy); }
    else if (ptrs.size === 2) { const m = mid(); zoomAt(m.x, m.y, m.d / last.d); panBy(m.x - last.x, m.y - last.y); last = m; }
  });
  const end = e => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.delete(e.pointerId);
    if (e.type === 'pointerup' && ptrs.size === 0 && !multi && moved <= tapSlop) onTap?.(e.clientX, e.clientY);
    if (ptrs.size === 1) last = null;
  };
  svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
  svg.addEventListener('wheel', e => { e.preventDefault(); zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
  apply();
}
