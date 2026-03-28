#!/usr/bin/env python3
"""이미지 생성 API 래퍼"""

import json
import re
from pathlib import Path


def parse_image_markers(chapter_content: str) -> list:
    """챕터 본문에서 이미지 마커를 추출한다."""
    pattern = r'<!-- IMAGE: \{(.*?)\} -->'
    markers = []
    for i, match in enumerate(re.finditer(pattern, chapter_content), 1):
        try:
            marker_text = "{" + match.group(1) + "}"
            # Simple parsing for description and type
            desc_match = re.search(r'description:\s*"([^"]*)"', marker_text)
            type_match = re.search(r'type:\s*"([^"]*)"', marker_text)
            markers.append({
                "index": i,
                "description": desc_match.group(1) if desc_match else "",
                "type": type_match.group(1) if type_match else "illustration",
                "original_marker": match.group(0),
                "position": match.start()
            })
        except (json.JSONDecodeError, AttributeError):
            continue
    return markers


def generate_mermaid_diagram(description: str, output_path: str) -> str:
    """Mermaid 다이어그램 코드를 생성한다."""
    # Mermaid 코드를 .mmd 파일로 저장
    mmd_path = output_path.replace(".png", ".mmd")
    mermaid_code = f"""graph TD
    A["{description}"] --> B["단계 1"]
    B --> C["단계 2"]
    C --> D["완료"]
"""
    Path(mmd_path).write_text(mermaid_code, encoding="utf-8")
    return mmd_path


def generate_placeholder(description: str, image_type: str, output_path: str) -> str:
    """이미지 생성 실패 시 placeholder SVG를 생성한다."""
    svg_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#f5f5f5" stroke="#ddd" stroke-width="2"/>
  <text x="600" y="380" text-anchor="middle" font-family="sans-serif" font-size="24" fill="#999">
    [{image_type}]
  </text>
  <text x="600" y="420" text-anchor="middle" font-family="sans-serif" font-size="18" fill="#bbb">
    {description}
  </text>
</svg>"""
    svg_path = output_path.replace(".png", ".svg")
    Path(svg_path).parent.mkdir(parents=True, exist_ok=True)
    Path(svg_path).write_text(svg_content, encoding="utf-8")
    return svg_path


def replace_markers_with_images(chapter_content: str, chapter_num: int,
                                 images: list) -> str:
    """본문의 이미지 마커를 실제 이미지 참조로 교체한다."""
    result = chapter_content
    for img in images:
        old_marker = img["original_marker"]
        fig_num = img["index"]
        filename = img.get("filename", f"ch{chapter_num:02d}_fig{fig_num:02d}_{img['type']}.png")
        new_content = f"""![{img['description']}](img/{filename})
*그림 {chapter_num}-{fig_num}. {img['description']}*"""
        result = result.replace(old_marker, new_content)
    return result


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Image Generator")
    parser.add_argument("--chapter", required=True, help="Chapter markdown file")
    parser.add_argument("--chapter-num", type=int, required=True, help="Chapter number")
    parser.add_argument("--output-dir", default="output/drafts/img", help="Output directory")
    args = parser.parse_args()

    content = Path(args.chapter).read_text(encoding="utf-8")
    markers = parse_image_markers(content)
    print(f"Found {len(markers)} image markers in chapter {args.chapter_num}")
    for m in markers:
        print(f"  - [{m['type']}] {m['description']}")
