# SunoFlow 진행 상황 추적

## 현재 상태
- **현재 Phase**: Phase 1 - MVP (완료!)
- **현재 Step**: Phase 2 준비
- **마지막 업데이트**: 2026-03-29
- **다음 할 일**: Phase 2 - YouTube 업로더, 썸네일 생성기

## 세션 재개 명령어
```
@Build_Plan.md @PROGRESS.md 를 읽고 이어서 코딩을 진행해줘.
```

---

## 완료된 작업

### Step 1: 프로젝트 부트스트랩 ✅
- Next.js 16 + TypeScript + Tailwind CSS 4 셋업
- Prisma 7 + SQLite (better-sqlite3 adapter) DB 구성
- 기본 레이아웃 + 사이드바 네비게이션 (Dashboard, Prompts, Tracks, Videos, Distribution, Calendar, Settings)
- Docker 대신 SQLite 사용 (Docker 미설치 환경 대응)

### Step 2: Prompt Library & Generator ✅
- 7개 장르별 프롬프트 템플릿 시드 완료 (Sleep/Healing, Lo-Fi, Cinematic, Meditation, Nature)
- 인터랙티브 프롬프트 빌더 UI (장르, BPM 슬라이더, Musical Key, Mood, Instruments 선택)
- 생성된 프롬프트 클립보드 복사 기능
- 프롬프트 저장/라이브��리 기능
- API: GET/POST /api/prompts, GET/DELETE /api/prompts/[id]

### Step 3: Track Manager ✅
- 오디오 파일 업로드 (MP3, WAV, FLAC) + 로컬 저장
- 트랙 목록 + 재생 기능 (HTML5 Audio)
- 품질 체크리스트 UI (No Vocals, Clean Start, Clean End, Smooth Transitions)
- 체크리스트 실시간 저장 + Quality Approved 워크플로우
- API: GET/POST /api/tracks, GET/PATCH/DELETE /api/tracks/[id], GET /api/tracks/file/[filename]

### Step 5: SEO 메타데이터 생성기 ✅
- 제목 생성기: [감정/효과] + [구체적 용도] + [재생시간] + [분위기] 공식
- 설명란 생성기: AI 공개 문구 + 장르별 설명 + 자동 타임스탬프
- 태그 생성기: 장르별 롱테일 키워드 10-15개
- src/lib/seo.ts 모듈로 구현

---

## 진행 로그

### 2026-03-29 - 세션 1
- [x] Build_Plan.md 작성 완료
- [x] PROGRESS.md 생성 완료
- [x] Step 1: 프로젝트 부트스트랩
- [x] Step 2: Prompt Library & Generator
- [x] Step 3: Track Manager
- [x] Step 5: SEO 메타데이터 생성기
- [x] Step 4: Video Creator

### 2026-03-29 - 세션 2
- [x] FFmpeg 설치 (brew install ffmpeg v8.1)
- [x] fluent-ffmpeg 패키지 설치
- [x] 비디오 렌더링 엔진 (src/lib/video-renderer.ts)
  - FFmpeg showwaves/showfreqs 비주얼라이저
  - 오디오 concat → 배경색 + 비주얼라이저 오버레이 + 제목/AI 공개 워터마크
  - 인메모리 잡 상태 추적 + 진행률 콜백
- [x] Video API 5개 엔드포인트
  - GET/POST /api/videos
  - GET/PATCH/DELETE /api/videos/[id]
  - POST /api/videos/[id]/render (비동기 렌더링 트리거)
  - GET /api/videos/[id]/status (진행률 폴링)
  - GET /api/videos/[id]/download (파일 다운로드)
- [x] Video Creator UI (src/components/video/VideoCreator.tsx)
  - 트랙 체크박스 선택 + Select All/Clear
  - 드래그 앤 드롭 정렬 + 화살표 이동
  - 비주얼라이저 타입 선택 (Spectrum/Waveform/Circular)
  - 배경색 6종 선택
  - AI 공개 문구 편집
  - 실시간 미리보기
  - 렌더링 진행률 바 + 폴링
- [x] Video List UI (src/components/video/VideoList.tsx)
  - 상태별 색상 (Draft/Rendering/Rendered/Uploaded/Published)
  - 렌더링 진행률 바
  - 다운로드/삭제 버튼

---

## 기술 메모
- Prisma 7은 URL을 prisma.config.ts에서 관리, client는 adapter 방식 필수
- PrismaBetterSqlite3 생성자: `new PrismaBetterSqlite3({ url: "file:..." })`
- package.json에서 "type": "commonjs" 제거 필요 (Next.js ESM 호환)
- SQLite는 enum/String[] 미지원 → String + JSON 문자열로 대체
- FFmpeg 비주얼라이저: showfreqs(spectrum), showwaves(waveform/circular)
- BullMQ 대신 인메모리 잡 추적 사용 (MVP 단계, 단일 서버)
- FFmpeg drawtext 필터에서 특수문자(: ' \) 이스케이프 필수
