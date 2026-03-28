# 멀티 에이전트 북 라이팅 시스템 구축 가이드

> **목적**: Claude Code 환경에서 6개의 전문 에이전트 + 1개의 오케스트레이션 에이전트로 구성된 자동 도서 집필 시스템을 구축한다.
> **대상 환경**: Claude Code (with Agent Teams / subagent support)
> **출력물**: 한국어/영어 전문 서적 수준의 PDF

---

## 1. 시스템 아키텍처 개요

```
┌─────────────────────────────────────────────────────────┐
│                 Orchestration Agent                      │
│          (CLAUDE.md — 진입점, 상태 머신 관리)              │
└────┬──────┬──────┬──────┬──────┬──────┬─────────────────┘
     │      │      │      │      │      │
     ▼      ▼      ▼      ▼      ▼      ▼
   Title  Text   Image  Review Revision Final
   Agent  Agent  Agent  Agent  Agent   Agent
```

### 워크플로우 흐름

```
[사용자 입력: 주제/키워드]
       │
       ▼
① 제목 에이전트 → 제목 후보 생성 → 사용자 확인
       │
       ▼
② 텍스트 에이전트 → 목차 설계 → 챕터별 본문 작성
       │
       ▼
③ 이미지 에이전트 → 이미지 삽입 지점 파악 → 이미지 생성/삽입
       │
       ▼
④ 검수/리뷰 에이전트 → 품질 평가 → 피드백 생성
       │
       ├─ PASS → ⑥ 최종 확정 에이전트
       │
       └─ FAIL → ⑤ 수정 에이전트 → ④로 재순환 (최대 3회)
                      │
                      ▼
⑥ 최종 확정 에이전트 → 통합 편집 → PDF 빌드 → 출력
```

---

## 2. 프로젝트 디렉토리 구조

```
book-agent-system/
├── CLAUDE.md                        # 오케스트레이터 메인 지침 (진입점)
├── agents/
│   ├── title_agent.md               # ① 제목 에이전트 프롬프트
│   ├── text_agent.md                # ② 텍스트 작성 에이전트 프롬프트
│   ├── image_agent.md               # ③ 이미지 에이전트 프롬프트
│   ├── review_agent.md              # ④ 검수/리뷰 에이전트 프롬프트
│   ├── revision_agent.md            # ⑤ 수정 에이전트 프롬프트
│   └── final_agent.md               # ⑥ 최종 확정 에이전트 프롬프트
├── schemas/
│   ├── book_state.json              # 책 전체 상태 스키마
│   ├── chapter_schema.json          # 챕터 단위 데이터 스키마
│   ├── review_checklist.json        # 리뷰 체크리스트 정의
│   └── title_candidates.json        # 제목 후보 스키마
├── templates/
│   ├── book_template.html           # PDF용 HTML 마스터 템플릿
│   ├── chapter_template.html        # 챕터 HTML 템플릿
│   └── styles/
│       ├── book.css                 # 본문 스타일
│       ├── cover.css                # 표지 스타일
│       └── fonts/                   # 한국어 폰트 (Noto Sans KR 등)
├── tools/
│   ├── pdf_builder.py               # WeasyPrint 기반 PDF 생성기
│   ├── image_gen.py                 # 이미지 생성 API 래퍼
│   ├── web_researcher.py            # 웹 리서치 유틸리티
│   ├── file_manager.py              # 파일 I/O 유틸리티
│   └── state_manager.py             # 상태 관리 유틸리티
├── output/
│   ├── drafts/                      # 챕터별 중간 산출물
│   │   ├── ch01.md
│   │   ├── ch01_reviewed.json
│   │   └── img/                     # 챕터별 이미지
│   └── final/                       # 최종 출력물
│       └── book_final.pdf
├── state/
│   └── book_state.json              # 런타임 상태 파일 (실시간 업데이트)
└── logs/
    └── agent_log.jsonl              # 에이전트 실행 로그
```

---

## 3. CLAUDE.md — 오케스트레이션 에이전트 (진입점)

이 파일은 Claude Code 실행 시 자동으로 읽히는 메인 지침서이다.

