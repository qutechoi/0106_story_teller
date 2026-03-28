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
