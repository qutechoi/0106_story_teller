# 📖 멀티 에이전트 도서 출판 시스템

> AI 에이전트 6명이 협업하여 한 권의 완성된 책을 자동으로 만들어내는 시스템

## 한눈에 보기

| 항목 | 내용 |
|------|------|
| **아키텍처** | 오케스트레이터 + 6개 전문 에이전트 (순차/조건부 실행) |
| **기반 기술** | Claude Code, WeasyPrint, matplotlib, Python |
| **출력 형식** | 마크다운(챕터별) → HTML → PDF |
| **상태 관리** | JSON 기반 상태 머신 (`book_state.json`) |
| **이미지 생성** | matplotlib 로컬 렌더링 (유료 API 미사용) |

---

## 시스템 아키텍처

```
사용자 입력 (주제, 독자, 언어)
        │
        ▼
┌──────────────────────────────────┐
│        오케스트레이터 (CLAUDE.md)     │
│    상태 읽기 → 에이전트 호출 → 상태 갱신  │
└──────────┬───────────────────────┘
           │
    ┌──────┼──────┬──────┬──────┬──────┐
    ▼      ▼      ▼      ▼      ▼      ▼
 제목    텍스트  이미지  리뷰   수정   최종
에이전트 에이전트 에이전트 에이전트 에이전트 에이전트
    │      │      │      │      │      │
    ▼      ▼      ▼      ▼      ▼      ▼
  제목   ch01~  img/   리뷰   수정본  PDF
  후보   ch11   PNG    결과   반영   출력
```

---

## 실행 파이프라인

전체 과정은 7개 Phase로 구성되며, `state/book_state.json`이 현재 진행 상태를 추적합니다.

### Phase 0: 초기화
사용자로부터 **주제**, **대상 독자**, **언어**를 입력받고 상태 파일과 디렉토리 구조를 생성합니다.

### Phase 1: 제목 생성 🏷️
**Title Agent**가 5개의 제목 후보를 생성하고, 5가지 기준(명확성·매력도·차별성·SEO·기억성)으로 자체 채점합니다. 사용자가 최종 제목을 선택합니다.

### Phase 2: 본문 작성 ✍️
**Text Agent**가 두 단계로 작동합니다:
1. **TOC 모드** — 파트/챕터 구조 설계 → 사용자 확인
2. **Chapter 모드** — 챕터를 순차 집필 (이전 챕터 요약을 참고하여 문맥 연속성 유지)

각 챕터는 도입부 → 본문(섹션별) → 이미지 마커 → 요약 → 다음 장 예고 구조로 작성됩니다.

### Phase 3: 이미지 삽입 🎨
**Image Agent**가 본문의 이미지 마커(`<!-- IMAGE: {...} -->`)를 파싱하여 matplotlib로 다이어그램, 차트, 인포그래픽을 생성하고 본문에 삽입합니다.

> **참고**: 유료 API(Imagen, DALL-E 등)는 비용과 한글 깨짐 문제로 사용하지 않습니다. 모든 이미지는 matplotlib + Python으로 로컬 생성합니다.

### Phase 4: 검수/리뷰 🔍
**Review Agent**가 7가지 기준으로 각 챕터를 10점 만점 채점합니다:

| 기준 | 내용 |
|------|------|
| 사실 정확성 | 데이터, 용어, 최신성 |
| 논리적 구조 | 흐름, 전환, 결론 |
| 문체 일관성 | 톤, 어휘 수준, 문장 다양성 |
| 완성도 | 약속된 주제 커버, 분량 |
| 중복/누락 | 반복 없음, 모든 개념 포함 |
| 가독성 | 단락, 제목 계층, 시각 요소 |
| 독자 가치 | 실용성, 예시, 몰입도 |

**합격**: 총점 49/70 이상 AND 모든 항목 5점 이상

### Phase 5: 수정 (조건부) 🔧
**Revision Agent**가 FAIL 챕터의 이슈를 심각도 순(critical → major → minor)으로 수정합니다. 리뷰→수정 사이클은 챕터당 **최대 3회**로 제한됩니다.

### Phase 6: 최종 PDF 빌드 📕
**Final Agent**가 전체 챕터를 통합하여 HTML을 조립하고 WeasyPrint로 PDF를 생성합니다.

**PDF 구성**: 표지 → 목차 → 머리말 → (파트 구분 페이지 + 챕터) × N → 부록(용어집)

---

## 프로젝트 구조

