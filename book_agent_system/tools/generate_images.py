#!/usr/bin/env python3
"""matplotlib 기반 이미지 생성 스크립트
유료 API (Imagen, DALL-E, Gemini Image 등)는 사용하지 않는다.
모든 이미지는 matplotlib + Pillow로 로컬에서 생성한다.
"""

import json
import re
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import textwrap
from pathlib import Path

# 한글 폰트 설정
plt.rcParams['font.family'] = ['Apple SD Gothic Neo', 'NanumGothic', 'sans-serif']
plt.rcParams['axes.unicode_minus'] = False

# 퍼플 컬러 팔레트
COLORS = {
    'primary': '#7c3aed',
    'secondary': '#6d28d9',
    'light': '#c4b5fd',
    'bg': '#faf8ff',
    'bg_alt': '#f3f0ff',
    'text': '#2d2d2d',
    'text_light': '#666666',
    'accent1': '#9f7aea',
    'accent2': '#5b21b6',
    'green': '#10b981',
    'blue': '#3b82f6',
    'orange': '#f59e0b',
    'pink': '#ec4899',
}


def parse_image_markers(content: str) -> list:
    """챕터 본문에서 이미지 마커를 추출한다."""
    pattern = r'<!-- IMAGE: (\{.*?\}) -->'
    markers = []
    for i, match in enumerate(re.finditer(pattern, content), 1):
        try:
            data = json.loads(match.group(1))
            markers.append({
                "index": i,
                "description": data.get("description", ""),
                "type": data.get("type", "illustration"),
                "original_marker": match.group(0),
            })
        except json.JSONDecodeError:
            continue
    return markers


def generate_diagram(description: str, output_path: Path):
    """다이어그램/플로차트 이미지를 생성한다."""
    fig, ax = plt.subplots(1, 1, figsize=(12, 7))
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 7)
    ax.set_facecolor('#faf8ff')
    fig.patch.set_facecolor('white')

    # 제목
    wrapped_title = textwrap.fill(description, width=50)
    ax.text(6, 6.3, wrapped_title, ha='center', va='top', fontsize=12,
            color=COLORS['primary'], fontweight='bold')

    # 간단한 플로우 박스
    box_y = 3.5
    box_colors = [COLORS['primary'], COLORS['accent1'], COLORS['secondary'], COLORS['green']]
    labels = description.split(',')[:4] if ',' in description else ['단계 1', '단계 2', '단계 3', '결과']

    for i, (label, color) in enumerate(zip(labels, box_colors)):
        x = 1.5 + i * 2.8
        rect = patches.FancyBboxPatch((x - 1, box_y - 0.6), 2, 1.2,
                                       boxstyle="round,pad=0.1",
                                       facecolor=color, alpha=0.15,
                                       edgecolor=color, linewidth=2)
        ax.add_patch(rect)
        ax.text(x, box_y, textwrap.fill(label.strip(), width=10),
                ha='center', va='center', fontsize=9, color=COLORS['text'])
        if i < len(labels) - 1:
            ax.annotate('', xy=(x + 1.2, box_y), xytext=(x + 1.6, box_y),
                        arrowprops=dict(arrowstyle='->', color=COLORS['light'], lw=2))

    ax.axis('off')
    fig.savefig(output_path, dpi=150, bbox_inches='tight', facecolor='white')
    plt.close(fig)


def generate_chart(description: str, output_path: Path):
    """차트/비교표 이미지를 생성한다."""
    fig, ax = plt.subplots(1, 1, figsize=(12, 7))
    fig.patch.set_facecolor('white')

    # 제목
    wrapped_title = textwrap.fill(description, width=55)
    ax.set_title(wrapped_title, fontsize=12, color=COLORS['primary'],
                 fontweight='bold', pad=20)

    # 비교 바 차트 (기본)
    categories = ['기능 A', '기능 B', '기능 C', '기능 D', '기능 E']
    vals1 = [4, 3, 5, 4, 3]
    vals2 = [3, 5, 3, 4, 5]
    vals3 = [4, 4, 2, 5, 4]

    x = range(len(categories))
    width = 0.25
    ax.bar([i - width for i in x], vals1, width, label='옵시디언',
           color=COLORS['primary'], alpha=0.7)
    ax.bar(x, vals2, width, label='노션',
           color=COLORS['green'], alpha=0.7)
    ax.bar([i + width for i in x], vals3, width, label='조플린',
           color=COLORS['orange'], alpha=0.7)

    ax.set_ylabel('점수', fontsize=10, color=COLORS['text_light'])
    ax.set_xticks(x)
    ax.set_xticklabels(categories, fontsize=9)
    ax.legend(fontsize=9)
    ax.set_facecolor('#faf8ff')
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)

    fig.savefig(output_path, dpi=150, bbox_inches='tight', facecolor='white')
    plt.close(fig)


