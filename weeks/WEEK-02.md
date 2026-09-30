# 📅 WEEK 2 — Maintenance, Presentation 1, Backend Refactor & Inventory

**TTCL × UAUT Practical Training · David Erick Mwijage (Reg 250/13055)**

![Week](https://img.shields.io/badge/week-2_of_6-16A34A?style=for-the-badge)
![Dates](https://img.shields.io/badge/dates-31_Aug--04_Sep_2026-0EA5E9?style=for-the-badge)
![Focus](https://img.shields.io/badge/focus-Refactor_%2B_Security_%2B_Inventory-777BB4?style=for-the-badge)

[← README index](../README.md) · [Week 1 ←](WEEK-01.md) · [Week 3 →](WEEK-03.md)

> **Theme:** clean the machines, show the prototype to the panel, then make the backend worthy of it — config decoupling, prepared statements, custom error pages, and the stock/photo-verification module.

## 🗓️ Day-by-day

| Day | Date | Activity | Output |
|---|---|---|---|
| Mon | 31/08 | Computer maintenance & disk optimization — de-dusting, OS updates, disk cleanup, slow-boot fix | Faster booting office PCs |
| Tue | 01/09 | Frontend study & system design polish (brand palette, layout) | UI cleanup for demo |
| Wed | 02/09 | **Presentation 1** to panel — farmer registration, farm maps, marketplace, photo verification on localhost | Review + suggestions |
| Thu | 03/09 | **Backend refactoring & DB standardization** — `.env` → `config/credentials.php` → `config/db.php`, `mysqli_prepare`, custom `500.php` | Secure, leak-free backend |
| Fri | 04/09 | Product inventory/stock module + photo verification pipeline (`farmer/upload_process.php`, `farm_photos`) | Stock + evidence module |

## 🏗️ Diagram 1 — Architecture (what this week built)

```mermaid
flowchart TD
    subgraph Client["👤 Browser (demo build of Tue 01/09)"]
        FORM["POST forms — login · register · upload"]
    end
    subgraph Conf["⚙️ Config layer — refactored Thu 03/09"]
        ENVF[".env<br/>DB_HOST · DB_USER · DB_PASS"]
        CRED["config/credentials.php"]
        DBC["config/db.php<br/>mysqli utf8mb4"]
        ENVF --> CRED --> DBC
    end
    subgraph Sec["🛡️ Hardened request flow"]
        AUTH["includes/auth.php<br/>session timeout 900s"]
        CSRF["csrf_verify()<br/>hash_equals 64-char token"]
        PS["mysqli_prepare() across 60+ files"]
    end
    subgraph Err["🚨 Error strategy"]
        LOG["logs/php_errors.log"]
        C5["500.php friendly page<br/>no server/root leak"]
    end
    INV["📦 Fri 04/09 — inventory module<br/>farmer/upload_process.php<br/>stock + photo pipeline"]

    FORM --> AUTH --> CSRF --> PS --> DBC --> DB[("MariaDB avocado_db")]
    INV --> PS
    PS -- "on failure" --> LOG --> C5
```

**Soma haraka:** credentials left the source code (`.env`), every query became a prepared statement, and a failed query now logs quietly and shows a friendly page instead of leaking `root` + server name.

## 🗄️ Diagram 2 — Database relationships (inventory & photo evidence)

```mermaid
erDiagram
    users ||--o| farmers : "profile"
    farmers ||--o{ farms : "owns"
    farms ||--o{ farm_photos : "evidence"
    users ||--o{ farm_photos : "verifies"

    users {
        int id PK
        varchar email UK
        varchar password "bcrypt"
        varchar role
        varchar status
    }
    login_attempts {
        int id PK
        varchar email
        varchar ip_address
        int was_success
        timestamp attempted_at "brute-force audit - no FK"
    }
    farmers {
        int id PK
        int user_id FK
        varchar national_id UK
        varchar phone
    }
    farms {
        int id PK
        int farmer_id FK
        varchar avocado_variety
        varchar harvest_status
        decimal expected_yield_kg
    }
    farm_photos {
        int id PK
        int farm_id FK
        varchar filename
        int is_verified
        int verified_by FK
    }
```

- `login_attempts` ni **audit table** bila FK — 5 failed logins / 15 min zinafunga IP/email (brute-force lockout, Week 2 security sweep).
- `farm_photos.verified_by → users.id` (`SET NULL`): afisa anayethibitisha picha akiondolewa, picha haipotei.

## 🤖 Diagram 3 — AI-assisted fallback chain (this week)

```mermaid
flowchart LR
    T["🧠 Task: decouple config +<br/>harden DB connection"] --> G{"Antigravity IDE<br/>refactor agent ok?"}
    G -- yes --> D["🤖 Draft: .env split,<br/>db.php rewrite, 500.php"]
    G -- no --> C{"Cline + Claude ok?"}
    C -- yes --> D
    C -- no --> W{"Web LLM ok?"}
    W -- yes --> D
    W -- no --> OFF["📚 Offline: PHP manual<br/>+ own refactoring notes"]
    D --> V{"Verified?<br/>app boots · bad creds → 500.php<br/>· hash_equals passes"}
    V -- no --> T
    V -- yes --> P["💾 Commit + backend_refactor_notes.md"]
```

**Fallback rule of the week:** AI inapewa diff kabla ya commit; ikiwa manual tests hazipati, refactor inarudishwa (`git checkout`) — hakuna half-baked config kwenye `htdocs`.

## 🧰 Machinery & tools

| Area | Tools |
|---|---|
| Maintenance | Compressed air, isopropyl alcohol, disk cleanup utilities, OS updates |
| Backend | PHP 8, MariaDB, `.env`, phpMyAdmin, VS Code |
| Security | bcrypt (`password_hash`), CSRF token generator, error log review |
| Demo | Apache localhost, projector for Presentation 1 |

## 📝 Ufafanuzi wa Kiufundi

- Credentials **hazipo tena** kwenye source — `.env` inasomwa na `config/db.php` pekee; `500.php` inazuia *information disclosure* ya server name + root password.
- `mysqli_prepare` ilisambazwa kwenye files zote 60+ — SQLi door imefungwa kabisa.
- Stock module inatumia `farm_photos` kama *evidence chain*: picha isiyothibitishwa haionekani kwa buyers.

---

[← README index](../README.md) · [Week 1 ←](WEEK-01.md) · [Week 3 →](WEEK-03.md)

