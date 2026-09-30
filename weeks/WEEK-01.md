# 📅 WEEK 1 — Orientation, Network Layout & PHP Project Kickoff

**TTCL × UAUT Practical Training · David Erick Mwijage (Reg 250/13055)**

![Week](https://img.shields.io/badge/week-1_of_6-16A34A?style=for-the-badge)
![Dates](https://img.shields.io/badge/dates-24--28_Aug_2026-0EA5E9?style=for-the-badge)
![Focus](https://img.shields.io/badge/focus-Network_%2B_Hardware_%2B_Project_Bootstrap-777BB4?style=for-the-badge)

[← README index](../README.md) · [Week 2 →](WEEK-02.md)

> **Theme:** learn how TTCL's building is wired, fix its computers, then start the real project — the Avocado Farmers System in native PHP on XAMPP.

## 🗓️ Day-by-day

| Day | Date | Activity | Output |
|---|---|---|---|
| Mon | 24/08 | Orientation & distribution of duties — TTCL corporate structure, IT dept procedures | Duty allocation, IT/network dept |
| Tue | 25/08 | Public holiday | — |
| Wed | 26/08 | Enterprise network layout & cabling — core/distribution switches, patch panels, access layer | Floor-to-core cabling map |
| Thu | 27/08 | Computer hardware & peripherals maintenance — RAM, PSU, printers, slow-boot diagnostics | Serviced office PCs |
| Fri | 28/08 | **Project kickoff:** Avocado Farmers Registration & Digital Marketplace (HTML/CSS/JS + native PHP, XAMPP) | `htdocs/avocado_farmers` bootstrap + draft schema |

## 🏗️ Diagram 1 — Architecture (what this week built)

```mermaid
flowchart TD
    subgraph TTCL["🏢 TTCL building — studied Wed 26/08"]
        IN["🌐 ISP uplink"] --> CS["🔁 Core switch"]
        CS --> FS["📶 Floor distribution switch"]
        FS --> PP["🧵 Patch panel — structured Cat6"]
        PP --> AP["🖥️ Access PCs — IT dept"]
        FS --> PRN["🖨️ Network printers"]
    end
    subgraph DEV["🥑 Project kickoff — Fri 28/08"]
        HT["htdocs/avocado_farmers"] --> AP2["Apache :80"]
        AP2 --> PHP["PHP 8"]
        PHP --> MY[("MariaDB — draft schema")]
        IDX["index.php · login.php"] --> AP2
        SK["database/schema.sql draft"] --> MY
    end
    AP -- "becomes the dev workstation" --> HT
```

**Soma haraka (quick read):** the building wiring traced on Wednesday becomes Friday's dev target — one access PC now serves Apache + MariaDB straight from `htdocs`.

## 🗄️ Diagram 2 — Database relationships (Week 1 schema draft)

```mermaid
erDiagram
    districts ||--o{ wards : "contains"
    users {
        int id PK
        varchar email UK
        varchar password
        varchar role "farmer/buyer/officer/admin"
        varchar status "pending/active/suspended"
    }
    districts {
        int id PK
        varchar name UK
        varchar region "default Njombe"
    }
    wards {
        int id PK
        int district_id FK
        varchar name "unique per district"
    }
```

> Week 1 ships a 3-table draft (`districts → wards`, plus `users` for the login gate). `farmers`, `farms`, `farm_photos` and `market_requests` land in Weeks 2–4 — see the [global ERD](../README.md#%EF%B8%8F-section-3-database-relationships).

## 🤖 Diagram 3 — AI-assisted fallback chain (this week)

```mermaid
flowchart LR
    T["🧠 Task: bootstrap PHP project<br/>+ understand TTCL network"] --> G{"Antigravity IDE<br/>agent ok?"}
    G -- yes --> D["🤖 Draft: folder tree,<br/>schema.sql, login page"]
    G -- no --> C{"Cline + Claude ok?"}
    C -- yes --> D
    C -- no --> W{"Web LLM ok?"}
    W -- yes --> D
    W -- no --> OFF["📚 Offline: HTML/CSS book,<br/>handwritten notes"]
    D --> V{"Apache serves the<br/>login page?"}
    V -- no --> T
    V -- yes --> P["💾 First commit + logbook 28/08"]
```

**Fallback rule of the week:** if the agent stack is unavailable, the scaffold is drawn on paper first and typed by hand — work never stops.

## 🧰 Machinery & tools

| Area | Tools |
|---|---|
| Network | Core/distribution switches, patch panels, RJ45 Cat6, cable tester |
| Hardware | Screwdrivers, compressed air, RAM testers, PSU checker, printer kits |
| Dev | XAMPP (Apache + MariaDB), VS Code, phpMyAdmin |

## 📝 Ufafanuzi wa Kiufundi

- *Structured cabling* imeelezwa top-down: patch panel → distribution switch → core switch.
- Draft schema iko 3NF kuanzia siku ya kwanza — `wards` haina duplicate names ndani ya district moja (`UNIQUE (district_id, name)`).
- XAMPP ilichaguliwa kwa *zero-dependency hosting* — hakuna `composer install` wala Node server inayohitajika kwenye seva za TTCL.

---

[← README index](../README.md) · [Week 2 →](WEEK-02.md)