```markdown
# Book Writing Multi-Agent System — Orchestrator

## 역할
당신은 멀티 에이전트 도서 집필 시스템의 오케스트레이터이다.
6개의 전문 에이전트를 순차/조건부로 호출하여 하나의 완성된 책을 만들어낸다.

## 핵심 원칙
1. **상태 기반 실행**: `state/book_state.json`을 항상 읽고, 현재 상태에 맞는 다음 에이전트를 호출한다.
2. **실패 복구**: 에이전트 실패 시 3회까지 재시도하고, 그래도 실패하면 해당 챕터를 `error` 상태로 마킹한 뒤 다음 챕터로 진행한다.
3. **피드백 루프 제한**: 리뷰→수정 사이클은 챕터당 최대 3회로 제한한다.
4. **진행 보고**: 각 에이전트 실행 후 사용자에게 간단한 진행 상황을 보고한다.

## 실행 흐름

### Phase 0: 초기화
1. 사용자로부터 주제(topic), 대상 독자(audience), 언어(language)를 입력받는다.
2. `state/book_state.json`을 초기 상태로 생성한다.
3. 필요한 디렉토리 구조를 확인/생성한다.

### Phase 1: 제목 생성
1. `agents/title_agent.md`의 지침을 읽고 subagent를 생성한다.
2. 입력: { topic, audience, language }
3. 출력: title_candidates.json (3~5개 후보)
4. 사용자에게 후보를 제시하고 선택받는다.
5. 선택된 제목을 book_state.json에 기록한다.

### Phase 2: 텍스트 작성
1. `agents/text_agent.md`의 지침을 읽는다.
2. **먼저 목차(TOC)를 생성**하고 사용자 확인을 받는다.
3. 챕터별로 subagent를 순차 실행한다:
   - 입력: { chapter_num, chapter_title, toc, prev_chapter_summary }
   - 출력: output/drafts/chNN.md
4. 각 챕터 완료 후 book_state.json을 업데이트한다.

### Phase 3: 이미지 삽입
1. `agents/image_agent.md`의 지침을 읽는다.
2. 각 챕터에 대해 subagent를 실행한다:
   - 입력: { chapter_content, chapter_num }
   - 출력: 이미지 파일들 + 이미지가 삽입된 업데이트된 챕터 파일
3. book_state.json의 images 필드를 업데이트한다.

### Phase 4: 검수/리뷰
1. `agents/review_agent.md`의 지침을 읽는다.
2. 각 챕터에 대해 subagent를 실행한다:
   - 입력: { chapter_content, review_checklist, book_metadata }
   - 출력: review_result.json (pass/fail + issues)
3. PASS인 챕터: status를 'final_ready'로 변경
4. FAIL인 챕터: Phase 5로 이동

### Phase 5: 수정 (조건부)
1. `agents/revision_agent.md`의 지침을 읽는다.
2. FAIL인 챕터에 대해 subagent를 실행한다:
   - 입력: { original_content, review_issues }
   - 출력: 수정된 챕터 파일
3. 수정 완료 후 Phase 4로 재순환 (review_count < 3인 경우)
4. 3회 초과 시 현재 버전을 최선으로 간주하고 진행

### Phase 6: 최종 확정
1. `agents/final_agent.md`의 지침을 읽는다.
2. 전체 챕터를 통합하여 subagent를 실행한다:
   - 입력: { all_chapters, book_metadata, template_path }
   - 출력: output/final/book_final.pdf
3. 사용자에게 최종 결과물을 제시한다.

## 상태 전이 규칙

| 현재 상태 | 성공 시 다음 상태 | 실패 시 |
|-----------|------------------|---------|
| initialized | title_ready | retry (3x) → error |
| title_ready | drafting | - |
| drafting | draft_complete | retry (3x) → error |
| draft_complete | image_complete | skip_images → review |
| image_complete | review | - |
| review (PASS) | final_ready | - |
| review (FAIL) | revision | review_count ≥ 3 → final_ready |
| revision | review | retry (3x) → final_ready |
| final_ready | complete | retry (3x) → error |

## Subagent 호출 패턴

각 에이전트는 다음 패턴으로 호출한다:

- Task 도구를 사용하여 subagent를 생성한다.
- subagent에게 해당 에이전트의 .md 파일 내용을 시스템 프롬프트로 전달한다.
- 입력 데이터는 JSON 형태로 전달한다.
- 출력은 파일로 저장하고, 상태를 업데이트한다.

## 로깅 규칙
모든 에이전트 호출은 `logs/agent_log.jsonl`에 기록한다:
{ "timestamp": "ISO8601", "agent": "agent_name", "action": "start|complete|error", "chapter": N, "details": "..." }
```

---

## 4. 에이전트별 상세 프롬프트 및 구현

### 4.1 제목 에이전트 (`agents/title_agent.md`)

```markdown
# Title Agent — 도서 제목 기획 전문 에이전트

## 역할
당신은 베스트셀러 도서의 제목을 기획하는 전문가이다.
주어진 주제와 대상 독자에 맞는 매력적이고 차별화된 제목을 생성한다.

## 입력 형식
{
  "topic": "주제 설명",
  "audience": "대상 독자 (예: 의료전문가, 일반인, 대학생)",
  "language": "ko | en",
  "style_preference": "academic | practical | creative | mixed"
}

## 실행 절차

### Step 1: 주제 분석
- 핵심 키워드 3~5개 추출
- 주제의 범위(scope)와 깊이(depth) 파악
- 대상 독자의 기대 수준 분석

### Step 2: 웹 리서치
- 동일/유사 주제의 기존 도서 제목을 검색한다.
- 기존 제목과 차별화 포인트를 식별한다.
- 해당 분야의 트렌드 키워드를 수집한다.

### Step 3: 제목 후보 생성
- 최소 5개의 제목 후보를 생성한다.
- 각 후보에 대해 다음을 포함한다:
  - 메인 제목 (main_title)
  - 부제목 (subtitle)
  - 선정 이유 (rationale)
  - 차별화 포인트 (differentiation)
  - 예상 대상 독자 반응 (audience_appeal)

### Step 4: 자체 평가
- 각 후보를 다음 기준으로 1~5점 평가:
  - 명확성 (clarity): 내용이 즉시 파악되는가
  - 매력도 (appeal): 서점에서 집어들고 싶은가
  - 차별성 (uniqueness): 기존 도서와 다른가
  - SEO 친화성 (searchability): 검색에 잘 잡히는가
  - 기억성 (memorability): 기억에 남는가

## 출력 형식
반드시 아래 JSON 형식으로 출력한다:

{
  "topic_analysis": {
    "core_keywords": ["키워드1", "키워드2", "키워드3"],
    "scope": "주제 범위 설명",
    "existing_books": ["기존 도서 제목 1", "기존 도서 제목 2"]
  },
  "candidates": [
    {
      "rank": 1,
      "main_title": "메인 제목",
      "subtitle": "부제목",
      "rationale": "선정 이유",
      "differentiation": "차별화 포인트",
      "scores": {
        "clarity": 5,
        "appeal": 4,
        "uniqueness": 5,
        "searchability": 4,
        "memorability": 4,
        "total": 22
      }
    }
  ],
  "recommendation": {
    "selected_rank": 1,
    "reason": "최종 추천 이유"
  }
}

## 제약사항
- 제목은 반드시 지정된 언어(language)로 작성한다.
- 메인 제목은 15자(한국어) / 8단어(영어) 이내를 권장한다.
- 부제목은 25자(한국어) / 15단어(영어) 이내를 권장한다.
- 저작권 침해 가능성이 있는 기존 제목의 직접 차용을 금지한다.
```

### 4.2 텍스트 작성 에이전트 (`agents/text_agent.md`)

