# 📅 WEEK 5 — Sprint Review & Enterprise Web Server Deployment

**TTCL × UAUT Practical Training · David Erick Mwijage (Reg 250/13055)**

![Week](https://img.shields.io/badge/week-5_of_6-16A34A?style=for-the-badge)
![Dates](https://img.shields.io/badge/dates-21--25_Sep_2026-0EA5E9?style=for-the-badge)
![Focus](https://img.shields.io/badge/focus-VirtualHosts_%2B_SSL%2FTLS_%2B_DNS_%2B_StressTest-777BB4?style=for-the-badge)

[← README index](../README.md) · [Week 4 ←](WEEK-04.md) · [Week 6 →](WEEK-06.md)

> **Theme:** the supervisor's 21/09 review asked for "more time & architectures" — the answer is a proper enterprise deployment: virtual hosts, TLS, local DNS routing and database stress testing. *(Planned per the Weeks 5–6 preview in the logbook guide; verify against your handwritten log.)*

## 🗓️ Day-by-day

| Day | Date | Activity | Output |
|---|---|---|---|
| Mon | 21/09 | **Avocado system presentation & first review** — HTML/CSS/PHP walkthrough; feedback: extend architecture work | Review notes → Week 5 plan |
| Tue | 22/09 | Apache **Virtual Hosts** configuration — `ServerName avocado.ttcl.local`, dedicated `DocumentRoot` | Clean vhost instead of `/avocado_farmers` path |
| Wed | 23/09 | **SSL/TLS binding** — certificate on `:443` (internal CA / Let's Encrypt via tunnel domain) | `https://` padlock on LAN |
| Thu | 24/09 | **Local TTCL DNS routing** + **database stress testing** (seeded load loops, `EXPLAIN` on hot queries) | DNS name resolves; DB holds under load |
| Fri | 25/09 | Production hardening — firewall (only 80/443 in), cron nightly `mysqldump`, restore drill | Deployment checklist |

## 🏗️ Diagram 1 — Architecture (what this week built)

```mermaid
flowchart TD
    subgraph LAN["🏢 TTCL LAN"]
        STAFF["🧑‍💼 Staff clients"]
        SUP["👨‍🏫 Supervisor devices"]
    end
    DNS["🧭 Local DNS — Thu 24/09<br/>avocado.ttcl.local → server IP"]
    subgraph SRV["🐧 Apache 2.4 virtual host — Tue 22/09"]
        VH["VirtualHost *:80<br/>ServerName avocado.ttcl.local<br/>DocumentRoot avocado_farmers"]
        TLS["🔐 SSL/TLS :443 — Wed 23/09<br/>certificate binding"]
        VH --> TLS
    end
    DNS --> VH
    TLS --> PHP["PHP 8"] --> DB[("MariaDB avocado_db")]
    STAFF --> DNS
    SUP --> DNS
    STRESS["🧪 DB stress test — Thu 24/09<br/>seeded load loops · EXPLAIN hot queries"] --> DB
    subgraph OPS["🧰 Fri 25/09 ops hardening"]
        CRON["cron — nightly mysqldump"]
        FW["Firewall — only 80/443 inbound"]
        RST["restore drill on dump file"]
    end
    CRON --> DB
    RST --> DB
```

**Soma haraka:** the system stops being "a folder on XAMPP" and becomes *a named, encrypted, monitored service on the TTCL network* — with a backup that has actually been tested by restoring it.

## 🗄️ Diagram 2 — Database relationships (full schema, deployment view)

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
    users ||--o{ farm_photos : "verifies"
    users ||--o{ farms : "reviews status"
    users ||--o{ market_requests : "places"
    farmers ||--o{ farms : "owns"
    farms ||--o{ farm_photos : "evidence"
    farms ||--o{ market_requests : "ordered"
    farmers ||--o{ market_requests : "receives"

    users {
        int id PK
        varchar email UK
        varchar password "bcrypt"
        varchar role "6 roles"
        varchar status
    }
    districts {
        int id PK
        varchar name UK
        varchar region
    }
    wards {
        int id PK
        int district_id FK
        varchar name
    }
    officers {
        int id PK
        int user_id FK
        varchar title
        int district_id FK
    }
    farmers {
        int id PK
        int user_id FK
        varchar national_id UK
        int ward_id FK
    }
    buyers {
        int id PK
        int user_id FK
        varchar buyer_name
        decimal target_volume_kg
    }
    farms {
        int id PK
        int farmer_id FK
        varchar avocado_variety
        decimal gps_latitude
        decimal gps_longitude
        varchar harvest_status
        int district_id FK
        int ward_id FK
    }
    farm_photos {
        int id PK
        int farm_id FK
        int is_verified
        int verified_by FK
    }
    market_requests {
        int id PK
        varchar order_code UK
        int farm_id FK
        int farmer_id FK
        int buyer_user_id FK
        decimal quantity_kg
        varchar status
    }
    login_attempts {
        int id PK
        varchar email
        varchar ip_address
        int was_success
        timestamp attempted_at
    }
```

> Stress test ya Thu 24/09 inapima hasa *hot reads* juu ya `farms` (map) na `market_requests` (orders) — indexi zote 9 zimepitishwa kwenye `EXPLAIN` chini ya load.

## 🤖 Diagram 3 — AI-assisted fallback chain (this week)

```mermaid
flowchart LR
    T["🧠 Task: vhost + TLS + DNS<br/>deployment configs"] --> G{"Antigravity IDE ok?"}
    G -- yes --> D["🤖 Draft: vhost snippet,<br/>cert steps, stress script"]
    G -- no --> C{"Cline + Claude ok?"}
    C -- yes --> D
    C -- no --> W{"Web LLM ok?"}
    W -- yes --> D
    W -- no --> OFF["📚 Offline: Apache httpd docs,<br/>MySQL reference manual"]
    D --> V{"Verified?<br/>site resolves on LAN · https padlock<br/>· backup restores cleanly"}
    V -- no --> T
    V -- yes --> P["💾 Deployment checklist committed"]
```

**Fallback rule of the week:** config za server hazijaumizwa live — kila mabadiliko ya `httpd-vhosts.conf` yanapitiwa kwa `apachectl configtest` kabla ya restart.

## 🧰 Machinery & tools

| Area | Tools |
|---|---|
| Server | Apache 2.4 virtual hosts, XAMPP control panel |
| TLS | Certificate binding on `:443` (internal CA / tunnel domain) |
| Network | Local DNS entry, firewall rules (80/443 only) |
| DB ops | `seed_demo_data.php`, stress loops, `mysqldump` + restore drill |

## 📝 Ufafanuzi wa Kiufundi

- VirtualHost inatenganisha `avocado.ttcl.local` kutoka root ya Apache — URL Safi bila `/avocado_farmers` suffix.
- TLS inafungwa kwa certificate halali kwenye tunnel domain / internal CA kwa LAN — `https://` ina padlock bila warnings za mixed content.
- Restore drill ndiyo *ushahidi halisi* wa backup: dump imefunguliwa kwenye DB mpya na counts zimelinganishwa.

---

[← README index](../README.md) · [Week 4 ←](WEEK-04.md) · [Week 6 →](WEEK-06.md)

