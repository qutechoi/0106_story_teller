#!/usr/bin/env python3
"""최종 PDF 빌드 스크립트 — 모든 챕터를 통합하여 PDF를 생성한다."""

import json
import markdown
from pathlib import Path

BASE = Path(__file__).parent.parent
DRAFTS = BASE / "output" / "drafts"
FINAL = BASE / "output" / "final"
TEMPLATES = BASE / "templates"
FINAL.mkdir(parents=True, exist_ok=True)

BOOK_TITLE = "내 머릿속 정리법"
BOOK_SUBTITLE = "옵시디언·노션·조플린으로 시작하는 디지털 노트 실전 가이드"
BOOK_AUTHOR = "Qute Choi (feat. Claude opus 4.6)"

TOC_DATA = json.loads((BASE / "output" / "toc.json").read_text(encoding="utf-8"))
STRUCTURE = TOC_DATA["book_structure"]
CHAPTERS = TOC_DATA["toc"]


def md_to_html(md_text: str) -> str:
    """마크다운을 HTML로 변환"""
    extensions = ["tables", "fenced_code", "toc", "attr_list", "md_in_html"]
    return markdown.markdown(md_text, extensions=extensions)


def build_toc_html() -> str:
    """목차 HTML 생성"""
    html = ""
    for part_key, part_info in STRUCTURE.items():
        part_name = part_info["name"]
        part_chapters = part_info["chapters"]
        part_label = part_key.replace("_", " ").upper()
        html += f'<p class="part-heading">{part_label} &mdash; {part_name}</p>\n<ul>\n'
        for ch_num in part_chapters:
            ch = next(c for c in CHAPTERS if c["chapter_num"] == ch_num)
            html += f'  <li><a href="#ch{ch_num:02d}">제{ch_num}장 &nbsp; {ch["title"]}</a></li>\n'
        html += '</ul>\n'
    return html


def build_preface() -> str:
    """머리말 생성"""
    return """<p>이 책은 디지털 노트 앱의 세계로 여러분을 안내하는 실전 가이드입니다.</p>
<p>우리는 매일 수많은 정보를 접하지만, 정작 그것을 정리하고 활용하는 방법은 배운 적이 없습니다.
종이 노트의 한계를 넘어, 디지털 도구의 힘을 빌려 생각을 체계적으로 정리하는 방법을 알려드리겠습니다.</p>
<p>옵시디언, 노션, 조플린 — 이 세 가지 앱은 각각 다른 철학과 강점을 가지고 있습니다.
어떤 앱이 '최고'인지를 따지기보다, 여러분의 상황과 성향에 맞는 앱을 찾고
그것을 제대로 활용하는 것이 이 책의 목표입니다.</p>
<p>기초부터 시작하여 활용법, 실전 시나리오, 그리고 나만의 지식 관리 시스템 설계까지 —
이 여정이 끝나면, 여러분의 머릿속이 한결 가벼워져 있을 것입니다.</p>
<p style="text-align:right; margin-top:30pt;">2026년 3월<br>저자 올림</p>"""


def build_chapters_html() -> str:
    """모든 챕터를 HTML로 변환"""
    html = ""
    for part_key, part_info in STRUCTURE.items():
        part_name = part_info["name"]
        # 파트 구분 페이지
        part_label = part_key.replace("_", " ").upper()
        html += f'''
<section class="part-divider">
  <div>
    <p class="part-label">{part_label}</p>
    <hr class="part-rule">
    <h1 class="part-title">{part_name}</h1>
  </div>
</section>
'''
        for ch_num in part_info["chapters"]:
            ch_path = DRAFTS / f"ch{ch_num:02d}.md"
            if not ch_path.exists():
                continue
            md_content = ch_path.read_text(encoding="utf-8")
            ch_html = md_to_html(md_content)

            # 이미지 경로를 절대 경로로 변환
            ch_html = ch_html.replace('src="img/', f'src="{DRAFTS}/img/')

            ch = next(c for c in CHAPTERS if c["chapter_num"] == ch_num)
            html += f'''
<section class="chapter" id="ch{ch_num:02d}">
  {ch_html}
</section>
'''
    return html


