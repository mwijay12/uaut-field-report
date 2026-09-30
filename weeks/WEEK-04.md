# 📅 WEEK 4 — Python Automation, Async APIs, Security Hardening & Market Concurrency

**TTCL × UAUT Practical Training · David Erick Mwijage (Reg 250/13055)**

![Week](https://img.shields.io/badge/week-4_of_6-16A34A?style=for-the-badge)
![Dates](https://img.shields.io/badge/dates-14--18_Sep_2026-0EA5E9?style=for-the-badge)
![Focus](https://img.shields.io/badge/focus-REST_%2B_CSRF%2FXSS_%2B_Transactions-777BB4?style=for-the-badge)

[← README index](../README.md) · [Week 3 ←](WEEK-03.md) · [Week 5 →](WEEK-05.md)

> **Theme:** automate the boring parts (Python backups), make the UI snappier (async REST), lock the doors (CSRF/XSS/bcrypt), and stop double-selling harvests (transaction locking) — closed with a Sprint 2 demo over a live tunnel.

## 🗓️ Day-by-day

| Day | Date | Activity | Output |
|---|---|---|---|
| Mon | 14/09 | Python scripting for automated DB backup & audit (`mysql-connector`, scheduled dumps, row-integrity checks) | Backup + health-summary scripts |
| Tue | 15/09 | RESTful JSON endpoints + async Fetch (`api/get_wards.php`) — dynamic ward loading without reload | Snappier registration UX |
| Wed | 16/09 | CSRF/XSS hardening — `hash_equals` tokens on all POSTs, `htmlspecialchars` output escaping, bcrypt passwords | Audit-proof forms |
| Thu | 17/09 | Marketplace order dispatch + **concurrency transaction locking** (`BEGIN…COMMIT`), receipt module | Double-booking impossible |
| Fri | 18/09 | Dev environment setup (Node v24, Git 2.54, Python 3.11), E2E integration testing, Cloudflare tunnel demo, **Sprint 2 review** | Live link + supervisor sign-off |

## 🏗️ Diagram 1 — Architecture (what this week built)

```mermaid
flowchart TD
    subgraph Async["⚡ Tue 15/09 — async REST"]
        FE["fetch('api/get_wards.php')"] --> JS["JSON ward list<br/>dropdown without reload"]
    end
    B["🛒 Buyer orders a farm<br/>marketplace.php POST"] --> CS{"csrf_verify()<br/>hash_equals?"}
    CS -- invalid --> E["403 + attempt logged"]
    CS -- valid --> TX["mysqli_begin_transaction"]
    TX --> LK["SELECT ... FOR UPDATE<br/>lock the farm row"]
    LK --> CHK{"Harvest still<br/>available?"}
    CHK -- no --> RB["ROLLBACK<br/>'already booked' message"]
    CHK -- yes --> INS["INSERT market_requests<br/>order_code UNIQUE"]
    INS --> CM["COMMIT"]
    CM --> RC["receipt.php — printable receipt"]
    PY["🐍 Mon 14/09 — Python backup<br/>mysql-connector dump + row audit"] --> DB[("MariaDB")]
    TX --> DB
    INS --> DB
```

**Soma haraka:** two buyers clicking "order" at the same millisecond both enter `BEGIN`, but `SELECT … FOR UPDATE` hands the farm row to one of them; the loser rolls back with a polite message instead of corrupting stock.

## 🗄️ Diagram 2 — Database relationships (marketplace core)

```mermaid
erDiagram
    users ||--o| buyers : "profile"
    buyers ||--o{ market_requests : "places"
    farmers ||--o{ farms : "owns"
    farms ||--o{ market_requests : "ordered as"
    farmers ||--o{ market_requests : "receives"
    users ||--o{ market_requests : "buyer account"

    users {
        int id PK
        varchar email UK
        varchar role "incl buyer"
    }
    buyers {
        int id PK
        int user_id FK
        varchar buyer_name
        varchar company_name
        decimal target_volume_kg
    }
    farmers {
        int id PK
        int user_id FK
        varchar national_id UK
    }
    farms {
        int id PK
        int farmer_id FK
        varchar harvest_status
        decimal actual_harvest_kg
        decimal min_price_per_kg
    }
    market_requests {
        int id PK
        varchar order_code UK
        int farm_id FK
        int farmer_id FK
        int buyer_user_id FK
        decimal quantity_kg
        decimal offered_price_per_kg
        varchar status "pending/accepted/rejected/completed/cancelled"
    }
```

- `market_requests` ina **snapshot columns** (`farm_name_snapshot`, `buyer_name`) — oda inabaki na history hata kama farm/buyer watafutwa (`FK … SET NULL`).
- `order_code UNIQUE` + `BEGIN…COMMIT` transaction = hakuna double-booking wala duplicate order codes hata kwa race condition.

## 🤖 Diagram 3 — AI-assisted fallback chain (this week)

```mermaid
flowchart LR
    T["🧠 Task: transaction locking +<br/>CSRF/XSS audit"] --> G{"Antigravity IDE ok?"}
    G -- yes --> D["🤖 Draft: BEGIN..COMMIT block,<br/>token verification patch"]
    G -- no --> C{"Cline + Claude ok?"}
    C -- yes --> D
    C -- no --> W{"Web LLM ok?"}
    W -- yes --> D
    W -- no --> OFF["📚 Offline: MySQL manual,<br/>OWASP cheat sheets"]
    D --> V{"Verified?<br/>double-order blocked · token = 64 chars<br/>· DevTools shows escaped output"}
    V -- no --> T
    V -- yes --> P["💾 Commit + Sprint 2 demo notes"]
```

**Fallback rule of the week:** AI-written transaction code lazuliwa na *concurrency test ya mkono* — tabs mbili za browser, order moja, buyer mmoja lazima apate "already booked".

## 🧰 Machinery & tools

| Area | Tools |
|---|---|
| Automation | Python 3.11, `mysql-connector`, scheduled dumps |
| API | `api/get_wards.php`, Fetch API, Postman, Chrome DevTools |
| Security | `hash_equals`, `htmlspecialchars`, bcrypt |
| Concurrency | InnoDB transactions, `SELECT … FOR UPDATE` |
| Demo | Cloudflare tunnel (`npx cloudflared`), Node v24, Git 2.54 |

## 📝 Ufafanuzi wa Kiufundi

- `mysqli_begin_transaction` + `SELECT … FOR UPDATE` ni ngao dhidi ya *race condition* — buyer wawili hawawezi kunua yield moja.
- CSRF token ni 64-char, inathibitishwa na `hash_equals` (timing-safe); output zote zimeescape na `htmlspecialchars` — XSS imefungwa.
- Python backup script inaandika health summary (row counts per table) kwa archive ya TTCL IT.

---

[← README index](../README.md) · [Week 3 ←](WEEK-03.md) · [Week 5 →](WEEK-05.md)

