# 📖 Story Teller

AI 기반 이야기 생성 플랫폼 - OpenAI GPT를 활용한 창의적인 수필 작성 도구

## ✨ 주요 기능

- 🤖 **AI 이야기 생성**: OpenAI GPT 모델을 활용한 고품질 수필 작성
- 🔒 **보안 강화**: 서버 사이드 API 키 관리로 안전한 운영
- 🎨 **모던 UI/UX**: 다크 모드 지원 및 반응형 디자인
- ⚡ **성능 최적화**: Rate limiting 및 요청 타임아웃 관리
- 📋 **편의 기능**: 원클릭 복사, 글자 수 카운팅

## 🏗️ 아키텍처

### 개선된 프로젝트 구조

```
story-teller/
├── client/                 # 프론트엔드
│   ├── index.html         # 메인 HTML
│   ├── css/
│   │   └── style.css      # 스타일시트
│   └── js/
│       └── app.js         # 클라이언트 로직
├── server/                 # 백엔드
│   ├── index.js           # Express 서버
│   └── routes/
│       └── api.js         # API 라우트
├── .env.example           # 환경 변수 예시
├── .gitignore
├── package.json
└── README.md
```

### 기술 스택

**Frontend**
- HTML5, CSS3, Vanilla JavaScript
- Google Fonts (Merriweather, Outfit)
- Modern ES6+ features

**Backend**
- Node.js + Express.js
- OpenAI API
- CORS, dotenv

## 🚀 시작하기

### 1. 사전 요구사항

- Node.js 18.0.0 이상
- npm 9.0.0 이상
- OpenAI API 키

### 2. 설치

```bash
# 의존성 설치
npm install
```

### 3. 환경 변수 설정

`.env` 파일을 생성하고 다음 내용을 추가하세요:

```bash
# .env.example을 복사
cp .env.example .env

# .env 파일 편집
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
PORT=3000
NODE_ENV=development
```

**사용 가능한 모델**:
- `gpt-4o` - 최신 고성능 모델
- `gpt-4o-mini` - 빠르고 경제적 (권장)
- `gpt-4-turbo` - 고성능 모델
- `gpt-3.5-turbo` - 빠른 응답

### 4. 서버 실행

```bash
# 프로덕션 모드
npm start

# 개발 모드 (nodemon)
npm run dev
```

### 5. 접속

브라우저에서 `http://localhost:3000` 접속

## 🔒 보안 기능

### v1.0 → v2.0 보안 개선 사항

| 항목 | v1.0 (이전) | v2.0 (현재) |
|------|------------|------------|
| **API 키 관리** | ❌ 클라이언트 노출 | ✅ 서버 사이드 보호 |
| **XSS 방지** | ❌ innerHTML 사용 | ✅ textContent 사용 |
| **입력 검증** | ⚠️ 기본적 | ✅ 서버/클라이언트 이중 검증 |
| **Rate Limiting** | ❌ 없음 | ✅ 분당 10회 제한 |
| **에러 처리** | ⚠️ 기본적 | ✅ 상세한 에러 핸들링 |
| **타임아웃** | ❌ 없음 | ✅ 60초 요청 타임아웃 |

### 보안 기능 상세

1. **API 키 보호**
   - 환경 변수로 서버에서만 관리
   - 클라이언트에 노출되지 않음

2. **입력 검증**
   - 클라이언트: 길이 및 형식 검증
   - 서버: 타입, 길이, 빈 값 검증

3. **XSS 방지**
   - `textContent` 사용으로 스크립트 실행 차단
   - 사용자 입력 이스케이프 처리

4. **Rate Limiting**
   - IP 기반 분당 10회 요청 제한
   - DoS 공격 방지

## 📡 API 엔드포인트

### `POST /api/generate-story`

이야기 생성 요청

**Request Body**
```json
{
  "topic": "비 오는 날 편의점에서 마주친 첫사랑"
}
```

**Response (Success)**
```json
{
  "success": true,
  "story": "생성된 이야기 내용...",
  "usage": {
    "prompt_tokens": 45,
    "completion_tokens": 512,
    "total_tokens": 557
  }
}
```

**Response (Error)**
```json
{
  "error": "Validation Error",
  "message": "Topic is required and must be a string"
}
```

### `GET /api/health`

서버 상태 확인

**Response**
```json
{
  "status": "ok",
  "timestamp": "2026-01-06T...",
  "apiKeyConfigured": true
}
```

## 🎨 사용자 인터페이스

### 주요 UI 컴포넌트

1. **서버 상태 배지**
   - 실시간 서버 연결 상태 표시
   - API 키 설정 여부 확인

2. **주제 입력 영역**
   - 실시간 글자 수 카운팅
   - 최대 500자 제한

3. **이야기 생성 버튼**
   - 로딩 스피너 표시
   - 비활성화 상태 관리

4. **결과 표시 영역**
   - 수필 형식의 타이포그래피
   - 원클릭 복사 기능

### 다크 모드

시스템 테마 설정에 따라 자동 전환

## 🛠️ 개발 가이드

### 코드 구조

**클라이언트 (app.js)**
```javascript
// 모듈화된 구조
- utils: 유틸리티 함수
- apiService: API 통신
- uiController: UI 업데이트
- eventHandlers: 이벤트 처리
```

**서버 (server/routes/api.js)**
```javascript
// 미들웨어 기반 구조
- validateApiKey: API 키 검증
- rateLimiter: 요청 제한
- 라우트 핸들러: 비즈니스 로직
```

### 커스터마이징

**모델 변경**
```bash
# .env 파일
OPENAI_MODEL=gpt-4o  # 더 강력한 모델로 변경
```

**Rate Limit 조정**
```javascript
// server/routes/api.js
const RATE_LIMIT = 20;  // 분당 20회로 증가
```

**UI 색상 변경**
```css
/* client/css/style.css */
:root {
  --primary-gradient: linear-gradient(135deg, #your-color 0%, #your-color 100%);
}
```

## 🚨 트러블슈팅

### 문제: "API Key Missing" 오류

**해결방법**:
1. `.env` 파일이 프로젝트 루트에 있는지 확인
2. `OPENAI_API_KEY` 값이 올바른지 확인
3. 서버 재시작

### 문제: "Model not found" 오류

**해결방법**:
- `.env`의 `OPENAI_MODEL`을 유효한 모델명으로 변경
- 권장: `gpt-4o-mini`

### 문제: Rate Limit 초과

**해결방법**:
- 1분 후 재시도
- 개발 환경: `server/routes/api.js`에서 제한 완화

## 📝 라이선스

MIT License

## 🤝 기여

이슈 및 PR 환영합니다!

## 📞 문의

프로젝트 관련 문의사항은 이슈로 남겨주세요.

---

**v2.0 변경사항**
- ✅ 프론트엔드/백엔드 분리
- ✅ 보안 강화 (API 키 보호, XSS 방지)
- ✅ Rate limiting 구현
- ✅ 모듈화된 코드 구조
- ✅ 개선된 에러 처리
- ✅ 실제 사용 가능한 GPT 모델
- ✅ 상세한 문서화
