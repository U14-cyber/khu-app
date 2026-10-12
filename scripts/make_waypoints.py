"""포털캠 poses.json -> 로드뷰식 이동 지점(waypoints.json) 생성.
사용법: python3 scripts/make_waypoints.py
- 걸어간 경로에서 STEP(m)마다 한 지점씩 뽑고, 같은 층에서 가까운 지점끼리 연결한다.
"""
import json, math

STEP = 2.0          # 지점 간격 (m)
LINK_R = 3.2        # 이 거리 안의 같은 층 지점은 서로 이동 가능
SCENES = {
    # scene: (poses 파일, [(floor, idx 시작, idx 끝)])
    'building': ('public/scans/building/poses.json', [('1F', 0, 2042), ('4F', 2992, 4672)]),
    'classroom513': ('public/scans/classroom/poses.json', [('5F', 0, 1108)]),
}
# 층 라벨을 바로잡은 구간: (scene, 새 층) -> 옛 층. 옛 id 는 legacyId 로 남겨 저장된 신고가 계속 이어지게 한다.
LEGACY_FLOOR = {('building', '4F'): '5F'}

def quat_forward(w, x, y, z):  # 카메라 -Z 방향을 월드로
    v = (0, 0, -1)
    tx = 2 * (y * v[2] - z * v[1]); ty = 2 * (z * v[0] - x * v[2]); tz = 2 * (x * v[1] - y * v[0])
    return (v[0] + w * tx + (y * tz - z * ty), v[1] + w * ty + (z * tx - x * tz), v[2] + w * tz + (x * ty - y * tx))

out = {}
for scene, (path, ranges) in SCENES.items():
    poses = json.load(open(path))['poses']
    wps = []
    for floor, a, b in ranges:
        last = None
        for i in range(a, b + 1):
            p = poses[i]; t = p['T']
            if last is None or math.dist(t, last) >= STEP:
                f = quat_forward(*p['R'])
                heading = math.degrees(math.atan2(-f[0], f[1]))
                n = f'{len(wps):03d}'
                wp = {'id': f'{scene}-{floor}-{n}', 'scene': scene, 'floor': floor,
                      'pos': [round(t[0], 3), round(t[1], 3), round(t[2], 3)], 'heading': round(heading, 1)}
                if (scene, floor) in LEGACY_FLOOR:
                    wp['legacyId'] = f'{scene}-{LEGACY_FLOOR[(scene, floor)]}-{n}'
                wps.append(wp)
                last = t
    for w in wps:
        near = sorted((math.dist(w['pos'], o['pos']), o['id']) for o in wps
                      if o is not w and o['floor'] == w['floor'] and abs(o['pos'][2] - w['pos'][2]) < 1.0)
        w['links'] = [oid for d, oid in near if d <= LINK_R][:5]
    out[scene] = wps
    print(scene, len(wps), 'waypoints')
json.dump(out, open('public/data/waypoints.json', 'w'), separators=(',', ':'))
