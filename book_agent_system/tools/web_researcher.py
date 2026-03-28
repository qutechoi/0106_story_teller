#!/usr/bin/env python3
"""웹 리서치 유틸리티

이 모듈은 Claude Code의 WebSearch/WebFetch 도구를 활용하여
도서 집필에 필요한 리서치를 수행하는 헬퍼 함수들을 제공한다.

실제 웹 검색은 Claude Code의 에이전트가 수행하며,
이 유틸리티는 검색 결과를 구조화하고 저장하는 역할을 한다.
"""

import json
from datetime import datetime, timezone
from pathlib import Path


def save_research_result(topic: str, results: list, output_dir: str = "output/research"):
    """리서치 결과를 JSON 파일로 저장한다."""
    Path(output_dir).mkdir(parents=True, exist_ok=True)

    filename = topic.replace(" ", "_")[:50]
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    output_path = f"{output_dir}/{filename}_{timestamp}.json"

    research_data = {
        "topic": topic,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "results_count": len(results),
        "results": results
    }

    Path(output_path).write_text(
        json.dumps(research_data, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )
    return output_path


def format_research_for_agent(results: list) -> str:
    """리서치 결과를 에이전트가 참고할 수 있는 텍스트 형태로 변환한다."""
    formatted = []
    for i, result in enumerate(results, 1):
        entry = f"[{i}] {result.get('title', 'N/A')}\n"
        entry += f"    URL: {result.get('url', 'N/A')}\n"
        entry += f"    요약: {result.get('summary', 'N/A')}\n"
        formatted.append(entry)
    return "\n".join(formatted)


def create_research_prompt(topic: str, audience: str, language: str = "ko") -> str:
    """주제에 맞는 웹 리서치 프롬프트를 생성한다."""
    return f"""다음 주제에 대해 웹 리서치를 수행해주세요:

주제: {topic}
대상 독자: {audience}
언어: {language}

조사 항목:
1. 해당 주제의 최신 트렌드와 주요 논점
2. 관련 도서/자료 목록
3. 핵심 전문가/저자
4. 주요 통계와 데이터
5. 대상 독자가 가장 관심 가질 만한 세부 주제

결과를 구조화된 JSON 형식으로 정리해주세요."""
