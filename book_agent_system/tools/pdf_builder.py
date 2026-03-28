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
