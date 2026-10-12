import { h } from '../lib/dom.js';
import { FLOORS, SCANNED } from '../data/config.js';

// 건물 입면(단면) 일러스트. 층을 누르면 평면도로 이동.
export function home() {
  const X = 48, W = 264, FH = 62, TOP = 62, GROUND = TOP + FH * 5;
  const floors = FLOORS.map((f, i) => {
    const y = TOP + FH * i, b1 = f.id === 'B1', scanned = !!SCANNED[f.id];
    const wins = [0, 1, 2, 3, 4].map(k => h('rect', { class: 'win', x: X + 74 + k * 36, y: y + 16, width: 24, height: 22, rx: 2 }));
    const door = f.id === '1F' ? h('rect', { x: X + W / 2 + 22, y: y + 16, width: 22, height: FH - 16, fill: '#8a1f3d', stroke: '#2b2f3a', 'stroke-width': 2 }) : null;
    return h('g', { class: `floor ${scanned ? 'scanned' : ''} ${b1 ? 'b1' : ''}`, role: 'button', tabindex: 0, 'aria-label': `${f.name} 평면도 보기`,
      onClick: () => (location.hash = `#/floor/${f.id}`), onKeydown: e => e.key === 'Enter' && (location.hash = `#/floor/${f.id}`) },
      h('rect', { class: 'slab', x: X, y, width: W, height: FH }),
      ...wins, door,
      h('text', { class: 'lbl', x: X + 14, y: y + 26 }, f.id === 'B1' ? 'B1' : f.id),
      h('text', { class: `tag ${scanned ? '' : 'off'}`, x: X + 14, y: y + 44 }, scanned ? '● 3D 스캔' : '준비 중'),
    );
  });
  const svg = h('svg', { class: 'elev', viewBox: `0 0 360 ${GROUND + FH + 40}`, role: 'group', 'aria-label': '생활과학대학 입면도' },
    h('rect', { x: 0, y: GROUND, width: 360, height: FH + 40, fill: '#d9d1bd' }),         // 땅속
    h('rect', { x: 0, y: GROUND - 6, width: 360, height: 6, fill: '#8fb08a' }),          // 지면
    h('rect', { x: X - 8, y: TOP - 14, width: W + 16, height: 14, fill: '#2b2f3a', rx: 3 }), // 옥상 난간
    ...floors,
    h('line', { x1: 0, x2: 360, y1: GROUND, y2: GROUND, stroke: '#2b2f3a', 'stroke-width': 2.5 }),
    h('text', { x: 180, y: GROUND + FH + 30, 'text-anchor': 'middle', fill: '#8a8d97', 'font-size': 11 }, '단면 일러스트'),
  );
  return h('div', {},
    h('div', { class: 'home-head' }, h('div', { class: 'kicker' }, '경희대학교'), h('h1', {}, '생활과학대학 시설 신고')),
    h('p', { class: 'hint', style: 'margin-top:6px' }, '신고할 층을 눌러 주세요. 하자·분실물을 3D 스캔 위에서 바로 가리킬 수 있어요.'),
    svg,
    h('div', { class: 'legend' }, h('span', {}, h('i', { style: 'background:#f3e3d4' }), '3D 스캔 있음'), h('span', {}, h('i', { style: 'background:#ece7da' }), '준비 중')),
  );
}
