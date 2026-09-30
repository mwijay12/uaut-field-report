"""Build A4 PDF documents with the rendered diagrams via Edge headless print-to-PDF.

Outputs:
  pdf/FIELD_REPORT_DIAGRAMS.pdf          master compendium (cover + globals + 6 weeks)
  pdf/weeks/WEEK-0N-diagrams.pdf         one PDF per week (3 diagrams each)
"""
import pathlib
import shutil
import subprocess
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
SVG = ROOT / "diagrams" / "svg"
PDF = ROOT / "pdf"
BUILD = PDF / "build"
EDGE_CANDIDATES = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
]

KIND_TITLES = {
    "architecture": "Diagram 1 — System Architecture",
    "er-relationships": "Diagram 2 — Database Relationships (ERD)",
    "ai-fallback": "Diagram 3 — AI-Assisted Fallback Chain",
}
KIND_CAPTIONS = {
    "architecture": "How the pieces connect: entry points, hardened request pipeline, data layer and GIS layer.",
    "er-relationships": "Tables and foreign keys in play this week — drawn from database/schema.sql.",
    "ai-fallback": "Escalation chain used to complete the week's task: smartest tool first, offline fallback last, nothing unverified ships.",
}

WEEKS = {
    1: ("WEEK 1 — Orientation, Network Layout & PHP Project Kickoff", "Mon 24/08 → Fri 28/08/2026"),
    2: ("WEEK 2 — Maintenance, Presentation 1, Backend Refactor & Inventory", "Mon 31/08 → Fri 04/09/2026"),
    3: ("WEEK 3 — Linux CLI, RBAC, DB Indexing & GIS Mapping", "Mon 07/09 → Fri 11/09/2026"),
    4: ("WEEK 4 — Python Automation, Async APIs, Security & Market Concurrency", "Mon 14/09 → Fri 18/09/2026"),
    5: ("WEEK 5 — Sprint Review & Enterprise Web Server Deployment", "Mon 21/09 → Fri 25/09/2026"),
    6: ("WEEK 6 — UAT, Data Migration, User Manual & Defense Prep", "Mon 28/09 → Fri 02/10/2026"),
}

STUDENT = "David Erick Mwijage (Mzee Mwijay) · Reg 250/13055"
INSTITUTION = "UAUT — College of ICT × TTCL · BSc ICT Practical Training · 24 Aug → 2 Oct 2026"

CSS = """
@page { size: A4; margin: 13mm 12mm 15mm 12mm; }
* { box-sizing: border-box; }
body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; margin: 0; }
.banner { background: linear-gradient(135deg, #064e3b, #16a34a); color: #fff;
          padding: 9mm 10mm; border-radius: 4mm; }
.banner h1 { font-size: 20pt; margin: 0 0 2mm; }
.banner .sub { font-size: 10.5pt; opacity: .93; }
.banner .dates { font-size: 10pt; opacity: .85; margin-top: 1.5mm; }
.chips span { display: inline-block; background: #ecfdf5; border: 1px solid #16a34a;
              color: #065f46; border-radius: 999px; padding: 1mm 4mm;
              font-size: 8.5pt; margin: 0 2mm 2mm 0; }
.section-start { page-break-before: always; }
.kind-title { font-size: 13pt; font-weight: 700; color: #065f46;
              border-left: 3mm solid #d4af37; padding-left: 4mm; margin: 2mm 0 2mm; }
.diagram-page { page-break-before: always; text-align: center; }
.diagram-page img { max-width: 178mm; max-height: 222mm; width: auto; height: auto; }
.caption { font-size: 9pt; color: #6b7280; margin-top: 2.5mm; }
.footer-line { margin-top: 5mm; font-size: 8.5pt; color: #9ca3af; text-align: center;
               border-top: 1px solid #e5e7eb; padding-top: 2mm; }
table.toc { border-collapse: collapse; width: 100%; margin-top: 4mm; }
table.toc td { padding: 2mm 3mm; font-size: 10pt; border-bottom: 1px solid #e5e7eb; }
.note { font-size: 9.5pt; color: #4b5563; margin-top: 5mm; }
"""


def svg_img(name: str) -> str:
    return f'<img src="../../diagrams/svg/{name}.svg" alt="{name}"/>'


def kind_block(name: str, kind: str, first: bool) -> str:
    cls = "diagram-page section-start" if first else "diagram-page"
    return (
        f'<div class="{cls}">'
        f'<div class="kind-title">{KIND_TITLES[kind]}</div>'
        f'{svg_img(name)}'
        f'<div class="caption">{KIND_CAPTIONS[kind]}</div>'
        f'</div>'
    )


def banner(title: str, dates: str, chips: list) -> str:
    chip_html = "<span>" + "</span><span>".join(chips) + "</span>"
    return (
        f'<div class="banner"><h1>{title}</h1>'
        f'<div class="sub">{INSTITUTION}</div>'
        f'<div class="dates">{dates} · {STUDENT}</div></div>'
        f'<div class="chips" style="margin-top:4mm">{chip_html}</div>'
    )

