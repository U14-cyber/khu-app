import { h } from '../lib/dom.js';
import { FLOORS, SCANNED, ROOMS, POINT_LABELS } from '../data/config.js';
import { getWaypoints, goTour } from '../lib/state.js';

const backBtn = () => h('a', { class: 'iconbtn', href: '#/', 'aria-label': '뒤로' }, h('svg', { viewBox: '0 0 24 24' }, h('path', { d: 'M15 5l-7 7 7 7' })));

export async function plan(floorId) {
  const floor = FLOORS.find(f => f.id === floorId);
  const root = h('div', {}, h('div', { class: 'topbar' }, backBtn(), h('h1', {}, floor ? `${floor.name} 평면도` : '평면도')));
  if (!floor) return root.append(h('div', { class: 'empty' }, '없는 층입니다.')), root;
  if (!SCANNED[floorId]) {
    root.append(h('div', { class: 'empty' }, h('b', {}, '이 층은 아직 3D 스캔이 없어요'), '스캔이 완료되면 평면도와 신고 기능이 열립니다.'));
    return root;
  }
  const all = await getWaypoints();
  const wps = all[SCANNED[floorId]].filter(w => w.floor === floorId);
  const byId = Object.fromEntries(wps.map(w => [w.id, w]));
  const P = w => [w.pos[0], -w.pos[1]]; // y 반전 (위쪽이 북쪽)

  // 방 위치 계산 (복도 옆에 직사각형)
  const rooms = (ROOMS[floorId] || []).map(r => {
    const i = Math.min(wps.length - 2, Math.max(1, Math.round(wps.length * r.anchor)));
    const a = P(wps[i - 1]), b = P(wps[i + 1]), c = P(wps[i]);
    let dx = b[0] - a[0], dy = b[1] - a[1]; const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
    const nx = -dy * r.side, ny = dx * r.side, off = 1.8;
    const p0 = [c[0] + nx * off - dx * r.w / 2, c[1] + ny * off - dy * r.w / 2];
    const pts = [p0, [p0[0] + dx * r.w, p0[1] + dy * r.w], [p0[0] + dx * r.w + nx * r.d, p0[1] + dy * r.w + ny * r.d], [p0[0] + nx * r.d, p0[1] + ny * r.d]];
    return { ...r, pts, cx: (pts[0][0] + pts[2][0]) / 2, cy: (pts[0][1] + pts[2][1]) / 2 };
  });

  const xs = [...wps.map(w => P(w)[0]), ...rooms.flatMap(r => r.pts.map(p => p[0]))], ys = [...wps.map(w => P(w)[1]), ...rooms.flatMap(r => r.pts.map(p => p[1]))];
  const pad = 5, minX = Math.min(...xs) - pad, minY = Math.min(...ys) - pad, W = Math.max(...xs) + pad - minX, H = Math.max(...ys) + pad - minY;

  const segs = []; const seen = new Set();
  for (const w of wps) for (const l of w.links) { const k = [w.id, l].sort().join('|'); if (!seen.has(k) && byId[l]) { seen.add(k); segs.push([P(w), P(byId[l])]); } }
  const lines = (cls, sw) => h('g', { class: cls, 'stroke-width': sw }, segs.map(([a, b]) => h('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1] })));

  const go = (scene, wp) => goTour({ scene, floor: floorId, waypointId: wp.id, mode: 'pin' });
  const lab = POINT_LABELS[floorId] || {};
  const svg = h('svg', { class: 'plan', viewBox: `${minX} ${minY} ${W} ${H}`, role: 'group', 'aria-label': `${floor.name} 평면도` },
    lines('wall', 3.3), lines('floorfill', 2.7),
    ...rooms.map(r => h('g', { role: 'button', tabindex: 0, 'aria-label': `${r.name} 3D 보기`, onClick: () => go(r.scene, { id: r.scene + '-5F-000' }) },
      h('polygon', { class: 'room', points: r.pts.map(p => p.join(',')).join(' ') }),
      h('text', { class: 'tx', x: r.cx, y: r.cy }, r.name), h('text', { class: 'tx s', x: r.cx, y: r.cy + 1.6 }, '강의실'))),
    ...wps.map(w => { const [x, y] = P(w); return h('g', { role: 'button', 'aria-label': '이 위치 3D로 보기', onClick: () => go('building', w) },
      h('circle', { class: 'hit', cx: x, cy: y, r: 1.7 }), h('circle', { class: 'pt', cx: x, cy: y, r: .6 })); }),
    wps.length && lab.first ? h('text', { class: 'tx s', x: P(wps[0])[0], y: P(wps[0])[1] - 1.3 }, lab.first) : null,
    wps.length && lab.last ? h('text', { class: 'tx s', x: P(wps.at(-1))[0], y: P(wps.at(-1))[1] - 1.3 }, lab.last) : null,
  );
  root.append(h('p', { class: 'hint' }, '신고할 위치의 점을 누르면 3D 스캔으로 이동해요.'), h('div', { class: 'plan-wrap' }, svg));
  return root;
}
