// 층/스캔 설정. 스캔이 있는 층만 scene 을 지정한다.
export const FLOORS = [
  { id: '5F', name: '5층' },
  { id: '4F', name: '4층' },
  { id: '3F', name: '3층' },
  { id: '2F', name: '2층' },
  { id: '1F', name: '1층' },
  { id: 'B1', name: '지하 1층' },
];
export const SCANNED = { '1F': 'building', '5F': 'building' };

// 스캔 파일 (public/scans 아래)
export const SCENES = {
  building: { files: ['/scans/building/l2_a.sog', '/scans/building/l2_b.sog', '/scans/building/l2_c.sog'], label: '생활과학대학' },
  classroom513: { files: ['/scans/classroom/lod0_a.sog', '/scans/classroom/lod0_b.sog'], label: '513호' },
};

// 평면도에 올리는 호실. building 5F 복도 지점 번호(anchor) 옆에 붙인다. 위치는 여기서 수정.
export const ROOMS = {
  '5F': [{ id: '513', name: '513호', scene: 'classroom513', anchor: 0.5, side: 1, w: 9, d: 7 }],
};
// 스캔 지점에 붙이는 이름표 (층 안에서 첫/마지막 지점 등)
export const POINT_LABELS = {
  '1F': { first: '현관', last: '계단' },
  '5F': { first: '계단', last: '복도 끝' },
};
export const STATUSES = ['미확인', '확인', '진행 중', '완료'];