def write_doc(stem: str, body: str):
    html = (
        "<!doctype html><html><head><meta charset='utf-8'>"
        f"<title>{stem}</title><style>{CSS}</style></head>"
        f"<body>{body}</body></html>"
    )
    f = BUILD / f"{stem}.html"
    f.write_text(html, encoding="utf-8")
    return f


def edge_print(html_path: pathlib.Path, pdf_path: pathlib.Path):
    udd = tempfile.mkdtemp(prefix="edgepdf_")
    url = html_path.resolve().as_uri()
    for flags in (["--headless=new"], ["--headless"]):
        cmd = [
            EDGE, *flags, "--disable-gpu", "--disable-extensions",
            "--no-first-run", "--no-default-browser-check",
            "--no-pdf-header-footer", "--virtual-time-budget=20000",
            f"--user-data-dir={udd}",
            f"--print-to-pdf={pdf_path}", url,
        ]
        try:
            subprocess.run(cmd, capture_output=True, timeout=180)
            if pdf_path.exists() and pdf_path.stat().st_size > 10000:
                break
        except Exception as e:  # noqa: BLE001
            print(f"  edge attempt failed: {e}")
    shutil.rmtree(udd, ignore_errors=True)
    if not (pdf_path.exists() and pdf_path.stat().st_size > 10000):
        raise RuntimeError(f"PDF not produced: {pdf_path}")


def main():
    global EDGE
    EDGE = next(p for p in EDGE_CANDIDATES if pathlib.Path(p).exists())
    BUILD.mkdir(parents=True, exist_ok=True)
    (PDF / "weeks").mkdir(parents=True, exist_ok=True)

    # ---------- weekly PDFs ----------
    for n in range(1, 7):
        title, dates = WEEKS[n]
        chips = [f"Week {n} of 6", "Native PHP 8 + MariaDB", "Leaflet GIS", "CSRF · XSS · RBAC"]
        body = banner(title, dates, chips)
        for kind in ("architecture", "er-relationships", "ai-fallback"):
            body += kind_block(f"W{n:02d}_{kind}", kind, first=True)
        body += (
            '<div class="footer-line">Generated from weeks/WEEK-0'
            f"{n}.md · diagrams rendered with Mermaid 11 · "
            "github.com/mwijay12/uaut-field-report</div>"
        )
        f = write_doc(f"WEEK-0{n}_diagrams", body)
        out = PDF / "weeks" / f"WEEK-0{n}_diagrams.pdf"
        edge_print(f, out)
        print(f"built {out.name} ({out.stat().st_size // 1024} KB)")

    # ---------- master compendium ----------
    toc_rows = "".join(
        f"<tr><td><b>Week {n}</b></td><td>{WEEKS[n][0].split('—')[1].strip()}</td>"
        f"<td>{WEEKS[n][1]}</td></tr>"
        for n in range(1, 7)
    )
    chips = ["6 weeks · 21 diagrams", "Architecture · ERD · AI chain",
             "Native PHP 8 + MariaDB", "Leaflet GIS", "Vector SVG (Mermaid 11)"]
    body = (
        banner("FIELD REPORT DIAGRAMS", "Practical Training Logbook · 24 Aug → 2 Oct 2026", chips)
        + f'<div class="note"><b>{STUDENT}</b><br/>{INSTITUTION}</div>'
        + '<table class="toc"><tr><td colspan="3" style="border-bottom:2px solid #16a34a">'
          "<b>Contents — one section per week, 3 diagrams each</b></td></tr>" + toc_rows + "</table>"
    )
    body += (
        '<div class="section-start"><div class="kind-title" style="font-size:15pt">'
        "PART 0 — GLOBAL VIEW (README)</div></div>"
    )
    for kind in ("architecture", "er-relationships", "ai-fallback"):
        body += kind_block(f"GLOBAL_{kind}", kind, True)
    for n in range(1, 7):
        title = WEEKS[n][0]
        body += (f'<div class="section-start"><div class="kind-title" '
                 f'style="font-size:15pt">PART {n} — {title}</div></div>')
        for kind in ("architecture", "er-relationships", "ai-fallback"):
            body += kind_block(f"W{n:02d}_{kind}", kind, True)
    body += (
        '<div class="footer-line">Master compendium · sources: README.md + weeks/WEEK-01..06.md · '
        "rendered with Mermaid 11 · github.com/mwijay12/uaut-field-report</div>"
    )
    f = write_doc("FIELD_REPORT_DIAGRAMS", body)
    out = PDF / "FIELD_REPORT_DIAGRAMS.pdf"
    edge_print(f, out)
    print(f"built {out.name} ({out.stat().st_size // 1024} KB)")
    print("DONE")


if __name__ == "__main__":
    main()