def generate_illustration(description: str, output_path: Path):
    """일러스트/인포그래픽 이미지를 생성한다."""
    fig, ax = plt.subplots(1, 1, figsize=(12, 7))
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 7)
    ax.set_facecolor('#faf8ff')
    fig.patch.set_facecolor('white')

    # 배경 장식 (노드 네트워크)
    import random
    random.seed(hash(description) % 2**32)
    nodes = [(random.uniform(1, 11), random.uniform(1, 6)) for _ in range(8)]
    for i, (nx, ny) in enumerate(nodes):
        circle = plt.Circle((nx, ny), 0.2 + random.random() * 0.3,
                           color=COLORS['light'], alpha=0.15)
        ax.add_patch(circle)
        if i > 0:
            px, py = nodes[i - 1]
            ax.plot([px, nx], [py, ny], color=COLORS['light'], alpha=0.1, linewidth=1)

    # 중앙 아이콘 영역
    center_rect = patches.FancyBboxPatch((3.5, 2), 5, 3,
                                          boxstyle="round,pad=0.3",
                                          facecolor='white', alpha=0.9,
                                          edgecolor=COLORS['primary'],
                                          linewidth=2)
    ax.add_patch(center_rect)

    # 타입 뱃지
    badge = patches.FancyBboxPatch((4.8, 4.2), 2.4, 0.5,
                                    boxstyle="round,pad=0.1",
                                    facecolor=COLORS['primary'], alpha=0.15,
                                    edgecolor=COLORS['primary'], linewidth=1)
    ax.add_patch(badge)
    ax.text(6, 4.45, 'ILLUSTRATION', ha='center', va='center',
            fontsize=9, color=COLORS['primary'], fontweight='bold')

    # 설명 텍스트
    wrapped = textwrap.fill(description, width=35)
    ax.text(6, 3.2, wrapped, ha='center', va='center', fontsize=10,
            color=COLORS['text'], linespacing=1.6)

    ax.axis('off')
    fig.savefig(output_path, dpi=150, bbox_inches='tight', facecolor='white')
    plt.close(fig)


def generate_image(description: str, img_type: str, output_path: Path):
    """이미지 유형에 따라 적절한 생성 함수를 호출한다."""
    output_path.parent.mkdir(parents=True, exist_ok=True)

    if img_type in ('diagram', 'flowchart'):
        generate_diagram(description, output_path)
    elif img_type in ('chart', 'infographic'):
        generate_chart(description, output_path)
    else:
        generate_illustration(description, output_path)


def replace_markers_with_images(chapter_content: str, chapter_num: int,
                                 images: list) -> str:
    """본문의 이미지 마커를 실제 이미지 참조로 교체한다."""
    result = chapter_content
    for img in images:
        old_marker = img["original_marker"]
        fig_num = img["index"]
        filename = f"ch{chapter_num:02d}_fig{fig_num:02d}_{img['type']}.png"
        new_content = f"![{img['description']}](img/{filename})\n*그림 {chapter_num}-{fig_num}. {img['description']}*"
        result = result.replace(old_marker, new_content)
    return result


def process_all_chapters():
    """모든 챕터의 이미지를 생성하고 마커를 교체한다."""
    img_dir = Path("output/drafts/img")
    img_dir.mkdir(parents=True, exist_ok=True)

    for ch_num in range(1, 12):
        ch_path = Path(f"output/drafts/ch{ch_num:02d}.md")
        if not ch_path.exists():
            continue

        content = ch_path.read_text(encoding='utf-8')
        markers = parse_image_markers(content)

        if not markers:
            print(f"Ch.{ch_num:02d}: No image markers")
            continue

        print(f"Ch.{ch_num:02d}: {len(markers)} images")
        for m in markers:
            filename = f"ch{ch_num:02d}_fig{m['index']:02d}_{m['type']}.png"
            output_path = img_dir / filename
            generate_image(m['description'], m['type'], output_path)
            print(f"  ✅ {filename}")

        updated = replace_markers_with_images(content, ch_num, markers)
        ch_path.write_text(updated, encoding='utf-8')


if __name__ == "__main__":
    process_all_chapters()
