# 생활과학대학 시설 신고 (모바일 웹앱)

경희대 생활과학대학 PortalCam 3D 스캔 위에서 하자·분실물을 핀으로 가리켜 신고하는 웹앱.

## 실행
```bash
npm install     # 처음 한 번
npm run dev     # 서버 시작 → 터미널에 나온 Network 주소(http://192.168.x.x:5173)를 폰에서 열기
```
폰과 컴퓨터가 **같은 Wi-Fi**여야 합니다. 신고 데이터는 `data/` 폴더에 저장됩니다(전원 공개, 익명).

## 관리자 (처리 상태 변경)
접수현황 → 글 열기 → 아래 `관리자` → PIN 입력(기본 `0000`). PIN 변경: `ADMIN_PIN=원하는값 npm run dev`

## 구성
- `src/screens/` 홈(입면도) · plan(평면도) · tour(3D) · report(신고폼) · board(접수현황)
- `src/data/config.js` 층, 스캔 파일, 호실(513호) 위치 설정
- `scripts/make_waypoints.py` 스캔 경로(poses.json)에서 이동 지점 만들기
- `server/api.js` 게시판 API
- `public/scans/` 스캔 데이터(.sog), `public/data/waypoints.json` 이동 지점