```
book_agent_system/
│
├── CLAUDE.md                    # 오케스트레이터 지침 (상태 전이, 실행 흐름)
├── instruction.md               # 전체 시스템 아키텍처 문서
├── system_architecture.svg      # 아키텍처 다이어그램
│
├── agents/                      # 6개 전문 에이전트 프롬프트
│   ├── title_agent.md           # 제목 후보 생성 + 채점
│   ├── text_agent.md            # 목차 설계 + 챕터 집필
│   ├── image_agent.md           # 이미지 생성 + 삽입
│   ├── review_agent.md          # 7항목 품질 검수
│   ├── revision_agent.md        # 이슈 기반 수정
│   └── final_agent.md           # 통합 + PDF 빌드
│
├── tools/                       # Python 유틸리티
│   ├── generate_images.py       # matplotlib 이미지 생성 (메인)
│   ├── regenerate_images.py     # 이미지 재생성
│   ├── build_final_pdf.py       # HTML 조립 + WeasyPrint PDF 변환
│   ├── pdf_builder.py           # PDF 빌드 래퍼
│   ├── state_manager.py         # 상태 파일 관리
│   ├── web_researcher.py        # 웹 리서치 유틸
│   ├── file_manager.py          # 파일 I/O
│   └── image_gen.py             # 레거시 이미지 생성
│
├── templates/                   # PDF 템플릿
│   ├── book_template.html       # 마스터 HTML (SVG 표지 아트 포함)
│   ├── chapter_template.html    # 챕터 템플릿
│   └── styles/
│       ├── book.css             # 메인 스타일시트 (B5, 퍼플 테마)
│       └── cover.css            # 표지 스타일
│
├── schemas/                     # JSON 스키마 정의
│   ├── book_state.json          # 상태 스키마 + 전이 규칙
│   ├── chapter_schema.json      # 챕터 메타데이터 구조
│   ├── review_checklist.json    # 리뷰 채점 기준
│   └── title_candidates.json    # 제목 후보 출력 형식
│
├── state/                       # 런타임 상태
│   └── book_state.json          # 현재 진행 상태 (JSON)
│
├── output/                      # 생성물
│   ├── title_candidates.json    # 제목 후보 5개
│   ├── toc.json                 # 목차 구조
│   ├── review_results.json      # 리뷰 결과
│   ├── drafts/
│   │   ├── ch01.md ~ ch11.md    # 챕터 마크다운
│   │   ├── ch01_meta.json ~ ... # 챕터 메타데이터
│   │   └── img/                 # 생성된 이미지 (74개)
│   └── final/
│       ├── book_final.pdf       # 최종 PDF
│       └── book_complete.html   # 통합 HTML
│
└── logs/
    └── agent_log.jsonl          # 에이전트 실행 로그
```

---

## 상태 전이 다이어그램

```
initialized ──→ title_ready ──→ drafting ──→ draft_complete
                                                   │
                                                   ▼
                          review ←── image_complete
                            │
                 ┌──────────┼──────────┐
                 ▼                     ▼
          review (PASS)          review (FAIL)
                 │                     │
                 ▼                     ▼
          final_ready              revision
                 │                     │
                 ▼                     │ (최대 3회)
             complete ←────────────────┘
```

**실패 복구**: 에이전트 실패 시 3회 재시도 → 그래도 실패하면 `error` 상태로 마킹 후 다음으로 진행

---

## 기술 스택

| 구분 | 기술 | 역할 |
|------|------|------|
| **오케스트레이션** | Claude Code + Agent Tool | 에이전트 순차/병렬 호출 |
| **본문 작성** | Claude (Subagent) | 챕터별 마크다운 생성 |
| **이미지 생성** | matplotlib + Python | 다이어그램, 차트, 인포그래픽 |
| **PDF 변환** | WeasyPrint | HTML+CSS → PDF 렌더링 |
| **마크다운 변환** | Python-Markdown | .md → HTML 변환 |
| **상태 관리** | JSON (book_state.json) | 상태 머신 기반 진행 추적 |
| **한글 폰트** | Apple SD Gothic Neo | PDF 내 한글 렌더링 |

---

## PDF 디자인 시스템

### 표지
- **배경**: 라벤더-블루 그라디언트 (`#f0f4ff → #ced8ff`)
- **배경 아트**: SVG 지식 그래프 패턴 (노드 + 연결선, 퍼플 계열 저 opacity)
- **아이콘**: 퍼플~인디고 그라디언트 보석(gem) + sparkle 효과
- **저자명**: Qute Choi (feat. Claude opus 4.6)

