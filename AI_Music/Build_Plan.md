# SunoFlow - AI 음악 자동화 앱 구현 계획

## Context

`suno_guide_book.md`에 기술된 AI 음악 수익화 워크플로우를 자동화하는 웹앱을 만든다. 핵심 파이프라인: Suno로 음악 생성 → 품질 검수 → 1시간+ 플레이리스트 영상 제작 (오디오 비주얼라이저 포함) → YouTube/Spotify/마켓플레이스 동시 배급. 유튜브 2025년 7월 정책 변경으로 순수 AI 음악만으로는 수익화 불가 → 비주얼라이저·AI 공개 문구 등 인간 창작 요소 필수.

---

## Tech Stack

- **Framework**: Next.js 14+ (App Router, TypeScript)
- **UI**: Tailwind CSS + shadcn/ui
- **DB**: PostgreSQL + Prisma ORM
- **Job Queue**: BullMQ + Redis (영상 렌더링, 업로드 등 비동기 작업)
- **File Storage**: S3-compatible (Cloudflare R2 or AWS S3)
- **Video/Audio**: FFmpeg (서버사이드, fluent-ffmpeg)
- **Auth**: NextAuth.js v5
- **APIs**: YouTube Data API v3, Spotify Web API (analytics)
- **Audio Player**: wavesurfer.js

---

## Phase 1: MVP (주 1-4) — 핵심 파이프라인

### Step 1: 프로젝트 부트스트랩 ✅
- [x] Next.js + TypeScript + Tailwind 셋업
- [x] Prisma 7 + SQLite (better-sqlite3 adapter) — Docker 대신 사용
- [x] Prisma 스키마 작성 및 마이그레이션
- [ ] NextAuth 기본 인증 (Phase 2로 연기)
- [ ] S3 연결 설정 (MVP는 로컬 파일 저장)
- [x] 기본 레이아웃 (사이드바 네비게이션)

### Step 2: Prompt Library & Generator ✅
- [x] 장르별 프롬프트 템플릿 시드 데이터 (7개)
- [x] 인터랙티브 프롬프트 빌더 UI
- [x] 클립보드 복사 기능
- [x] 프롬프트 저장/라이브러리

### Step 3: Track Manager ✅
- [x] WAV/MP3 업로드 → 로컬 저장
- [x] 오디오 플레이어 (HTML5 Audio)
- [x] 품질 체크리스트 UI
- [x] 장르/무드 태깅

### Step 4: Video Creator ✅
- [x] 트랙 선택 & 드래그 정렬
- [x] FFmpeg 영상 렌더링 파이프라인
- [x] 인메모리 비동기 처리 + 진행률 (BullMQ → MVP 간소화)
- [x] AI 공개 문구 워터마크

### Step 5: SEO 메타데이터 생성기 ✅
- [x] 제목 공식 기반 자동 생성
- [x] 설명란 + 자동 타임스탬프
- [x] 롱테일 키워드 태그 생성

---

## Phase 2: 배포 & 배급 (주 5-8)

### Step 6: YouTube 업로더
### Step 7: 썸네일 생성기
### Step 8: 콘텐츠 캘린더
### Step 9: Spotify/DistroKid 워크플로우

---

## Phase 3: 분석 & 스케일 (주 9-12)

### Step 10: 애널리틱스 대시보드
### Step 11: One Source Multi Use 워크플로우
### Step 12: 배치 작업