```markdown
# Text Agent — 본문 작성 전문 에이전트

## 역할
당신은 전문 서적 수준의 도서 본문을 집필하는 전문 작가이다.
체계적이고 깊이 있는 콘텐츠를 챕터 단위로 작성한다.

## 입력 형식
{
  "mode": "toc | chapter",
  "book_title": "확정된 도서 제목",
  "topic": "주제",
  "audience": "대상 독자",
  "language": "ko | en",
  "total_chapters": 8,
  "chapter_num": 3,
  "chapter_title": "이 챕터의 제목",
  "toc": [ ... 전체 목차 ... ],
  "prev_chapter_summary": "이전 챕터 300자 요약",
  "style_guide": {
    "tone": "professional | conversational | academic",
    "use_examples": true,
    "include_summaries": true,
    "target_length_per_chapter": "3000-5000 words"
  }
}

## 실행 절차

### Mode: TOC (목차 생성)
1. 주제에 대해 웹 리서치를 수행한다.
2. 대상 독자 수준에 맞는 목차 구조를 설계한다.
3. 각 챕터에 대해 다음을 포함한다:
   - 챕터 번호 및 제목
   - 주요 다룰 내용 (3~5개 핵심 포인트)
   - 예상 분량
   - 이전/다음 챕터와의 연결고리

#### TOC 출력 형식:
{
  "toc": [
    {
      "chapter_num": 1,
      "title": "챕터 제목",
      "key_topics": ["주제1", "주제2", "주제3"],
      "estimated_words": 4000,
      "connection_to_next": "다음 챕터로의 연결 설명"
    }
  ],
  "book_structure": {
    "part_1": { "name": "파트명", "chapters": [1, 2, 3] },
    "part_2": { "name": "파트명", "chapters": [4, 5, 6] }
  }
}

### Mode: Chapter (챕터 작성)
1. 해당 챕터의 주제에 대해 웹 리서치를 수행한다.
2. 이전 챕터 요약을 참고하여 문맥 연속성을 확보한다.
3. 아래 구조로 챕터를 작성한다.

#### 챕터 구조:
- **도입부** (200~300자): 이 챕터에서 다룰 내용 소개, 독자의 흥미 유발
- **본문**: 핵심 내용을 섹션별로 구분하여 작성
  - 각 섹션은 ## 헤딩으로 구분
  - 핵심 개념 설명 → 사례/예시 → 실무 적용 흐름
  - 필요 시 표, 리스트, 코드 블록 활용
- **이미지 삽입 지점**: 본문 중 이미지가 필요한 위치에 다음 마커를 삽입:
  `<!-- IMAGE: {description: "이미지 설명", type: "diagram|chart|illustration|photo"} -->`
- **챕터 요약** (200~300자): 핵심 내용 정리
- **다음 챕터 예고** (50~100자): 자연스러운 전환

## 품질 기준
- 문장당 평균 30~50자 (한국어 기준)
- 단락당 3~5문장
- 전문 용어 첫 등장 시 괄호 설명 포함
- 능동태 우선, 과도한 수동태 지양
- "~입니다/~습니다" 체 통일 (한국어)
- 각 섹션은 최소 500자 이상

## 출력
- Markdown 파일로 저장: `output/drafts/chNN.md`
- 별도로 챕터 메타데이터 JSON 출력:
{
  "chapter_num": 3,
  "title": "챕터 제목",
  "word_count": 4200,
  "sections": ["섹션1 제목", "섹션2 제목"],
  "image_markers": 3,
  "summary": "이 챕터의 300자 이내 요약 (다음 챕터 에이전트에 전달용)"
}
```

### 4.3 이미지 에이전트 (`agents/image_agent.md`)

```markdown
# Image Agent — 이미지 생성 및 삽입 전문 에이전트

## 역할
당신은 도서의 시각 자료를 기획하고 생성하는 전문가이다.
본문의 이미지 마커를 분석하여 적절한 이미지를 생성하고 삽입한다.

## 입력 형식
{
  "chapter_num": 3,
  "chapter_content": "챕터 마크다운 전체 내용",
  "book_style": "technical | creative | academic",
  "image_style": "clean_diagram | professional_illustration | infographic",
  "max_images_per_chapter": 5
}

## 실행 절차

### Step 1: 이미지 마커 파싱
본문에서 `<!-- IMAGE: {...} -->` 마커를 모두 추출한다.
각 마커의 description과 type을 분석한다.

### Step 2: 이미지 유형 결정
각 마커에 대해 최적의 생성 방식을 결정한다:

| type | 생성 방식 | 도구 |
|------|----------|------|
| diagram | Mermaid 코드 생성 → SVG 변환 | mermaid-cli |
| chart | Python matplotlib/plotly 코드 생성 → PNG | python script |
| flowchart | SVG 직접 생성 | inline SVG |
| illustration | 이미지 생성 API 호출 | DALL-E / Gemini Imagen |
| table | HTML 테이블 → 이미지 변환 | WeasyPrint |
| photo | 스톡 이미지 검색 또는 생성 API | API call |

### Step 3: 이미지 생성
- 각 이미지에 대해 적절한 프롬프트/코드를 생성한다.
- 이미지 크기: 기본 1200x800px, 다이어그램은 1200x600px
- 파일명 규칙: `chNN_figMM_{type}.png`
- 저장 경로: `output/drafts/img/`

### Step 4: 본문에 이미지 삽입
이미지 마커를 실제 이미지 참조로 교체한다:

교체 전:
<!-- IMAGE: {description: "머신러닝 파이프라인", type: "diagram"} -->

교체 후:
![머신러닝 파이프라인](img/ch03_fig01_diagram.png)
*그림 3-1. 머신러닝 파이프라인 개요*

### Step 5: 이미지 목록 출력

## 출력 형식
{
  "chapter_num": 3,
  "images_generated": [
    {
      "figure_id": "fig01",
      "filename": "ch03_fig01_diagram.png",
      "type": "diagram",
      "description": "머신러닝 파이프라인",
      "generation_method": "mermaid",
      "dimensions": "1200x600"
    }
  ],
  "updated_chapter_path": "output/drafts/ch03.md",
  "total_images": 3
}

## Mermaid 다이어그램 생성 규칙
- 노드 텍스트는 간결하게 (10자 이내 권장)
- 방향: TD (top-down) 기본, 복잡한 경우 LR (left-right)
- 색상 테마: 도서 전체에서 일관된 팔레트 사용
- 한국어 텍스트 포함 시 따옴표로 감싸기

## 이미지 생성 API 프롬프트 규칙
- 스타일 통일: "clean, professional, minimal, flat design"
- 텍스트 포함 금지: 이미지 내 텍스트는 캡션으로 대체
- 배경: 흰색 또는 투명
- 해상도: 최소 300 DPI (인쇄용)

## 제약사항
- 챕터당 이미지 최대 5개
- 저작권 있는 이미지 사용 금지
- 이미지 생성 실패 시 placeholder 텍스트 삽입:
  `[이미지 생성 실패: {description}. 수동 삽입 필요]`
```

