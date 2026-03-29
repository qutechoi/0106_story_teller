# SunoFlow 진행 상황 추적

## 현재 상태
- **현재 Phase**: Phase 1 - MVP
- **현재 Step**: Step 4 - Video Creator (다음 진행)
- **마지막 업데이트**: 2026-03-29
- **다음 할 일**: Video Creator (FFmpeg 기반 영상 렌더링 파이프라인)

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
- [ ] Step 4: Video Creator (다음 세션)

---

## 기술 메모
- Prisma 7은 URL을 prisma.config.ts에서 관리, client는 adapter 방식 필수
- PrismaBetterSqlite3 생성자: `new PrismaBetterSqlite3({ url: "file:..." })`
- package.json에서 "type": "commonjs" 제거 필요 (Next.js ESM 호환)
- SQLite는 enum/String[] 미지원 → String + JSON 문자열로 대체
