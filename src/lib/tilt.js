// 스캔 바닥 기울기 보정용 수학 (PlayCanvas 에 의존하지 않는 순수 함수).
// 용어: 스캔 기준 = 스캔 좌표계(z 가 위, 바닥이 조금 기울어 있음), 보정 기준 = 바닥 법선이 +z 가 되도록 돌린 좌표계.
// 보정 회전 Rc = 스캔 좌표에서 바닥 법선 n 을 +z 로 보내는 회전 (쿼터니언 [x, y, z, w]).
// 투어의 yaw/pitch 는 보정 기준 수평에서 재고, 저장(신고 핀)과 외부에는 스캔 기준 값을 쓴다.
// fix 가 없으면(꺼짐) 모든 함수가 입력을 그대로 돌려준다 (부동소수 연산 없이).
const D = Math.PI / 180;

const norm = q => { const l = Math.hypot(q[0], q[1], q[2], q[3]); return [q[0] / l, q[1] / l, q[2] / l, q[3] / l]; };
const conj = q => [-q[0], -q[1], -q[2], q[3]];
const mul = (a, b) => [ // a * b (b 를 먼저 적용)
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
const rotate = (q, v) => { // q 로 벡터 v 를 회전
  const [x, y, z, w] = q, ix = w * v[0] + y * v[2] - z * v[1], iy = w * v[1] + z * v[0] - x * v[2], iz = w * v[2] + x * v[1] - y * v[0], iw = -x * v[0] - y * v[1] - z * v[2];
  return [ix * w + iw * -x + iy * -z - iz * -y, iy * w + iw * -y + iz * -x - ix * -z, iz * w + iw * -z + ix * -y - iy * -x];
};
// PlayCanvas 의 setLocalEulerAngles(x, y, z) 와 같은 쿼터니언 (Rz * Ry * Rx)
const euler = (ex, ey, ez) => {
  const hx = ex * D / 2, hy = ey * D / 2, hz = ez * D / 2, sx = Math.sin(hx), cx = Math.cos(hx), sy = Math.sin(hy), cy = Math.cos(hy), sz = Math.sin(hz), cz = Math.cos(hz);
  return [sx * cy * cz - cx * sy * sz, cx * sy * cz + sx * cy * sz, cx * cy * sz - sx * sy * cz, cx * cy * cz + sx * sy * sz];
};

// yaw/pitch(도) <-> 방향 벡터 (yaw 0 = +Y, 반시계가 +, pitch 위쪽이 +). 투어/핀 마커가 쓰던 식과 같다.
export const dirFromYawPitch = (yaw, pitch) => [-Math.sin(yaw * D) * Math.cos(pitch * D), Math.cos(yaw * D) * Math.cos(pitch * D), Math.sin(pitch * D)];
export const yawPitchFromDir = d => ({ yaw: Math.atan2(-d[0], d[1]) / D, pitch: Math.asin(Math.max(-1, Math.min(1, d[2]))) / D });

// fixCfg = { q: [x,y,z,w] } 또는 없음. 반환: 꺼짐이면 null.
export function levelFrom(fixCfg) {
  if (!fixCfg) return null;
  const q = norm(fixCfg.q), qi = conj(q);
  return { q, qi, n: rotate(qi, [0, 0, 1]) }; // n = 스캔 기준에서 본 보정된 위쪽(바닥 법선)
}
// 스캔 기준 yaw/pitch -> 보정 기준 / 그 반대
export const toLevel = (L, yaw, pitch) => (L ? yawPitchFromDir(rotate(L.q, dirFromYawPitch(yaw, pitch))) : { yaw, pitch });
export const toScan = (L, yaw, pitch) => (L ? yawPitchFromDir(rotate(L.qi, dirFromYawPitch(yaw, pitch))) : { yaw, pitch });
// 카메라(스캔 좌표계의 자식) 국소 회전: 보정 기준 yaw/pitch 의 시선을 스캔 좌표계로 되돌린 것. Rc * q_cam = Euler(90+pitch, 0, yaw)
export const viewQuat = (L, yaw, pitch) => mul(L.qi, euler(90 + pitch, 0, yaw));
export const eulerQuat = euler; // 테스트용
