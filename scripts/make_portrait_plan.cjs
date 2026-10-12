// 1층 세로 피난안내도(plans-source/f1-evac-portrait.png) -> public/plans/f1-evac-portrait.{webp,json}
// 사용법: npm i --no-save sharp && node scripts/make_portrait_plan.cjs
// 1) 기존 가로 도면(public/plans/f1-evac.webp)의 벽선 모서리와 대응시켜 새 이미지 -> 기존 이미지 변환(90° 회전+균일 축척+이동)을 구하고
//    f1-evac.json 의 imagePx_to_world 와 합성해 새 이미지 -> 스캔 좌표(X,Y m) 변환을 만든다.
// 2) 아이콘(현위치/소화기/비상벨/심장충격기/화살표/비상구)을 지우고 도면 부분만 잘라 webp 로 저장한다.
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'plans-source/f1-evac-portrait.png');
const OLD_IMG = path.join(ROOT, 'public/plans/f1-evac.webp');
const OLD_JSON = path.join(ROOT, 'public/plans/f1-evac.json');
const OUT_IMG = path.join(ROOT, 'public/plans/f1-evac-portrait.webp');
const OUT_JSON = path.join(ROOT, 'public/plans/f1-evac-portrait.json');

// 도면 부분 (원본 px). 왼쪽은 현관 바깥 이동 지점(000, 001)이 들어오도록 여유를 둔다. 하단 안내띠(y>1352)는 제외.
const CROP = { x: 482, y: 226, w: 1086 - 482, h: 1354 - 226 };
const LONG_SIDE_MAX = 2048;
const COARSE = { s: 0.883, tx: 1076.5, ty: 220 }; // 벽선 chamfer 정합으로 얻은 초기값 (새 = s*Rot90*옛 + t, Rot90: (x,y)->(-y,x))
// 도면 안에서 따로 지울 작은 회색 네모 (심장충격기 옆), 원본 px
const EXTRA_ERASE = [[734, 667, 754, 689]];