### 컬러 테마 (퍼플 계열 통일)
| 용도 | 색상 | HEX |
|------|------|-----|
| Primary | 퍼플 | `#7c3aed` |
| Secondary | 다크 퍼플 | `#6d28d9` |
| Light | 라이트 퍼플 | `#c4b5fd` |
| Background | 라벤더 | `#faf8ff` |
| Alt Background | 밝은 라벤더 | `#f3f0ff` |

### 본문 타이포그래피
- 페이지 크기: **B5** (176mm × 250mm)
- 본문: 10.5pt, 줄간격 1.85
- h1: 20pt (챕터 제목, 퍼플 하단 보더)
- h2: 14pt (섹션 제목, 좌측 퍼플 바)
- 코드 블록: 라벤더 배경 + 퍼플 좌측 바
- 표: 퍼플 헤더 배경, 짝수행 교대 배경

---

## 사용법

### 사전 요구사항
```bash
# Python 패키지 설치
pip install weasyprint markdown matplotlib

# macOS에서 WeasyPrint 의존성
brew install pango
```

### 실행
Claude Code에서 프로젝트 디렉토리를 열고 주제를 입력하면 오케스트레이터가 자동으로 파이프라인을 실행합니다.

```
사용자: "옵시디언, 노션, 조플린 기초부터 활용방법까지 쉽게 설명하는 책을 만들어줘"

→ Phase 0~6 자동 실행
→ output/final/book_final.pdf 생성
```

### 수동 도구 실행
```bash
# 이미지만 재생성
python3 tools/generate_images.py

# PDF만 재빌드
python3 tools/build_final_pdf.py

# 기존 이미지 재생성 (마커가 이미 교체된 경우)
python3 tools/regenerate_images.py
```

---

## 생성 결과 예시: 《내 머릿속 정리법》

이 시스템으로 생성한 첫 번째 책입니다.

| 항목 | 수치 |
|------|------|
| **총 챕터** | 11개 (5개 파트) |
| **총 단어수** | ~41,100 단어 |
| **이미지** | 74개 |
| **PDF 페이지** | ~245 페이지 |
| **PDF 크기** | 33.7 MB |
| **제작 시간** | 약 1시간 38분 |
| **리뷰 결과** | 10/11 PASS (1개 수정 후 PASS) |

### 목차
| 파트 | 챕터 | 주제 |
|------|------|------|
| Part 1 | Ch.1-2 | 디지털 노트의 필요성 + 세 앱 비교 지도 |
| Part 2 | Ch.3-4 | 옵시디언 시작하기 + 활용하기 |
| Part 3 | Ch.5-6 | 노션 시작하기 + 활용하기 |
| Part 4 | Ch.7-8 | 조플린 시작하기 + 활용하기 |
| Part 5 | Ch.9-11 | 실전 시나리오 + 멀티 앱 전략 + 세컨드 브레인 |

---

## 핵심 설계 결정

### 왜 상태 머신인가?
각 Phase는 독립적으로 실행·재시도할 수 있습니다. 중간에 실패해도 `book_state.json`을 보고 실패 지점부터 재개할 수 있어, 긴 작업의 안정성을 보장합니다.

### 왜 matplotlib인가?
초기에는 Imagen 4.0 API로 이미지를 생성했으나, **한글 텍스트 깨짐**과 **API 비용**(74장에 약 3,200원) 문제가 있었습니다. matplotlib은 한글 폰트를 정확히 렌더링하고 비용이 0원입니다.

### 왜 리뷰 사이클을 3회로 제한하는가?
무한 리뷰 루프를 방지합니다. 3회 수정 후에도 FAIL이면 현재 버전을 최선으로 간주하고 다음 단계로 넘어갑니다. 실제로는 대부분 1회 수정으로 PASS합니다.

### 왜 에이전트를 분리하는가?
각 에이전트는 하나의 전문 역할만 수행합니다. 제목 짓기, 글쓰기, 이미지 생성, 품질 검수는 서로 다른 전문성이 필요하므로, 분리하면 각 단계의 프롬프트를 최적화할 수 있고 실패 시 해당 에이전트만 재시도하면 됩니다.

---

## 라이선스

이 프로젝트는 개인 학습 및 실험 목적으로 제작되었습니다.

---

*Built with Claude Code by Qute Choi*