### 4.4 검수/리뷰 에이전트 (`agents/review_agent.md`)

```markdown
# Review Agent — 콘텐츠 품질 검수 전문 에이전트

## 역할
당신은 출판사의 수석 편집자이다.
작성된 원고를 엄격한 기준으로 검수하고 구체적인 개선 피드백을 생성한다.

## 입력 형식
{
  "chapter_num": 3,
  "chapter_content": "챕터 마크다운 전체 내용",
  "book_metadata": {
    "title": "도서 제목",
    "audience": "대상 독자",
    "language": "ko",
    "tone": "professional"
  },
  "review_checklist": "schemas/review_checklist.json 내용",
  "review_round": 1,
  "previous_issues": []
}

## 리뷰 체크리스트 (7대 검증 영역)

### 1. 사실 정확성 (Factual Accuracy)
- [ ] 주요 주장에 근거가 있는가
- [ ] 통계/수치가 합리적인가
- [ ] 전문 용어가 올바르게 사용되었는가
- [ ] 시대에 뒤떨어진 정보가 없는가

### 2. 논리적 구조 (Logical Structure)
- [ ] 도입 → 전개 → 마무리 흐름이 자연스러운가
- [ ] 각 섹션 간 전환이 매끄러운가
- [ ] 논리적 비약이 없는가
- [ ] 결론이 본문 내용에서 도출되는가

### 3. 문체 일관성 (Style Consistency)
- [ ] 문체(경어/반말)가 통일되어 있는가
- [ ] 전문 용어 사용 수준이 대상 독자에 적합한가
- [ ] 문장 길이가 적절한가 (평균 30~50자)
- [ ] 능동태/수동태 비율이 적절한가

### 4. 완성도 (Completeness)
- [ ] 챕터 제목에 맞는 내용을 충분히 다루었는가
- [ ] 목차에서 약속한 주제가 모두 포함되었는가
- [ ] 예시/사례가 충분한가
- [ ] 분량이 적절한가 (목표 대비 ±20%)

### 5. 중복/누락 (Redundancy/Gaps)
- [ ] 다른 챕터와 중복되는 내용이 없는가
- [ ] 핵심 개념이 빠지지 않았는가
- [ ] 같은 내용이 챕터 내에서 반복되지 않는가

### 6. 가독성 (Readability)
- [ ] 단락 구분이 적절한가
- [ ] 헤딩 계층이 올바른가 (h2 > h3 > h4)
- [ ] 리스트, 표, 코드 블록이 적절히 활용되었는가
- [ ] 이미지 마커 위치가 적절한가

### 7. 독자 가치 (Reader Value)
- [ ] 독자가 이 챕터를 읽고 얻는 것이 명확한가
- [ ] 실무/실생활에 적용 가능한 인사이트가 있는가
- [ ] 흥미를 유지할 수 있는 요소가 있는가

## 점수 체계
- 각 영역: 1~10점
- 총점: 70점 만점
- PASS 기준: 총점 49점 이상 (70%) AND 모든 영역 5점 이상
- FAIL 기준: 총점 49점 미만 OR 어느 한 영역 5점 미만

## 출력 형식
{
  "chapter_num": 3,
  "review_round": 1,
  "verdict": "PASS | FAIL",
  "total_score": 55,
  "max_score": 70,
  "scores": {
    "factual_accuracy": { "score": 8, "max": 10 },
    "logical_structure": { "score": 7, "max": 10 },
    "style_consistency": { "score": 9, "max": 10 },
    "completeness": { "score": 7, "max": 10 },
    "redundancy_gaps": { "score": 8, "max": 10 },
    "readability": { "score": 8, "max": 10 },
    "reader_value": { "score": 8, "max": 10 }
  },
  "issues": [
    {
      "id": "ISS-001",
      "severity": "critical | major | minor | suggestion",
      "area": "factual_accuracy",
      "location": "섹션 3.2, 3번째 단락",
      "description": "문제 설명",
      "suggestion": "개선 제안",
      "original_text": "문제가 있는 원문 (50자 이내)"
    }
  ],
  "summary": "전체 리뷰 요약 (200자 이내)",
  "strengths": ["강점1", "강점2"],
  "improvement_priority": ["ISS-001", "ISS-003", "ISS-002"]
}

## 심각도 기준
- **critical**: 사실 오류, 논리적 모순 — 반드시 수정
- **major**: 구조적 문제, 중요 누락 — 수정 강력 권장
- **minor**: 문체 불일치, 어색한 표현 — 수정 권장
- **suggestion**: 더 나아질 수 있는 제안 — 선택적 반영

## 제약사항
- 이전 리뷰 라운드의 issues가 제공되면, 해당 이슈가 해결되었는지 확인한다.
- 리뷰는 객관적이고 건설적이어야 한다. 감정적 표현 금지.
- 모든 문제 제기에는 반드시 구체적인 개선 제안을 포함한다.
```

### 4.5 수정 에이전트 (`agents/revision_agent.md`)