async function load(p) {
  const { data, info } = await sharp(p).flatten({ background: '#fff' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { d: data, w: info.width, h: info.height };
}
const isWall = (im, x, y) => {
  if (x < 0 || y < 0 || x >= im.w || y >= im.h) return false;
  const i = (y * im.w + x) * 3, r = im.d[i], g = im.d[i + 1], b = im.d[i + 2];
  return r < 120 && Math.abs(r - g) < 14 && Math.abs(g - b) < 14;
};
const median = a => { a = a.slice().sort((p, q) => p - q); return a[a.length >> 1]; };
// 선 중심 (소수점): 세로선은 각 행에서 x0 에 가장 가까운 어두운 run 의 중심, 중앙값
function vline(im, x0, ya, yb) {
  const cs = [];
  for (let y = Math.round(ya); y <= yb; y++) {
    let best = null;
    for (let x = Math.round(x0) - 9; x <= Math.round(x0) + 9; x++) if (isWall(im, x, y)) {
      let e = x; while (isWall(im, e + 1, y)) e++;
      const c = (x + e) / 2; if (e - x < 14 && (best == null || Math.abs(c - x0) < Math.abs(best - x0))) best = c; x = e;
    }
    if (best != null) cs.push(best);
  }
  return cs.length > (yb - ya) * 0.5 ? median(cs) + 0.5 : null;
}
function hline(im, y0, xa, xb) {
  const cs = [];
  for (let x = Math.round(xa); x <= xb; x++) {
    let best = null;
    for (let y = Math.round(y0) - 9; y <= Math.round(y0) + 9; y++) if (isWall(im, x, y)) {
      let e = y; while (isWall(im, x, e + 1)) e++;
      const c = (y + e) / 2; if (e - y < 14 && (best == null || Math.abs(c - y0) < Math.abs(best - y0))) best = c; y = e;
    }
    if (best != null) cs.push(best);
  }
  return cs.length > (xb - xa) * 0.5 ? median(cs) + 0.5 : null;
}

// 옛 도면의 벽선 (대략 위치, 측정 구간). 모서리 = 세로선 x 와 가로선 y 의 교점
const V = { V1: [17, [310, 350]], V2: [570, [100, 270]], V3: [717, [100, 270]], V5: [990, [100, 150]], V6: [1220, [130, 260]], V7: [370, [390, 550]], V8: [715, [490, 550]], V9: [1278, [390, 550]] };
const H = { H1: [85, [600, 700]], H2a: [292, [300, 500]], H2b: [292, [1030, 1190]], H3a: [370, [150, 300]], H3b: [370, [1120, 1200]], H4: [568, [60, 300]] };
const CORNERS = [['V1', 'H3a'], ['V1', 'H4'], ['V7', 'H3a'], ['V7', 'H4'], ['V8', 'H4'], ['V9', 'H4'], ['V9', 'H3b'], ['V2', 'H1'], ['V2', 'H2a'], ['V3', 'H1'], ['V3', 'H2b'], ['V5', 'H1'], ['V6', 'H2b'], ['V6', 'H1']];

function register(O, N) {
  const { s, tx, ty } = COARSE, toN = (x, y) => [-s * y + tx, s * x + ty];
  const oV = {}, oH = {}, nV = {}, nH = {};
  for (const k in V) oV[k] = vline(O, V[k][0], ...V[k][1]);
  for (const k in H) oH[k] = hline(O, H[k][0], ...H[k][1]);
  for (const k in V) { const [x0, [ya, yb]] = V[k], [xa] = toN(x0, ya), [xb] = toN(x0, yb); nH[k] = hline(N, toN(oV[k] ?? x0, 0)[1], Math.min(xa, xb), Math.max(xa, xb)); }
  for (const k in H) { const [y0, [xa, xb]] = H[k], [, y1] = toN(xa, y0), [, y2] = toN(xb, y0); nV[k] = vline(N, toN(0, oH[k] ?? y0)[0], Math.min(y1, y2), Math.max(y1, y2)); }
  const pairs = [];
  for (const [v, h] of CORNERS) {
    if ([oV[v], oH[h], nH[v], nV[h]].some(x => x == null)) throw new Error(`모서리 ${v}/${h} 를 찾지 못했습니다`);
    pairs.push({ name: `${v}/${h}`, old: [oV[v], oH[h]], new: [nV[h], nH[v]] });
  }
  const n = pairs.length, mo = [0, 0], mn = [0, 0];
  for (const p of pairs) { mo[0] += p.old[0] / n; mo[1] += p.old[1] / n; mn[0] += p.new[0] / n; mn[1] += p.new[1] / n; }
  // 회전 자유 유사변환 (복소수 a): 90° 에서 벗어난 각도 확인용
  let nr = 0, ni = 0, den = 0, sn = 0;
  for (const p of pairs) {
    const o = [p.old[0] - mo[0], p.old[1] - mo[1]], q = [p.new[0] - mn[0], p.new[1] - mn[1]];
    nr += q[0] * o[0] + q[1] * o[1]; ni += q[1] * o[0] - q[0] * o[1]; den += o[0] * o[0] + o[1] * o[1];
    sn += q[0] * -o[1] + q[1] * o[0];
  }
  const freeAngle = Math.atan2(ni, nr) * 180 / Math.PI, freeScale = Math.hypot(nr, ni) / den;
  // 90° 고정: 새 = k*(-oy, ox) + t
  const k = sn / den, t = [mn[0] + k * mo[1], mn[1] - k * mo[0]];
  const errs = pairs.map(p => ({ name: p.name, px: Math.hypot(-k * p.old[1] + t[0] - p.new[0], k * p.old[0] + t[1] - p.new[1]) }));
  return { pairs, k, t, freeAngle, freeScale, errs };
}

// 아이콘 마스크: 도면은 흑백이라 채도가 있는 픽셀 = 아이콘. 확장 + 구멍 메움, 벽선(어두운 무채색)은 보호. 마스크 안은 가장 가까운 비마스크 픽셀 색으로 채움
function eraseIcons(N, box) {
  const { w, h, d } = N, M = new Uint8Array(w * h);
  const sat = i => { const r = d[i], g = d[i + 1], b = d[i + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mx ? (mx - mn) / mx : 0; };
  const inBox = (x, y) => x >= box.x && x < box.x + box.w && y >= box.y && y < box.y + box.h;
  for (let y = box.y; y < box.y + box.h; y++) for (let x = box.x; x < box.x + box.w; x++) if (sat((y * w + x) * 3) > 0.18) M[y * w + x] = 1;
  const dilate = (src, r) => {
    const out = new Uint8Array(src);
    for (let y = box.y; y < box.y + box.h; y++) for (let x = box.x; x < box.x + box.w; x++) if (src[y * w + x])
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r) { const X = x + dx, Y = y + dy; if (inBox(X, Y)) out[Y * w + X] = 1; }
    return out;
  };
  let D = dilate(M, 4);
  for (const [x0, y0, x1, y1] of EXTRA_ERASE) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) D[y * w + x] = 1;
  // 구멍 메움: 도면 영역 가장자리에서 flood fill 해 닿지 않는 비마스크 = 구멍
  const seen = new Uint8Array(w * h), st = [];
  const push = (x, y) => { if (inBox(x, y) && !D[y * w + x] && !seen[y * w + x]) { seen[y * w + x] = 1; st.push(x, y); } };
  for (let x = box.x; x < box.x + box.w; x++) { push(x, box.y); push(x, box.y + box.h - 1); }
  for (let y = box.y; y < box.y + box.h; y++) { push(box.x, y); push(box.x + box.w - 1, y); }
  while (st.length) { const y = st.pop(), x = st.pop(); push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1); }
  let holes = 0;
  for (let y = box.y; y < box.y + box.h; y++) for (let x = box.x; x < box.x + box.w; x++) if (!D[y * w + x] && !seen[y * w + x]) { D[y * w + x] = 1; holes++; }
  // 벽선 보호: 마스크 확장 때문에 덮인 어두운 무채색(원래 채도 낮은 벽) 은 그대로 둔다
  let erased = 0;
  for (let i = 0; i < w * h; i++) if (D[i] && !M[i]) { const p = i * 3; if (d[p] < 110 && sat(p) <= 0.18 && !EXTRA_ERASE.some(([a, b, c, e]) => i % w >= a && i % w <= c && ((i / w) | 0) >= b && ((i / w) | 0) <= e)) D[i] = 0; }
  // 가장 가까운 비마스크 픽셀 색으로 채움 (BFS)
  const out = Buffer.from(d), q = [];
  const isBg = p => (Math.abs(d[p] - 203) <= 6 && Math.abs(d[p] - d[p + 1]) < 5 && Math.abs(d[p] - d[p + 2]) < 5) || (d[p] >= 248 && d[p + 1] >= 248 && d[p + 2] >= 248);
  for (let i = 0; i < w * h; i++) if (D[i]) erased++;
  for (let y = box.y; y < box.y + box.h; y++) for (let x = box.x; x < box.x + box.w; x++) {
    const i = y * w + x; if (D[i] || !isBg(i * 3)) continue; // 채움 색은 복도 회색/방 흰색에서만 가져온다 (벽선·문 호 색이 번지지 않게)
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (inBox(X, Y) && D[Y * w + X]) { q.push(i); break; } }
  }
  const owner = new Int32Array(w * h).fill(-1); for (const i of q) owner[i] = i;
  for (let head = 0; head < q.length; head++) {
    const i = q[head], x = i % w, y = (i / w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const X = x + dx, Y = y + dy, j = Y * w + X; if (!inBox(X, Y) || !D[j] || owner[j] !== -1) continue;
      owner[j] = owner[i]; q.push(j);
    }
  }
  for (let i = 0; i < w * h; i++) if (D[i] && owner[i] >= 0) { const p = owner[i] * 3; out[i * 3] = d[p]; out[i * 3 + 1] = d[p + 1]; out[i * 3 + 2] = d[p + 2]; }
  return { d: out, stats: { maskedPx: erased, holesFilled: holes } };
}

