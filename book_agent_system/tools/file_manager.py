#!/usr/bin/env python3
"""파일 I/O 유틸리티"""

import json
import shutil
from pathlib import Path


def ensure_directories():
    """프로젝트에 필요한 디렉토리 구조를 생성한다."""
    dirs = [
        "agents",
        "schemas",
        "templates/styles",
        "tools",
        "output/drafts/img",
        "output/final",
        "state",
        "logs"
    ]
    for d in dirs:
        Path(d).mkdir(parents=True, exist_ok=True)
    return True


def read_json(path: str) -> dict:
    """JSON 파일을 읽어 딕셔너리로 반환한다."""
    return json.loads(Path(path).read_text(encoding="utf-8"))


def write_json(path: str, data: dict):
    """딕셔너리를 JSON 파일로 저장한다."""
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )


def read_markdown(path: str) -> str:
    """Markdown 파일을 읽어 문자열로 반환한다."""
    return Path(path).read_text(encoding="utf-8")


def write_markdown(path: str, content: str):
    """문자열을 Markdown 파일로 저장한다."""
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(content, encoding="utf-8")


def backup_file(path: str) -> str:
    """파일을 백업한다. 백업 파일 경로를 반환한다."""
    src = Path(path)
    if not src.exists():
        return None
    backup_path = str(src) + ".bak"
    shutil.copy2(str(src), backup_path)
    return backup_path


def list_chapter_files(drafts_dir: str = "output/drafts") -> list:
    """드래프트 디렉토리의 챕터 파일 목록을 반환한다."""
    drafts = Path(drafts_dir)
    if not drafts.exists():
        return []
    return sorted([
        str(f) for f in drafts.glob("ch*.md")
    ])


def get_file_size_mb(path: str) -> float:
    """파일 크기를 MB 단위로 반환한다."""
    return Path(path).stat().st_size / (1024 * 1024)


def count_words(text: str, language: str = "ko") -> int:
    """텍스트의 단어 수를 계산한다."""
    if language == "ko":
        # 한국어: 공백 기준 어절 수
        return len(text.split())
    else:
        # 영어: 단어 수
        return len(text.split())


if __name__ == "__main__":
    ensure_directories()
    print("디렉토리 구조 생성 완료")