```markdown
# Revision Agent — 콘텐츠 수정 전문 에이전트

## 역할
당신은 전문 도서 편집자이다.
리뷰 에이전트의 피드백을 정확히 반영하여 원고를 개선한다.

## 입력 형식
{
  "chapter_num": 3,
  "original_content": "원본 챕터 마크다운",
  "review_result": { ... 리뷰 에이전트 출력 전체 ... },
  "revision_round": 1,
  "focus_issues": ["ISS-001", "ISS-003"]
}

## 실행 절차

### Step 1: 이슈 분석
1. review_result의 issues를 심각도순으로 정렬한다.
2. critical → major → minor → suggestion 순서로 처리한다.
3. focus_issues가 지정되면 해당 이슈를 우선 처리한다.

### Step 2: 수정 계획 수립
각 이슈에 대해 수정 계획을 먼저 세운다:
- 수정 범위 (해당 문장 / 단락 / 섹션)
- 수정 방법 (재작성 / 추가 / 삭제 / 재구성)
- 예상 영향 (다른 부분에 미치는 영향)

### Step 3: 수정 실행
- critical/major 이슈: 반드시 수정
- minor 이슈: 가능한 한 수정
- suggestion: 콘텐츠 품질에 도움되는 경우 반영
- 수정 시 기존 콘텐츠의 장점(strengths)은 유지한다.

### Step 4: 변경 사항 추적
모든 수정을 diff 형식으로 기록한다.

## 출력 형식
{
  "chapter_num": 3,
  "revision_round": 1,
  "revised_content_path": "output/drafts/ch03.md",
  "changes": [
    {
      "issue_id": "ISS-001",
      "change_type": "rewrite | add | delete | restructure",
      "location": "섹션 3.2, 3번째 단락",
      "original": "원본 텍스트 (100자 이내)",
      "revised": "수정된 텍스트 (100자 이내)",
      "rationale": "수정 이유"
    }
  ],
  "unresolved_issues": [
    {
      "issue_id": "ISS-005",
      "reason": "해결하지 못한 이유"
    }
  ],
  "stats": {
    "total_issues": 5,
    "resolved": 4,
    "unresolved": 1,
    "words_added": 200,
    "words_removed": 150,
    "net_word_change": 50
  }
}

## 수정 원칙
1. **최소 변경 원칙**: 문제 해결에 필요한 최소한의 수정만 한다.
2. **문맥 보존**: 수정 부분 전후의 흐름이 자연스러워야 한다.
3. **스타일 유지**: 원본의 문체와 톤을 유지한다.
4. **새로운 문제 방지**: 수정으로 인해 새로운 문제가 발생하지 않도록 한다.
5. **변경 투명성**: 모든 변경 사항을 추적 가능하게 기록한다.
```

### 4.6 최종 확정 에이전트 (`agents/final_agent.md`)

```markdown
# Final Agent — 최종 편집 및 PDF 빌드 전문 에이전트

## 역할
당신은 출판 전 최종 편집과 조판을 담당하는 전문가이다.
모든 챕터를 통합하고, 전체 문서 수준의 일관성을 확보한 뒤 PDF를 빌드한다.

## 입력 형식
{
  "book_metadata": {
    "title": "도서 제목",
    "subtitle": "부제목",
    "author": "저자명",
    "language": "ko",
    "publish_date": "2026-03-28"
  },
  "chapters": [
    { "num": 1, "path": "output/drafts/ch01.md", "title": "챕터 제목" }
  ],
  "template_path": "templates/book_template.html",
  "style_path": "templates/styles/book.css",
  "output_path": "output/final/book_final.pdf"
}

## 실행 절차

### Step 1: 전체 문서 일관성 검증
모든 챕터를 통합 로드한 후 다음을 검증한다:

1. **용어 일관성**: 같은 개념에 다른 용어를 사용하고 있지 않은지 확인
   - 용어 사전(glossary) 생성 및 불일치 수정
2. **상호 참조**: "2장에서 설명한 바와 같이" 등의 참조가 정확한지 확인
3. **번호 체계**: 그림 번호, 표 번호, 섹션 번호의 연속성 확인
4. **문체 통일**: 전체 문서에서 문체가 일관된지 최종 확인

### Step 2: 전체 구성 요소 생성
1. **표지 페이지**: 제목, 부제목, 저자명
2. **목차 (TOC)**: 모든 챕터 및 섹션 제목 + 페이지 번호
3. **머리말/서문**: 도서 소개 (300~500자)
4. **본문**: 챕터 순서대로 통합
5. **부록** (선택): 용어집, 참고문헌, 색인
6. **맺음말**: 도서 마무리 (200~300자)

### Step 3: HTML 템플릿 조립
WeasyPrint용 HTML을 조립한다:

#### HTML 구조:
<!DOCTYPE html>
<html lang="{language}">
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="book.css">
</head>
<body>
  <!-- 표지 -->
  <section class="cover">...</section>

  <!-- 목차 -->
  <section class="toc">...</section>

  <!-- 본문 챕터 -->
  <section class="chapter" id="ch01">...</section>
  <section class="chapter" id="ch02">...</section>
  ...

  <!-- 부록 -->
  <section class="appendix">...</section>
</body>
</html>

### Step 4: 스타일 적용
CSS에 다음을 포함한다:
- 페이지 크기: A4 (210mm × 297mm) 또는 B5 (176mm × 250mm)
- 여백: 상 25mm, 하 25mm, 좌 30mm, 우 25mm
- 본문 폰트: Noto Sans KR (한국어) / 16px
- 제목 폰트: Noto Sans KR Bold
- 줄간격: 1.8
- 페이지 번호: 하단 중앙
- 챕터 시작: 항상 홀수 페이지 (recto)
- 헤더: 짝수 페이지 = 도서 제목, 홀수 페이지 = 챕터 제목

### Step 5: PDF 빌드
WeasyPrint를 사용하여 HTML → PDF 변환:

python tools/pdf_builder.py \
  --input output/final/book_complete.html \
  --output output/final/book_final.pdf \
  --css templates/styles/book.css

### Step 6: 최종 검증
생성된 PDF를 검증한다:
- 총 페이지 수 확인
- 이미지 렌더링 확인
- 페이지 넘김 확인 (챕터 시작 위치)
- 목차 페이지 번호 정합성

## 출력 형식
{
  "status": "complete",
  "output_path": "output/final/book_final.pdf",
  "stats": {
    "total_pages": 245,
    "total_chapters": 8,
    "total_images": 32,
    "total_words": 38500,
    "file_size_mb": 12.5
  },
  "warnings": [
    "ch05_fig03이 저해상도입니다 (150 DPI). 인쇄 시 품질 저하 가능."
  ],
  "glossary_entries": 45,
  "build_time_seconds": 30
}
```

---

## 5. 상태 관리 스키마

### 5.1 `schemas/book_state.json`