const compose = (A, B) => [ // A∘B : 먼저 B, 다음 A.  [a,b,tx,c,d,ty]
  A[0] * B[0] + A[1] * B[3], A[0] * B[1] + A[1] * B[4], A[0] * B[2] + A[1] * B[5] + A[2],
  A[3] * B[0] + A[4] * B[3], A[3] * B[1] + A[4] * B[4], A[3] * B[2] + A[4] * B[5] + A[5]];
const invert = M => { const det = M[0] * M[4] - M[1] * M[3]; return [M[4] / det, -M[1] / det, (M[1] * M[5] - M[4] * M[2]) / det, -M[3] / det, M[0] / det, (M[3] * M[2] - M[0] * M[5]) / det]; };

(async () => {
  const oldMeta = JSON.parse(fs.readFileSync(OLD_JSON, 'utf8'));
  const [O, N] = await Promise.all([load(OLD_IMG), load(SRC)]);
  const reg = register(O, N);
  const mPerOldPx = Math.hypot(oldMeta.transforms.imagePx_to_world[0], oldMeta.transforms.imagePx_to_world[3]);
  const mPerNewPx = mPerOldPx / reg.k;
  console.log(`대응점 ${reg.pairs.length}개, 회전 자유 추정 ${reg.freeAngle.toFixed(3)}° (90°와 ${(reg.freeAngle - 90).toFixed(3)}° 차이), 축척 ${reg.freeScale.toFixed(5)}`);
  const rms = Math.sqrt(reg.errs.reduce((a, e) => a + e.px * e.px, 0) / reg.errs.length), max = Math.max(...reg.errs.map(e => e.px));
  console.log(`90° 고정 오차: RMS ${rms.toFixed(2)}px (${(rms * mPerNewPx).toFixed(3)}m), 최대 ${max.toFixed(2)}px (${(max * mPerNewPx).toFixed(3)}m), 새 이미지 ${mPerNewPx.toFixed(5)} m/px`);

  // 새 원본 px -> 옛 이미지 px: 옛 = (ny - ty)/k, -(nx - tx)/k
  const newToOld = [0, 1 / reg.k, -reg.t[1] / reg.k, -1 / reg.k, 0, reg.t[0] / reg.k];
  const cropToSrc = [1, 0, CROP.x, 0, 1, CROP.y];
  const imagePx_to_world = compose(oldMeta.transforms.imagePx_to_world, compose(newToOld, cropToSrc));

  const er = eraseIcons(N, CROP);
  let img = sharp(er.d, { raw: { width: N.w, height: N.h, channels: 3 } }).extract({ left: CROP.x, top: CROP.y, width: CROP.w, height: CROP.h });
  const r = Math.min(1, LONG_SIDE_MAX / Math.max(CROP.w, CROP.h)); // 축소하면 변환의 축척도 같이 바꿔야 한다
  const outW = Math.round(CROP.w * r), outH = Math.round(CROP.h * r);
  if (r < 1) img = img.resize(outW, outH);
  const info = await img.webp({ lossless: true }).toFile(OUT_IMG);
  const sc = [outW / CROP.w, 0, 0, 0, outH / CROP.h, 0], outPxToCrop = [1 / sc[0], 0, 0, 0, 1 / sc[4], 0];
  const toWorld = compose(imagePx_to_world, outPxToCrop);

  fs.writeFileSync(OUT_JSON, JSON.stringify({
    id: 'f1-portrait', name: '1층 (세로)', generated: new Date().toISOString(),
    convention: oldMeta.convention,
    source: { file: 'plans-source/f1-evac-portrait.png', size: [N.w, N.h], crop: [CROP.x, CROP.y, CROP.w, CROP.h], eraseExtra: EXTRA_ERASE, eraseStats: er.stats },
    image: { file: 'f1-evac-portrait.webp', size: [info.width, info.height], bytes: info.size, alpha: false },
    transforms: { imagePx_to_world: toWorld, world_to_imagePx: invert(toWorld), imagePx_to_oldImagePx: compose(newToOld, compose(cropToSrc, outPxToCrop)), mPerPx: mPerNewPx / r },
    alignment: {
      method: '벽선 모서리 대응 + 90° 회전 고정 유사변환 → 기존 f1-evac.json 의 imagePx_to_world 와 합성', pairs: reg.pairs.length,
      freeRotationDeg: reg.freeAngle, deviationFrom90Deg: reg.freeAngle - 90, scaleNewPxPerOldPx: reg.k,
      rmsPx: rms, maxPx: max, rmsM: rms * mPerNewPx, maxM: max * mPerNewPx, points: reg.pairs.map((p, i) => ({ ...p, errPx: reg.errs[i].px })),
      baseAlignment: { rmsM: oldMeta.alignment.rmsM, maxErrM: oldMeta.alignment.maxErrM, note: '기존 가로 도면 ↔ 스캔 정합 오차 (이 값은 그대로 이어짐)' },
    },
  }, null, 1));
  console.log('저장:', OUT_IMG, `${info.width}x${info.height}`, info.size, 'bytes;', 'masked', er.stats);
})();
