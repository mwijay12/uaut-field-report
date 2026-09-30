"""Extract all mermaid blocks from README.md + weeks/*.md into diagrams/src/*.mmd."""
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "diagrams" / "src"
OUT.mkdir(parents=True, exist_ok=True)

BLOCK = re.compile(r"```mermaid\n(.*?)\n```", re.S)


def blocks(path: pathlib.Path):
    text = path.read_text(encoding="utf-8")
    found = [m.group(1).strip() for m in BLOCK.finditer(text)]
    return found


manifest = []


def save(name, title, week, kind, code):
    f = OUT / f"{name}.mmd"
    f.write_text(code + "\n", encoding="utf-8")
    manifest.append({"name": name, "title": title, "week": week, "kind": kind})


# ---- globals from README (blocks appear in order: architecture, ERD, AI chain)
gb = blocks(ROOT / "README.md")
assert len(gb) == 3, f"expected 3 global mermaid blocks in README.md, found {len(gb)}"
save("GLOBAL_architecture", "System Architecture — Full Production Topology", 0, "architecture", gb[0])
save("GLOBAL_er-relationships", "Database Relationships — Full Schema (10 tables)", 0, "er-relationships", gb[1])
save("GLOBAL_ai-fallback", "AI-Assisted Development Fallback Chain", 0, "ai-fallback", gb[2])

# ---- per-week (blocks appear in order: architecture, ERD slice, AI chain)
WEEK_META = {
    1: ("Orientation, Network Layout & PHP Project Kickoff", "Mon 24/08 → Fri 28/08/2026"),
    2: ("Maintenance, Presentation 1, Backend Refactor & Inventory", "Mon 31/08 → Fri 04/09/2026"),
    3: ("Linux CLI, RBAC, DB Indexing & GIS Mapping", "Mon 07/09 → Fri 11/09/2026"),
    4: ("Python Automation, Async APIs, Security & Market Concurrency", "Mon 14/09 → Fri 18/09/2026"),
    5: ("Sprint Review & Enterprise Web Server Deployment", "Mon 21/09 → Fri 25/09/2026"),
    6: ("UAT, Data Migration, User Manual & Defense Prep", "Mon 28/09 → Fri 02/10/2026"),
}

for n in range(1, 7):
    p = ROOT / "weeks" / f"WEEK-0{n}.md"
    bs = blocks(p)
    assert len(bs) == 3, f"expected 3 mermaid blocks in {p.name}, found {len(bs)}"
    theme, dates = WEEK_META[n]
    save(f"W{n:02d}_architecture", f"Week {n} Architecture — {theme}", n, "architecture", bs[0])
    save(f"W{n:02d}_er-relationships", f"Week {n} Database Relationships", n, "er-relationships", bs[1])
    save(f"W{n:02d}_ai-fallback", f"Week {n} AI-Assisted Fallback Chain", n, "ai-fallback", bs[2])

(ROOT / "diagrams" / "manifest.json").write_text(
    json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8"
)
print(f"extracted {len(manifest)} diagrams -> {OUT}")
for m in manifest:
    print(f"  {m['name']}.mmd  ({m['kind']})")