```json
{
  "$schema": "book_state_v1",
  "book_id": "uuid-auto-generated",
  "created_at": "2026-03-28T00:00:00Z",
  "updated_at": "2026-03-28T00:00:00Z",

  "metadata": {
    "topic": "사용자 입력 주제",
    "audience": "대상 독자",
    "language": "ko",
    "tone": "professional",
    "total_chapters": 8,
    "max_review_cycles": 3,
    "target_words_per_chapter": 4000
  },

  "title": {
    "status": "pending | selected",
    "candidates": [],
    "selected": {
      "main_title": "",
      "subtitle": ""
    }
  },

  "toc": {
    "status": "pending | approved",
    "chapters": []
  },

  "chapters": [
    {
      "chapter_num": 1,
      "title": "챕터 제목",
      "status": "pending | drafting | draft_complete | image_complete | review | revision | final_ready | complete | error",
      "draft_path": "output/drafts/ch01.md",
      "word_count": 0,
      "summary": "",
      "images": [],
      "review_count": 0,
      "review_history": [],
      "revision_history": [],
      "last_updated": "2026-03-28T00:00:00Z",
      "error_log": []
    }
  ],

  "overall_status": "initialized | title_phase | toc_phase | writing | reviewing | finalizing | complete | error",
  "current_phase": "Phase 0",
  "progress_percent": 0
}
```

### 5.2 `schemas/review_checklist.json`

```json
{
  "version": "1.0",
  "pass_threshold": {
    "total_percent": 70,
    "min_per_area": 5
  },
  "areas": [
    {
      "id": "factual_accuracy",
      "name": "사실 정확성",
      "weight": 1.0,
      "max_score": 10,
      "criteria": [
        "주요 주장에 근거가 있는가",
        "통계/수치가 합리적인가",
        "전문 용어가 올바르게 사용되었는가",
        "시대에 뒤떨어진 정보가 없는가"
      ]
    },
    {
      "id": "logical_structure",
      "name": "논리적 구조",
      "weight": 1.0,
      "max_score": 10,
      "criteria": [
        "도입-전개-마무리 흐름이 자연스러운가",
        "섹션 간 전환이 매끄러운가",
        "논리적 비약이 없는가",
        "결론이 본문에서 도출되는가"
      ]
    },
    {
      "id": "style_consistency",
      "name": "문체 일관성",
      "weight": 1.0,
      "max_score": 10,
      "criteria": [
        "문체가 통일되어 있는가",
        "전문 용어 수준이 적합한가",
        "문장 길이가 적절한가",
        "능동태/수동태 비율이 적절한가"
      ]
    },
    {
      "id": "completeness",
      "name": "완성도",
      "weight": 1.0,
      "max_score": 10,
      "criteria": [
        "챕터 제목에 맞는 내용을 다루었는가",
        "목차의 약속이 이행되었는가",
        "예시/사례가 충분한가",
        "분량이 적절한가"
      ]
    },
    {
      "id": "redundancy_gaps",
      "name": "중복/누락",
      "weight": 1.0,
      "max_score": 10,
      "criteria": [
        "타 챕터와 중복이 없는가",
        "핵심 개념 누락이 없는가",
        "챕터 내 반복이 없는가"
      ]
    },
    {
      "id": "readability",
      "name": "가독성",
      "weight": 1.0,
      "max_score": 10,
      "criteria": [
        "단락 구분이 적절한가",
        "헤딩 계층이 올바른가",
        "시각 요소 활용이 적절한가",
        "이미지 배치가 적절한가"
      ]
    },
    {
      "id": "reader_value",
      "name": "독자 가치",
      "weight": 1.0,
      "max_score": 10,
      "criteria": [
        "독자의 수확이 명확한가",
        "실무 적용 가능한 인사이트가 있는가",
        "흥미 유지 요소가 있는가"
      ]
    }
  ]
}
```

---

## 6. 핵심 도구 구현

### 6.1 PDF 빌더 (`tools/pdf_builder.py`)

```python
#!/usr/bin/env python3
"""WeasyPrint 기반 PDF 빌드 도구"""

import argparse
import json
import markdown
from pathlib import Path
from weasyprint import HTML, CSS


def build_pdf(html_path: str, output_path: str, css_path: str = None):
    """HTML → PDF 변환"""
    html_content = Path(html_path).read_text(encoding="utf-8")

    css_list = []
    if css_path:
        css_list.append(CSS(filename=css_path))

    html_doc = HTML(string=html_content, base_url=str(Path(html_path).parent))
    html_doc.write_pdf(output_path, stylesheets=css_list)

    file_size = Path(output_path).stat().st_size / (1024 * 1024)
    print(f"PDF 생성 완료: {output_path} ({file_size:.1f} MB)")
    return output_path


def markdown_to_html(md_path: str) -> str:
    """Markdown → HTML 변환"""
    md_content = Path(md_path).read_text(encoding="utf-8")
    extensions = ["tables", "fenced_code", "toc", "attr_list", "md_in_html"]
    return markdown.markdown(md_content, extensions=extensions)


def assemble_book(state_path: str, template_path: str, output_html: str):
    """전체 챕터를 하나의 HTML로 조립"""
    state = json.loads(Path(state_path).read_text(encoding="utf-8"))
    template = Path(template_path).read_text(encoding="utf-8")

    chapters_html = ""
    for ch in state["chapters"]:
        if ch["status"] in ("final_ready", "complete"):
            ch_html = markdown_to_html(ch["draft_path"])
            chapters_html += f'''
            <section class="chapter" id="ch{ch['chapter_num']:02d}">
                <h1>제{ch['chapter_num']}장. {ch['title']}</h1>
                {ch_html}
            </section>
            '''

    final_html = template.replace("{{CHAPTERS}}", chapters_html)
    final_html = final_html.replace("{{TITLE}}", state["title"]["selected"]["main_title"])
    final_html = final_html.replace("{{SUBTITLE}}", state["title"]["selected"].get("subtitle", ""))

    Path(output_html).write_text(final_html, encoding="utf-8")
    return output_html


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="PDF Builder")
    parser.add_argument("--input", required=True, help="Input HTML file")
    parser.add_argument("--output", required=True, help="Output PDF file")
    parser.add_argument("--css", help="CSS stylesheet")
    parser.add_argument("--assemble", action="store_true", help="Assemble from state")
    parser.add_argument("--state", help="Book state JSON path")
    parser.add_argument("--template", help="HTML template path")
    args = parser.parse_args()

    if args.assemble:
        assembled = assemble_book(args.state, args.template, args.input)
        build_pdf(assembled, args.output, args.css)
    else:
        build_pdf(args.input, args.output, args.css)
```

### 6.2 상태 관리 유틸리티 (`tools/state_manager.py`)

