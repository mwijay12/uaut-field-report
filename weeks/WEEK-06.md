# 📅 WEEK 6 — UAT, Data Migration, User Manual & Defense Prep

**TTCL × UAUT Practical Training · David Erick Mwijage (Reg 250/13055)**

![Week](https://img.shields.io/badge/week-6_of_6-16A34A?style=for-the-badge)
![Dates](https://img.shields.io/badge/dates-28_Sep--02_Oct_2026-0EA5E9?style=for-the-badge)
![Focus](https://img.shields.io/badge/focus-UAT_%2B_CSV%E2%86%92MySQL_%2B_Manual_%2B_Defense-777BB4?style=for-the-badge)

[← README index](../README.md) · [Week 5 ←](WEEK-05.md)

> **Theme:** hand the system to real users and real data — UAT by role, CSV→MySQL migration with validation, an end-user manual, and the final report + defense pack. *(Planned per the Weeks 5–6 preview; today, Wed 30/09, is migration day.)*

## 🗓️ Day-by-day

| Day | Date | Activity | Output |
|---|---|---|---|
| Mon | 28/09 | UAT planning — role-based test matrix (farmer · buyer · officer · admin · accountant) | Test scripts + acceptance criteria |
| Tue | 29/09 | UAT execution — real flows per role, bug log, hot-fixes | Signed test matrix |
| Wed | 30/09 | **Data migration: CSV → MySQL** — parse, validate (phone format, ward exists, unique NIDA), staged import, count verification | Real Njombe data inside `avocado_db` |
| Thu | 01/10 | End-user manual & documentation (screenshots per role, FAQ) | Printable user manual |
| Fri | 02/10 | Final Field Training report compilation & **defense preparation** | Defense-ready repo + report |

## 🏗️ Diagram 1 — Architecture (what this week built)

```mermaid
flowchart TD
    subgraph SRC["📥 Source"]
        CSV["CSV exports<br/>farmers · farms · wards"]
    end
    subgraph ETL["🐍 Python staging — Wed 30/09"]
        P["parse + validate<br/>phone format · ward exists · unique NIDA"]
        ST["staging tables<br/>temporary — outside final schema"]
        P --> ST
    end
    subgraph DBI["🗄️ Import"]
        INS["INSERT ... ON DUPLICATE KEY<br/>users → farmers → farms"]
        VQ["verification queries<br/>row counts vs CSV"]
    end
    CSV --> P
    ST --> INS --> DB[("avocado_db")] --> VQ
    subgraph UAT["✅ UAT — Mon–Tue 28–29/09"]
        MT["role test matrix"]
        BUG["bug log → patches"]
        MT --> BUG
    end
    VQ --> MT
    BUG -- "fixes" --> INS
    subgraph OUT["📦 Fri 02/10 wrap-up"]
        MAN["end-user manual"]
        RPT["final report + defense slides"]
        MAN --> RPT
    end
    VQ --> MAN
```

**Soma haraka:** data enters through a staging area and is only promoted after validation; every UAT bug loops back into the import/fix cycle until the counts match the CSVs exactly.

## 🗄️ Diagram 2 — Database relationships (final schema, migration view)

```mermaid
erDiagram
    districts ||--o{ wards : "contains"
    districts ||--o{ farmers : "home district"
    districts ||--o{ farms : "farm location"
    wards ||--o{ farmers : "home ward"
    wards ||--o{ farms : "farm ward"
    users ||--o| farmers : "farmer profile"
    users ||--o| buyers : "buyer profile"
    users ||--o| officers : "staff profile"
    farmers ||--o{ farms : "owns"
    farms ||--o{ farm_photos : "evidence"
    farms ||--o{ market_requests : "ordered"
    users ||--o{ market_requests : "places"
    users ||--o{ farm_photos : "verifies"
    users ||--o{ farms : "reviews status"

    users {
        int id PK
        varchar email UK
        varchar password "bcrypt"
        varchar role
        varchar status
    }
    farmers {
        int id PK
        int user_id FK
        varchar national_id UK "dedupe key for import"
        varchar phone
        int ward_id FK
    }
    farms {
        int id PK
        int farmer_id FK
        varchar avocado_variety
        decimal gps_latitude
        decimal gps_longitude
        varchar harvest_status
        int ward_id FK
    }
    market_requests {
        int id PK
        varchar order_code UK
        int farm_id FK
        varchar status
    }
    login_attempts {
        int id PK
        varchar email
        varchar ip_address
        int was_success
    }
```

> **CSV staging** (Wed 30/09) ni *ephemeral* — haina FK, haijaorodheshwa rasmi kwenye schema; data inapita staging → validation (`national_id UNIQUE`, phone format, ward exists) → `users → farmers → farms` kwa `INSERT … ON DUPLICATE KEY`, kisha verification queries zinalinganisha row counts na CSV.

## 🤖 Diagram 3 — AI-assisted fallback chain (this week)

```mermaid
flowchart LR
    T["🧠 Task: UAT matrix · migration ·<br/>user manual · defense prep"] --> G{"Antigravity IDE ok?"}
    G -- yes --> D["🤖 Draft: test matrix, migration<br/>script, manual chapters"]
    G -- no --> C{"Cline + Claude ok?"}
    C -- yes --> D
    C -- no --> W{"Web LLM ok?"}
    W -- yes --> D
    W -- no --> OFF["📚 Offline: defense guide,<br/>printed UAT sheets"]
    D --> V{"Verified?<br/>each role passes UAT · import counts<br/>match CSV · manual matches UI"}
    V -- no --> T
    V -- yes --> P["💾 Defense-ready repo + report"]
```

**Fallback rule of the week:** maelezo ya manual yanalinganishwa na screenshots halisi za kila role — AI draft isiyolingana na UI inarudi kwa umbo sahihi kabla ya print.

## 🧰 Machinery & tools

| Area | Tools |
|---|---|
| UAT | Role test matrix, real staff testers, bug log |
| Migration | CSV sources, Python staging script, `INSERT … ON DUPLICATE KEY`, count verification |
| Docs | Screenshot capture per role, end-user manual template |
| Defense | Final report, slides, [defense guide](https://github.com/mwijay12/avocado-farmers-) |

## 📝 Ufafanuzi wa Kiufundi

- Migration inaheshimu **FK order**: `users` kwanza, kisha `farmers`, mwisho `farms` — hakuna orphan rows.
- `national_id UNIQUE` ni dedupe key — CSV duplicate entries zinakataliwa kwenye validation, si kwenye import.
- UAT matrix ina kila role: farmer (register, upload, accept order), buyer (search, order, receipt), officer (verify photos), admin (roles/status), accountant (reports).

---

[← README index](../README.md) · [Week 5 ←](WEEK-05.md) · 🎓 **Training complete — 24 Aug → 2 Oct 2026**