def build_appendix() -> str:
    """부록: 용어집"""
    terms = [
        ("마크다운 (Markdown)", "텍스트 기반의 경량 문서 작성 문법. #, *, [] 등의 기호로 서식을 지정합니다."),
        ("볼트 (Vault)", "옵시디언에서 노트를 저장하는 폴더 단위. 하나의 독립된 작업 공간입니다."),
        ("백링크 (Backlink)", "다른 노트에서 현재 노트를 링크한 역방향 참조. 지식의 연결을 추적합니다."),
        ("블록 (Block)", "노션의 기본 콘텐츠 단위. 텍스트, 이미지, 데이터베이스 등 모든 것이 블록입니다."),
        ("E2EE (End-to-End Encryption)", "발신자와 수신자만 내용을 볼 수 있는 종단간 암호화 방식."),
        ("PARA", "Projects, Areas, Resources, Archives — 티아고 포르테의 지식 관리 방법론."),
        ("제텔카스텐 (Zettelkasten)", "니클라스 루만이 고안한 메모 상자 기반 지식 관리 시스템."),
        ("세컨드 브레인 (Second Brain)", "외부 도구를 활용해 지식을 체계적으로 관리하는 '제2의 뇌' 개념."),
        ("그래프 뷰 (Graph View)", "옵시디언에서 노트 간의 연결을 시각화한 네트워크 그래프."),
        ("웹 클리퍼 (Web Clipper)", "브라우저 확장 프로그램으로 웹 페이지를 노트 앱에 바로 저장하는 도구."),
    ]
    html = "<dl>\n"
    for term, definition in sorted(terms, key=lambda x: x[0]):
        html += f"  <dt><strong>{term}</strong></dt>\n  <dd>{definition}</dd>\n"
    html += "</dl>"
    return html


def assemble_and_build():
    """전체 HTML 조립 및 PDF 빌드"""
    template = (TEMPLATES / "book_template.html").read_text(encoding="utf-8")

    # CSS를 inline으로 삽입 (WeasyPrint이 외부 CSS를 더 잘 처리하도록)
    css_content = (TEMPLATES / "styles" / "book.css").read_text(encoding="utf-8")
    # Remove Google Fonts import (won't work in PDF generation reliably)
    css_content = css_content.replace(
        "@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap');",
        "/* Google Fonts removed for PDF — using system font fallback */"
    )
    # Update header title placeholder
    css_content = css_content.replace("{{TITLE}}", BOOK_TITLE)

    # Build HTML
    html = template.replace("{{TITLE}}", BOOK_TITLE)
    html = html.replace("{{SUBTITLE}}", BOOK_SUBTITLE)
    html = html.replace("{{AUTHOR}}", BOOK_AUTHOR)
    html = html.replace("{{TOC}}", build_toc_html())
    html = html.replace("{{PREFACE}}", build_preface())
    html = html.replace("{{CHAPTERS}}", build_chapters_html())
    html = html.replace("{{APPENDIX}}", build_appendix())

    # Replace external CSS with inline
    html = html.replace(
        '<link rel="stylesheet" href="styles/book.css">',
        f'<style>\n{css_content}\n</style>'
    )

    # Save HTML
    html_path = FINAL / "book_complete.html"
    html_path.write_text(html, encoding="utf-8")
    print(f"HTML assembled: {html_path}")

    # Build PDF
    from weasyprint import HTML as WHTML
    pdf_path = FINAL / "book_final.pdf"
    print("Building PDF with WeasyPrint...")
    doc = WHTML(string=html, base_url=str(DRAFTS))
    doc.write_pdf(str(pdf_path))

    file_size = pdf_path.stat().st_size / (1024 * 1024)
    print(f"\n✅ PDF 생성 완료!")
    print(f"   경로: {pdf_path}")
    print(f"   크기: {file_size:.1f} MB")


if __name__ == "__main__":
    assemble_and_build()