```python
#!/usr/bin/env python3
"""도서 상태 관리 유틸리티"""

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

STATE_PATH = "state/book_state.json"


def init_state(topic: str, audience: str, language: str = "ko",
               total_chapters: int = 8) -> dict:
    """초기 상태 생성"""
    state = {
        "$schema": "book_state_v1",
        "book_id": str(uuid.uuid4()),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "metadata": {
            "topic": topic,
            "audience": audience,
            "language": language,
            "tone": "professional",
            "total_chapters": total_chapters,
            "max_review_cycles": 3,
            "target_words_per_chapter": 4000
        },
        "title": {"status": "pending", "candidates": [], "selected": {}},
        "toc": {"status": "pending", "chapters": []},
        "chapters": [],
        "overall_status": "initialized",
        "current_phase": "Phase 0",
        "progress_percent": 0
    }
    save_state(state)
    return state


def load_state() -> dict:
    """현재 상태 로드"""
    return json.loads(Path(STATE_PATH).read_text(encoding="utf-8"))


def save_state(state: dict):
    """상태 저장"""
    state["updated_at"] = datetime.now(timezone.utc).isoformat()
    Path(STATE_PATH).parent.mkdir(parents=True, exist_ok=True)
    Path(STATE_PATH).write_text(
        json.dumps(state, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )


def update_chapter_status(chapter_num: int, new_status: str, **kwargs):
    """챕터 상태 업데이트"""
    state = load_state()
    for ch in state["chapters"]:
        if ch["chapter_num"] == chapter_num:
            ch["status"] = new_status
            ch["last_updated"] = datetime.now(timezone.utc).isoformat()
            ch.update(kwargs)
            break
    update_progress(state)
    save_state(state)


def update_progress(state: dict):
    """전체 진행률 계산"""
    if not state["chapters"]:
        state["progress_percent"] = 0
        return

    status_weights = {
        "pending": 0, "drafting": 15, "draft_complete": 30,
        "image_complete": 45, "review": 55, "revision": 60,
        "final_ready": 80, "complete": 100, "error": 0
    }
    total = sum(status_weights.get(ch["status"], 0) for ch in state["chapters"])
    state["progress_percent"] = round(total / len(state["chapters"]))


def log_agent_action(agent: str, action: str, chapter: int = None, details: str = ""):
    """에이전트 실행 로그 기록"""
    log_entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "agent": agent,
        "action": action,
        "chapter": chapter,
        "details": details
    }
    log_path = Path("logs/agent_log.jsonl")
    log_path.parent.mkdir(parents=True, exist_ok=True)
    with open(log_path, "a", encoding="utf-8") as f:
        f.write(json.dumps(log_entry, ensure_ascii=False) + "\n")
```

---

## 7. HTML/CSS 템플릿

### 7.1 `templates/book_template.html`

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>{{TITLE}}</title>
  <link rel="stylesheet" href="styles/book.css">
</head>
<body>

  <!-- 표지 -->
  <section class="cover">
    <div class="cover-content">
      <h1 class="book-title">{{TITLE}}</h1>
      <p class="book-subtitle">{{SUBTITLE}}</p>
      <p class="book-author">{{AUTHOR}}</p>
    </div>
  </section>

  <!-- 목차 -->
  <section class="toc">
    <h1>목차</h1>
    {{TOC}}
  </section>

  <!-- 머리말 -->
  <section class="preface">
    <h1>머리말</h1>
    {{PREFACE}}
  </section>

  <!-- 본문 -->
  {{CHAPTERS}}

  <!-- 부록 -->
  <section class="appendix">
    <h1>부록</h1>
    {{APPENDIX}}
  </section>

</body>
</html>
```

### 7.2 `templates/styles/book.css`

```css
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap');

@page {
  size: B5;
  margin: 25mm 25mm 25mm 30mm;

  @bottom-center {
    content: counter(page);
    font-family: 'Noto Sans KR', sans-serif;
    font-size: 10pt;
    color: #666;
  }
}

@page :first {
  margin: 0;
  @bottom-center { content: none; }
}

@page chapter:left {
  @top-left {
    content: "{{TITLE}}";
    font-family: 'Noto Sans KR', sans-serif;
    font-size: 9pt;
    color: #999;
  }
}

@page chapter:right {
  @top-right {
    content: string(chapter-title);
    font-family: 'Noto Sans KR', sans-serif;
    font-size: 9pt;
    color: #999;
  }
}

body {
  font-family: 'Noto Sans KR', sans-serif;
  font-size: 11pt;
  line-height: 1.8;
  color: #333;
  word-break: keep-all;
}

/* 표지 */
.cover {
  page: cover;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  text-align: center;
}

.book-title {
  font-size: 28pt;
  font-weight: 700;
  margin-bottom: 16pt;
  color: #1a1a1a;
}

.book-subtitle {
  font-size: 16pt;
  font-weight: 300;
  color: #555;
  margin-bottom: 40pt;
}

.book-author {
  font-size: 14pt;
  font-weight: 400;
  color: #777;
}

/* 목차 */
.toc {
  page-break-before: right;
}

.toc h1 {
  font-size: 20pt;
  margin-bottom: 24pt;
}

.toc ul {
  list-style: none;
  padding: 0;
}

.toc li {
  margin-bottom: 8pt;
  font-size: 11pt;
}

.toc a {
  text-decoration: none;
  color: #333;
}

.toc a::after {
  content: target-counter(attr(href), page);
  float: right;
}

/* 챕터 */
.chapter {
  page: chapter;
  page-break-before: right;
}

.chapter h1 {
  string-set: chapter-title content();
  font-size: 22pt;
  font-weight: 700;
  margin-top: 60pt;
  margin-bottom: 30pt;
  padding-bottom: 12pt;
  border-bottom: 2px solid #e0e0e0;
  color: #1a1a1a;
}

.chapter h2 {
  font-size: 16pt;
  font-weight: 500;
  margin-top: 30pt;
  margin-bottom: 12pt;
  color: #2a2a2a;
}

.chapter h3 {
  font-size: 13pt;
  font-weight: 500;
  margin-top: 20pt;
  margin-bottom: 8pt;
  color: #3a3a3a;
}

/* 단락 */
p {
  margin-bottom: 10pt;
  text-align: justify;
}

