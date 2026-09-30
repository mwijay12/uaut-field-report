# 📅 WEEK 3 — Linux CLI, RBAC, DB Indexing & GIS Mapping

**TTCL × UAUT Practical Training · David Erick Mwijage (Reg 250/13055)**

![Week](https://img.shields.io/badge/week-3_of_6-16A34A?style=for-the-badge)
![Dates](https://img.shields.io/badge/dates-07--11_Sep_2026-0EA5E9?style=for-the-badge)
![Focus](https://img.shields.io/badge/focus-RBAC_%2B_Indexing_%2B_Leaflet_GIS-777BB4?style=for-the-badge)

[← README index](../README.md) · [Week 2 ←](WEEK-02.md) · [Week 4 →](WEEK-04.md)

> **Theme:** broaden the foundations (Linux CLI, Oracle SQL reading), then harden roles and indexes — and make the farm map come alive with Leaflet + OpenStreetMap.

## 🗓️ Day-by-day

| Day | Date | Activity | Output |
|---|---|---|---|
| Mon | 07/09 | Linux fundamentals — Cobbaut PDF (169 pp); `ls`, `pwd`, `chmod`, `bash` practice | `linux_notes.md` |
| Tue | 08/09 | Oracle/SQL fundamentals — McGraw-Hill 11g SQL (690 pp) + connect to `avocado_db`, verify table counts | `oracle_notes.md` |
| Wed | 09/09 | System design diagram + architecture doc (`system_architecture.html`, dark theme, inline SVG) | Visual architecture page |
| Thu | 10/09 | **RBAC hardening** (6 roles gate) + **DB indexing** (`idx_orders_status`, `idx_farms_status`, …) + `EXPLAIN` checks | Role-gated pages, faster queries |
| Fri | 11/09 | **GIS:** `api/get_farms_geojson.php` + Leaflet `map.php` with OpenStreetMap tiles & farm popups | Interactive farm map |

## 🏗️ Diagram 1 — Architecture (what this week built)

```mermaid
flowchart TD
    subgraph Study["📖 Mon–Tue foundations"]
        LX["🐧 Linux CLI — Cobbaut PDF<br/>ls · pwd · chmod · bash"]
        ORC["📚 Oracle 11g SQL — McGraw-Hill<br/>SELECT · JOIN concepts"]
        EX["🔍 phpMyAdmin EXPLAIN<br/>slow-query hunt"]
    end
    U["👤 Logged-in user"] --> MAP["map.php — Leaflet"]
    MAP --> AUTH["includes/auth.php<br/>RBAC role gate"]
    AUTH -- "role not allowed" --> E403["403.php"]
    AUTH -- ok --> API["api/get_farms_geojson.php"]
    API --> SQL["SELECT farms<br/>JOIN wards · districts<br/>WHERE status = active"]
    SQL --> DB[("MariaDB<br/>idx_farms_status · idx_farms_variety")]
    API -- "FeatureCollection" --> L["🗺️ Leaflet render + popups"]
    L -- "farm name · variety · size" --> U
    EX --> DB
```

**Soma haraka:** RBAC decides *who* sees the map, the new indexes decide *how fast* the GeoJSON query answers, and Leaflet decides *how nice* it looks.

## 🗄️ Diagram 2 — Database relationships (geo hierarchy + role profiles)

```mermaid
erDiagram
    districts ||--o{ wards : "contains"
    districts ||--o{ officers : "covers"
    districts ||--o{ farmers : "home district"
    districts ||--o{ farms : "farm location"
    wards ||--o{ farmers : "home ward"
    wards ||--o{ farms : "farm ward"
    users ||--o| officers : "staff profile"
    users ||--o| farmers : "farmer profile"
    users ||--o| buyers : "buyer profile"
    farmers ||--o{ farms : "owns"
    farms ||--o{ farm_photos : "evidence"
    users ||--o{ farms : "reviews status"

    users {
        int id PK
        varchar email UK
        varchar role "6 roles"
        varchar status
    }
    officers {
        int id PK
        int user_id FK
        varchar title
        int district_id FK
    }
    buyers {
        int id PK
        int user_id FK
        varchar buyer_name
        decimal target_volume_kg
    }
    farmers {
        int id PK
        int user_id FK
        varchar national_id UK
        int ward_id FK
    }
    farms {
        int id PK
        int farmer_id FK
        decimal gps_latitude "Leaflet marker"
        decimal gps_longitude "Leaflet marker"
        varchar harvest_status
        int ward_id FK
    }
    farm_photos {
        int id PK
        int farm_id FK
        int is_verified
    }
    districts {
        int id PK
        varchar name UK
    }
    wards {
        int id PK
        int district_id FK
        varchar name
    }
```

- **RBAC** inasomea `users.role` (6 values) moja kwa moja — hakuna role table nyingine; `officers/farmers/buyers` ni profile extensions za `users`, zote zina `user_id UNIQUE`.
- **GIS join path:** `farms.gps_latitude/gps_longitude → GeoJSON feature → Leaflet marker`, na `farms.ward_id → wards → districts` hutaja eneo kamili kwenye popup.

## 🤖 Diagram 3 — AI-assisted fallback chain (this week)

```mermaid
flowchart LR
    T["🧠 Task: architecture diagram +<br/>Linux/SQL study guides"] --> G{"architecture-diagram<br/>skill ok?"}
    G -- yes --> D["🖼️ system_architecture.html<br/>dark theme + inline SVG"]
    G -- no --> C{"Cline + Claude ok?"}
    C -- yes --> D
    C -- no --> W{"Web LLM ok?"}
    W -- yes --> D
    W -- no --> OFF["📚 Offline: Cobbaut PDF,<br/>Oracle 11g PDF, whiteboard"]
    D --> V{"Opens in browser?<br/>columns match schema.sql?"}
    V -- no --> T
    V -- yes --> P["💾 Save to field_report/<br/>+ logbook entry"]
```

**Fallback rule of the week:** kila diagram/notes zinavalidheshwa dhidi ya `schema.sql` halisi — hakuna table au column iliyobuniwa ambayo haipo kwenye database.

## 🧰 Machinery & tools

| Area | Tools |
|---|---|
| Linux | Cobbaut *Linux Fundamentals* PDF, terminal practice |
| SQL | McGraw-Hill *Oracle 11g SQL* PDF, phpMyAdmin, `EXPLAIN` |
| RBAC | `includes/auth.php` role gate, `403.php` |
| GIS | Leaflet.js, OpenStreetMap tiles, `api/get_farms_geojson.php` |

## 📝 Ufafanuzi wa Kiufundi

- Indexi 9 mpya (`idx_orders_status`, `idx_farms_status`, `idx_farms_variety`, …) zilipimwa kwa `EXPLAIN` — GeoJSON queries hazisomi rows zote tena.
- `ON DELETE RESTRICT` kwenye `wards/districts` inazuia kufuta district yenye farms — data integrity ya kijiografia.
- Linux na Oracle ni *foundation reading* tu — hakuna claim ya mastery (honest, light tasks kama vilivyoagizwa).

---

[← README index](../README.md) · [Week 2 ←](WEEK-02.md) · [Week 4 →](WEEK-04.md)

