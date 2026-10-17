#!/usr/bin/env python3
"""Genera el PDF del documento de arquitectura a partir de los Markdown de docs/ y contract/.

Requisitos: Python 3.10+, `pip install markdown beautifulsoup4 weasyprint`; mermaid-cli (`mmdc`) con
un Chromium (variable PUPPETEER_EXECUTABLE_PATH); fuentes Poppins, TeX Gyre Pagella y DejaVu.
Uso:  python docs/arquitectura/tools/build_pdf.py [salida.pdf]
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
import unicodedata
from pathlib import Path

import markdown
from bs4 import BeautifulSoup
from weasyprint import HTML

REPO = Path(__file__).resolve().parents[3]
BUILD = Path(os.environ.get("BUILD_DIR", tempfile.gettempdir())) / "gia-arq-build"
MMDC = os.environ.get("MMDC", "mmdc")
CHROME = os.environ.get("PUPPETEER_EXECUTABLE_PATH")
VERSION, FECHA = "0.9", "28/09/2026"

# (archivo, cuántos niveles se bajan sus títulos)
SOURCES = [
    ("docs/arquitectura/README.md", 0),
    ("docs/arquitectura/01-introduccion-y-restricciones.md", 0),
    ("docs/arquitectura/02-contexto-y-estrategia.md", 0),
    ("docs/arquitectura/03-bloques-y-ejecucion.md", 0),
    ("docs/arquitectura/04-despliegue-y-conceptos.md", 0),
    ("docs/adr/README.md", 0),
    *[(f"docs/adr/{p.name}", 2) for p in sorted((REPO / "docs/adr").glob("00*.md"))],
    ("docs/arquitectura/05-calidad-y-riesgos.md", 0),
    ("docs/arquitectura/06-organizacion-y-roadmap.md", 0),
    ("docs/arquitectura/07-pendientes.md", 0),
    ("contract/README.md", 1),
    ("docs/adr/plantilla.md", 1),
    ("docs/plantillas/historia-de-usuario.md", 1),
    ("docs/arquitectura/anexo-d-referencias.md", 1),
]

MERMAID_CONFIG = {
    "theme": "base",
    "fontFamily": "Poppins, DejaVu Sans, sans-serif",
    "htmlLabels": False,
    "flowchart": {"htmlLabels": False, "useMaxWidth": False, "curve": "basis", "nodeSpacing": 34, "rankSpacing": 46, "padding": 10},
    "sequence": {"useMaxWidth": False, "mirrorActors": False, "wrap": False, "width": 110, "actorMargin": 34, "messageMargin": 24,
                 "boxMargin": 8, "noteMargin": 8, "messageFontSize": 13, "actorFontSize": 13, "noteFontSize": 12},
    "er": {"useMaxWidth": False, "fontSize": 13, "entityPadding": 12},
    "themeVariables": {
        "fontFamily": "Poppins, DejaVu Sans, sans-serif", "fontSize": "13px",
        "primaryColor": "#f5f7fa", "primaryBorderColor": "#52606d", "primaryTextColor": "#1f2933",
        "lineColor": "#334e68", "secondaryColor": "#eef2f6", "tertiaryColor": "#ffffff",
        "clusterBkg": "#fbfcfd", "clusterBorder": "#9aa5b1", "edgeLabelBackground": "#ffffff",
        "actorBkg": "#eef4fb", "actorBorder": "#1d4e89", "actorTextColor": "#102a43", "actorLineColor": "#9aa5b1",
        "signalColor": "#334e68", "signalTextColor": "#1f2933", "labelBoxBkgColor": "#eef4fb",
        "labelBoxBorderColor": "#1d4e89", "loopTextColor": "#1d4e89", "activationBkgColor": "#d5f2ec",
        "noteBkgColor": "#fffaeb", "noteBorderColor": "#b7791f", "noteTextColor": "#102a43",
        "sequenceNumberColor": "#ffffff",
    },
}
NEWPAGE = ("Resumen para la supervisión", "0. Control", "5. Vista de bloques", "9. Decisiones", "Anexo A.")
STATUS = {"DECIDIDO": "decidido", "PROPUESTO": "propuesto", "PENDIENTE": "pendiente", "VERIFICAR": "verificar"}


def slug(text: str) -> str:
    t = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")


def load(rel: str, shift: int) -> str:
    text = (REPO / rel).read_text(encoding="utf-8")
    text = re.sub(r"<!-- pdf:skip-start -->.*?<!-- pdf:skip-end -->", "", text, flags=re.S)
    if rel.endswith("arquitectura/README.md"):
        text = text[text.index("## Resumen para la supervisión"):]
    out, in_fence = [], False
    for line in text.splitlines():
        if line.lstrip().startswith("```"):
            in_fence = not in_fence
        elif not in_fence and shift and re.match(r"#{1,4} ", line):
            line = "#" * shift + line
        out.append(line)
    return "\n".join(out) + "\n\n"


def render_mermaid(src: str) -> Path:
    cfg = json.dumps(MERMAID_CONFIG, sort_keys=True)
    key = hashlib.sha1((src + cfg).encode()).hexdigest()[:12]
    svg = BUILD / f"fig-{key}.svg"
    if not svg.exists():
        (BUILD / f"fig-{key}.mmd").write_text(src, encoding="utf-8")
        cmd = [MMDC, "-i", str(BUILD / f"fig-{key}.mmd"), "-o", str(svg), "-c", str(BUILD / "mermaid.json"), "-b", "transparent"]
        if CHROME:
            cmd += ["-p", str(BUILD / "puppeteer.json")]
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode != 0 or not svg.exists():
            sys.exit(f"Mermaid falló:\n{src[:300]}\n---\n{r.stderr[-1500:]}")
    return svg


def svg_size(path: Path) -> tuple[float, float]:
    m = re.search(r'viewBox="[-\d.]+ [-\d.]+ ([\d.]+) ([\d.]+)"', path.read_text(encoding="utf-8")[:4000])
    return (float(m.group(1)), float(m.group(2))) if m else (640.0, 400.0)


FIG_RE = re.compile(r"```mermaid\n(.*?)\n```\n(?:[ \t]*\n)*(\*Figura[^\n]*\*)?", re.S)


def figures(md: str) -> str:
    def repl(m: re.Match) -> str:
        svg = render_mermaid(m.group(1))
        w, h = svg_size(svg)
        width = w * min(1.0, 660 / w, 700 / h)  # cabe en el ancho y en ~185 mm de alto
        cap = (m.group(2) or "").strip().strip("*")
        cap_html = markdown.markdown(cap)[3:-4] if cap else ""
        figcap = f"<figcaption>{cap_html}</figcaption>" if cap else ""
        return f'\n<figure class="diagram"><img src="{svg.as_uri()}" style="width:{width:.0f}px"/>{figcap}</figure>\n\n'
    return FIG_RE.sub(repl, md)


def postprocess(html: str) -> tuple[str, str]:
    soup = BeautifulSoup(html, "html.parser")
    for code in soup.find_all("code"):
        word = code.get_text()
        if word in STATUS and code.parent.name != "pre":
            span = soup.new_tag("span", attrs={"class": f"badge b-{STATUS[word]}"})
            span.string = word
            code.replace_with(span)
    for a in soup.find_all("a"):
        href = a.get("href", "")
        if href.startswith("http"):
            continue
        m = re.match(r"ADR-(\d\d)", a.get_text())
        if m and ".md" in href:
            a["href"] = f"#adr-{m.group(1)}"
        else:
            a.unwrap()
    toc = []
    for h in soup.find_all(["h2", "h3"]):
        text = h.get_text(" ", strip=True)
        m = re.match(r"ADR-(\d\d)", text)
        if h.name == "h2":
            h["id"] = slug(text)[:60]
            if text.startswith(NEWPAGE):
                h["class"] = "newpage"
            toc.append(("l2", h["id"], text))
        elif m:
            h["id"] = f"adr-{m.group(1)}"
            h["class"] = "adr-title"
            toc.append(("l3", h["id"], text))
    for h in soup.find_all("h3", class_="adr-title"):  # envolver cada ADR en una tarjeta
        card = soup.new_tag("div", attrs={"class": "adr"})
        nodes, sib = [], h.next_sibling
        while sib is not None and getattr(sib, "name", None) not in ("h2", "h3"):
            nodes.append(sib)
            sib = sib.next_sibling
        h.insert_before(card)
        card.append(h.extract())
        for n in nodes:
            card.append(n.extract())
    res = soup.find("h2", id="resumen-para-la-supervision")  # el resumen, compacto y en una página
    if res is not None:
        box = soup.new_tag("section", attrs={"class": "resumen"})
        nodes, sib = [], res.next_sibling
        while sib is not None and getattr(sib, "name", None) != "h2":
            nodes.append(sib)
            sib = sib.next_sibling
        res.insert_before(box)
        box.append(res.extract())
        for n in nodes:
            box.append(n.extract())
    items = "".join(
        f'<li class="{lvl}"><a href="#{i}">{BeautifulSoup(t, "html.parser").get_text()}</a></li>' for lvl, i, t in toc
    )
    return str(soup), items


def pyramid_svg() -> str:
    """Pirámide de teselas para la portada: cada nivel duplica la resolución del anterior."""
    parts, y, t = [], 30, 22
    for level, n in enumerate([1, 2, 4, 8]):
        x0 = 200 - n * t / 2
        for r in range(n):
            for c in range(n):
                hot = level == 3 and (c, r) == (5, 3)
                fill = "#e36414" if hot else "rgba(156,197,207,0.10)"
                stroke = "#f4b183" if hot else "#9cc5cf"
                parts.append(f'<rect x="{x0 + c * t:.1f}" y="{y + r * t}" width="{t - 3}" height="{t - 3}" rx="2" fill="{fill}" stroke="{stroke}" stroke-width="1"/>')
        y += n * t + 16
    parts.append('<text x="200" y="438" text-anchor="middle" fill="#9cc5cf" font-family="Poppins" font-size="10" letter-spacing="1.5">NIVEL 0 = LA VERDAD NUMÉRICA</text>')
    return f'<svg class="pyramid" viewBox="0 0 400 450" xmlns="http://www.w3.org/2000/svg">{"".join(parts)}</svg>'


CSS = """
@page { size: A4; margin: 20mm 18mm 18mm 18mm;
  @top-left { content: "Arquitectura y línea base · Herramienta de anotación GIA"; font: 400 7.3pt Poppins; color: #7b8794; }
  @top-right { content: string(section); font: 400 7.3pt Poppins; color: #7b8794; }
  @bottom-center { content: counter(page); font: 500 8pt Poppins; color: #52606d; } }
@page cover { margin: 0; @top-left { content: none } @top-right { content: none } @bottom-center { content: none } }
@page toc { @top-right { content: "Índice" } @bottom-center { content: none } }
html { font-family: "TeX Gyre Pagella", "DejaVu Serif", "DejaVu Sans", serif; font-size: 10pt; line-height: 1.38; color: #1f2933; }
body { margin: 0; }
p { margin: 0 0 7pt; text-align: justify; hyphens: auto; }
strong { color: #102a43; }
a { color: #1d4e89; text-decoration: none; }
h2, h3, h4 { font-family: Poppins, "DejaVu Sans", sans-serif; color: #0f4c5c; line-height: 1.2; break-after: avoid; }
h2 { font-size: 19pt; font-weight: 700; margin: 20pt 0 11pt; string-set: section content(text); }
h2.newpage { break-before: page; margin-top: 0; }
h2::after { content: ""; display: block; width: 58px; height: 3px; background: #e36414; margin-top: 7px; }
h3 { font-size: 12.2pt; font-weight: 600; margin: 15pt 0 6pt; }
ul, ol { margin: 0 0 8pt; padding-left: 15pt; }
li { margin-bottom: 2.5pt; }
table { width: 100%; border-collapse: collapse; margin: 4pt 0 10pt; font-size: 8.1pt; line-height: 1.28; }
thead { display: table-header-group; }
th { background: #0f4c5c; color: #ffffff; font-family: Poppins, sans-serif; font-weight: 500; font-size: 7.8pt; text-align: left; padding: 4pt 5pt; }
td { padding: 3.6pt 5pt; border-bottom: 0.6pt solid #cbd2d9; vertical-align: top; }
tr:nth-child(even) td { background: #f5f7fa; }
tr { break-inside: avoid; }
code { font-family: "DejaVu Sans Mono", monospace; font-size: 0.8em; background: #eef2f6; padding: 0.5pt 2.5pt; border-radius: 2.5pt; color: #243b53; }
pre { background: #f5f7fa; border-left: 3pt solid #0f4c5c; padding: 6pt 9pt; margin: 4pt 0 10pt; white-space: pre-wrap; break-inside: avoid; }
pre code { background: none; padding: 0; font-size: 7.3pt; line-height: 1.38; color: #102a43; }
figure.diagram { margin: 6pt 0 12pt; text-align: center; break-inside: avoid; }
figure.diagram img { max-width: 100%; }
figcaption { font-family: Poppins, sans-serif; font-size: 7.6pt; color: #52606d; margin-top: 4pt; text-align: center; }
.badge { font-family: Poppins, sans-serif; font-size: 6.4pt; font-weight: 600; letter-spacing: 0.5pt; color: #ffffff; padding: 0.8pt 4pt; border-radius: 3pt; white-space: nowrap; }
.b-decidido { background: #0f766e; } .b-propuesto { background: #e36414; } .b-pendiente { background: #616e7c; } .b-verificar { background: #a4161a; }
.adr { border-left: 2.5pt solid #0f766e; padding: 1pt 0 1pt 9pt; margin: 12pt 0 16pt; }
.adr h3 { margin-top: 2pt; }
.adr table { font-size: 8pt; }
blockquote { margin: 6pt 0 10pt; padding: 6pt 10pt; background: #eef4fb; border-left: 3pt solid #1d4e89; }
.resumen { font-size: 9.35pt; line-height: 1.34; }
.resumen p, .resumen li { margin-bottom: 3.6pt; }
.resumen table { font-size: 7.7pt; margin: 3pt 0 7pt; }
.resumen td { padding: 2.6pt 4.5pt; }
/* portada */
.cover { page: cover; width: 210mm; height: 297mm; background: #0f4c5c; color: #ffffff; position: relative; overflow: hidden; }
.cover .kicker { position: absolute; top: 26mm; left: 22mm; font: 600 8.2pt Poppins; letter-spacing: 1.6pt; color: #f4b183; }
.cover h1 { position: absolute; top: 40mm; left: 22mm; width: 120mm; margin: 0; font: 700 29pt/1.12 Poppins; color: #ffffff; }
.cover .sub { position: absolute; top: 101mm; left: 22mm; width: 110mm; font: 300 14pt/1.3 Poppins; color: #9cc5cf; }
.cover .bar { position: absolute; top: 127mm; left: 22mm; width: 30mm; height: 3pt; background: #e36414; }
.cover .lead { position: absolute; top: 135mm; left: 22mm; width: 98mm; font: italic 11pt/1.45 "TeX Gyre Pagella", serif; color: #d9e8ec; }
.cover .pyramid { position: absolute; top: 62mm; right: 10mm; width: 88mm; }
.cover .meta { position: absolute; bottom: 22mm; left: 22mm; right: 22mm; font: 400 8.6pt/1.6 Poppins; color: #d9e8ec; border-top: 0.6pt solid #4c8594; padding-top: 6mm; }
.cover .meta b { color: #ffffff; font-weight: 600; }
/* índice */
.toc { page: toc; break-after: page; }
.toc h2 { break-before: auto; string-set: none; }
.toc ul { list-style: none; padding: 0; margin: 0; }
.toc li { font-family: Poppins, sans-serif; margin: 0; }
.toc li.l2 { font-size: 9.6pt; font-weight: 500; color: #0f4c5c; margin-top: 4.2pt; }
.toc li.l3 { font-size: 7.9pt; color: #334e68; padding-left: 14pt; margin-top: 1.1pt; }
.toc a { color: inherit; }
.toc a::after { content: leader(".") target-counter(attr(href), page); color: #7b8794; }
"""


def main() -> None:
    out_pdf = Path(sys.argv[1]) if len(sys.argv) > 1 else REPO / "docs/arquitectura/arquitectura.pdf"
    BUILD.mkdir(parents=True, exist_ok=True)
    (BUILD / "mermaid.json").write_text(json.dumps(MERMAID_CONFIG), encoding="utf-8")
    if CHROME:
        (BUILD / "puppeteer.json").write_text(json.dumps({"executablePath": CHROME, "args": ["--no-sandbox"]}), encoding="utf-8")
    md = figures("".join(load(rel, shift) for rel, shift in SOURCES))
    body = markdown.markdown(md, extensions=["tables", "fenced_code", "sane_lists"], output_format="html")
    body, toc_items = postprocess(body)
    cover = f"""
<section class="cover">
  <div class="kicker">DOCUMENTO DE ARQUITECTURA · PPS 1 + PPS 2 · GIA</div>
  <h1>Herramienta de anotación de imágenes médicas</h1>
  <div class="sub">Arquitectura y línea base técnica del proyecto global</div>
  <div class="bar"></div>
  <div class="lead">Qué decidimos, qué proponemos y qué queda abierto: el contrato técnico entre la PPS 1 y la PPS 2 y la base de sus historias de usuario.</div>
  {pyramid_svg()}
  <div class="meta"><b>Versión {VERSION}</b> · borrador para revisión de la supervisión · {FECHA}<br/>
  <b>Autores:</b> Gino Paolo Tombesi (PPS 1, legajo 95345) · Ángel Nahuel Villegas (PPS 2, legajo 94837)<br/>
  <b>Supervisión:</b> Alejandro García (profesional) · Martín Nicolás Gramática (docente)<br/>
  UTN · Facultad Regional Córdoba · Ingeniería en Sistemas de Información</div>
</section>"""
    toc = f'<nav class="toc"><h2>Índice</h2><ul>{toc_items}</ul></nav>'
    html = f"""<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>Herramienta de anotación de imágenes médicas — Arquitectura y línea base técnica v{VERSION}</title>
<meta name="author" content="Gino Paolo Tombesi; Ángel Nahuel Villegas">
<meta name="description" content="Documento de arquitectura y línea base técnica del proyecto global PPS 1 + PPS 2 (GIA, UTN FRC)">
<style>{CSS}</style></head><body>{cover}{toc}<main>{body}</main></body></html>"""
    (BUILD / "documento.html").write_text(html, encoding="utf-8")
    HTML(string=html, base_url=str(BUILD)).write_pdf(out_pdf)
    print(f"PDF generado: {out_pdf}")


if __name__ == "__main__":
    main()
