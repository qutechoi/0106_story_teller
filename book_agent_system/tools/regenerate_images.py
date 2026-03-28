#!/usr/bin/env python3
"""이미지 재생성 스크립트 — matplotlib 전용
유료 API (Imagen, DALL-E, Gemini Image 등)는 사용하지 않는다.
"""

import re
from pathlib import Path
from generate_images import generate_image


def extract_image_info_from_chapters() -> list:
    """교체된 챕터 파일에서 이미지 정보를 추출한다."""
    images = []
    pattern = r'!\[([^\]]*)\]\(img/(ch\d+_fig\d+_\w+\.png)\)'

    for ch_num in range(1, 12):
        ch_path = Path(f"output/drafts/ch{ch_num:02d}.md")
        if not ch_path.exists():
            continue
        content = ch_path.read_text(encoding='utf-8')
        for match in re.finditer(pattern, content):
            desc = match.group(1)
            filename = match.group(2)
            img_type = filename.split('_')[-1].replace('.png', '')
            images.append({
                "chapter": ch_num,
                "description": desc,
                "filename": filename,
                "type": img_type,
                "path": Path("output/drafts/img") / filename
            })
    return images


def main():
    images = extract_image_info_from_chapters()
    print(f"Found {len(images)} images to regenerate (matplotlib only)\n")

    for i, img in enumerate(images, 1):
        print(f"[{i}/{len(images)}] {img['filename']}", end=" ")
        generate_image(img['description'], img['type'], img['path'])
        print("✅")

    print(f"\nDone: {len(images)} images regenerated with matplotlib")


if __name__ == "__main__":
    main()