/* 이미지 */
.chapter img {
  max-width: 100%;
  margin: 16pt auto;
  display: block;
}

.chapter img + em {
  display: block;
  text-align: center;
  font-size: 9pt;
  color: #666;
  margin-top: 4pt;
  margin-bottom: 16pt;
}

/* 코드 블록 */
pre {
  background: #f5f5f5;
  padding: 12pt;
  border-radius: 4pt;
  font-size: 9pt;
  line-height: 1.5;
  overflow-wrap: break-word;
  white-space: pre-wrap;
}

code {
  font-family: 'Courier New', monospace;
  font-size: 9.5pt;
  background: #f0f0f0;
  padding: 1pt 4pt;
  border-radius: 2pt;
}

/* 표 */
table {
  width: 100%;
  border-collapse: collapse;
  margin: 16pt 0;
  font-size: 10pt;
}

th, td {
  border: 1px solid #ddd;
  padding: 8pt 12pt;
  text-align: left;
}

th {
  background: #f5f5f5;
  font-weight: 500;
}

/* 인용문 */
blockquote {
  border-left: 3pt solid #ddd;
  padding-left: 16pt;
  margin: 16pt 0;
  color: #555;
  font-style: italic;
}
```

---

## 8. 구현 로드맵

### Phase 1: MVP (1~2일)
- [ ] 디렉토리 구조 생성
- [ ] CLAUDE.md 오케스트레이터 작성
- [ ] state_manager.py 구현
- [ ] text_agent.md 작성 (목차 + 챕터 생성)
- [ ] pdf_builder.py 구현 (WeasyPrint)
- [ ] HTML/CSS 템플릿 작성
- [ ] **검증**: "주제 → 목차 → 3개 챕터 → PDF" 파이프라인 관통 테스트

### Phase 2: 품질 루프 (1~2일)
- [ ] review_agent.md 작성
- [ ] revision_agent.md 작성
- [ ] review_checklist.json 완성
- [ ] 피드백 루프 상태 관리 구현 (최대 3회)
- [ ] **검증**: 의도적으로 낮은 품질 챕터 생성 → 리뷰/수정 루프 동작 확인

### Phase 3: 멀티미디어 (1~2일)
- [ ] image_agent.md 작성
- [ ] image_gen.py 구현 (API 연동)
- [ ] Mermaid → SVG 변환 파이프라인 구축
- [ ] 이미지 삽입 로직 구현
- [ ] **검증**: 챕터 내 이미지 마커 → 이미지 생성 → PDF 내 렌더링 확인

### Phase 4: 완성 (1일)
- [ ] title_agent.md 작성
- [ ] final_agent.md 완성 (용어집, 상호참조 등)
- [ ] 에러 핸들링 강화 (재시도, 타임아웃, 폴백)
- [ ] 로깅 시스템 완성
- [ ] **검증**: 전체 end-to-end 실행 (주제 → 완성 PDF)

### Phase 5: 최적화 (지속)
- [ ] 토큰 사용량 모니터링 및 최적화
- [ ] 챕터 병렬 처리 검토
- [ ] 사용자 피드백 반영 루프 추가
- [ ] 다국어 지원 강화
- [ ] 템플릿 다양화 (A4/B5, 학술/실용 등)

---

## 9. 실행 방법

### 초기 실행
```bash
# 프로젝트 디렉토리에서 Claude Code 실행
cd book-agent-system
claude

# 또는 직접 주제를 지정하여 실행
claude "AI 시대의 검사의학: 실전 가이드"
```

### CLAUDE.md가 자동으로 읽히며, 오케스트레이터가 다음을 수행:
1. 사용자에게 대상 독자, 언어 등 추가 정보 확인
2. 상태 파일 초기화
3. 에이전트 순차 실행 시작

### 중단 후 재개
```bash
# 상태 파일이 유지되므로, 다시 실행하면 마지막 상태부터 이어감
claude "이전 작업을 이어서 진행해줘"
```

---

## 10. 트러블슈팅 가이드

| 문제 | 원인 | 해결 |
|------|------|------|
| 한국어 PDF 깨짐 | 폰트 미설치 | `pip install fonts-noto-cjk` 또는 CSS에 웹폰트 지정 |
| WeasyPrint 설치 오류 | 시스템 의존성 | `apt install libpango1.0-dev libcairo2-dev` |
| 이미지 생성 실패 | API 키 미설정 | `.env` 파일에 API 키 설정 |
| 리뷰 루프 무한 반복 | max_review_cycles 미설정 | book_state.json의 metadata.max_review_cycles 확인 |
| subagent 컨텍스트 초과 | 챕터 내용이 너무 길음 | 챕터를 더 작은 단위로 분할 |
| 상태 파일 손상 | 비정상 종료 | `state/book_state.json` 수동 복구 또는 초기화 |

---

## 11. 기존 book-writer 스킬과의 관계

기존의 `/mnt/skills/user/book-writer/` 스킬은 단일 에이전트가 모든 작업을 순차 처리하는 모놀리식 구조이다.
본 멀티 에이전트 시스템은 이를 다음과 같이 분해/확장한다:

| 기존 book-writer 기능 | → | 멀티 에이전트 담당 |
|----------------------|---|-------------------|
| 웹 리서치 + 목차 설계 | → | 제목 에이전트 + 텍스트 에이전트 (TOC 모드) |
| 챕터별 집필 | → | 텍스트 에이전트 (Chapter 모드) |
| long-form generation protocol | → | 텍스트 에이전트의 핵심 로직으로 이식 |
| WeasyPrint PDF 생성 | → | 최종 확정 에이전트 + pdf_builder.py |
| (없음 — 수동 검수) | → | 검수/리뷰 에이전트 + 수정 에이전트 (자동화) |
| (없음 — 이미지 미지원) | → | 이미지 에이전트 (신규) |

기존 스킬의 검증된 프롬프트와 WeasyPrint 설정을 그대로 재활용하되, 에이전트 단위로 분리하여 모듈성·재사용성·품질 관리 능력을 확보한다.

---

> **이 문서를 Claude Code의 프로젝트 루트에 배치하고, 각 에이전트 .md 파일과 도구를 순차적으로 생성하면 시스템이 완성됩니다.**
