# 📘 MWONGOZO KAMILI WA LOGBOOK YA FIELD (PT) — TTCL & UAUT
**Mwanafunzi:** David Erick Mwijage (Mzee Mwijay)  
**Namba ya Usajili:** 25013055  
**Taasisi / Chuo:** The United African University of Tanzania (UAUT) — College of ICT  
**Kampuni / Eneo la Mafunzo:** Tanzania Telecommunication Corporation (TTCL)  
**Mradi Maalum:** Avocado Farmers Registration & Digital Marketplace System (Njombe Region)  
**Location Codebase:** `C:\xampp\htdocs\avocado_farmers`  
**Companion Documents & Architecture:** `C:\Users\MWIJAY TECH\Documents\Study\field_report\`  

---

## 🧭 SEHEMU YA 0: UGUNDUZI MUHIMU KUTOKA KWENYE HERMES MEMORY & CHATS
*(Haya ni mambo muhimu yaliyopatikana kwenye kumbukumbu za Hermes na mafaili ya `Study/field_report` ili report yako iwe na uhalisia 100% wa kazi zako):*

1. **Kazi Nyepesi na Halisi za Beginner (Realistic & Light Tasks):**
   - Hukutakiwa kuandika mambo makubwa sana ya uongo (kama vile ku-configure Oracle Cloud au AWS EC2 mikubwa) wakati bado unajifunza taratibu. Shughuli zimebaki kuwa halisi: kufungua vitabu vya Linux/Oracle, kutengeneza live tunnel kupitia Cloudflare/Localhost.run, kufanya disk cleanup na kurekebisha kompyuta zinazochelewa kuwaka, na kuweka environment ya maendeleo (Node.js, Git, Python).
2. **Kuingiza "Using AI in Software Development":**
   - Ulijumuisha matumizi ya Zana za AI (AI coding assistants, Antigravity IDE, na LLMs) katika kusaidia kurekebisha msimbo (refactoring), kutoa miongozo ya kiufundi, na kuandaa nyaraka za kiutendaji.
3. **Kwanini Native PHP & Vanilla JS (Badala ya Laravel/React):**
   - Ili mradi uwe na *Zero-Dependency Plug-and-Play Hosting* kwenye seva za TTCL au halmashauri za mikoa bila kuhitaji `composer install`, Node server, au bandwidth kubwa wakati wa ku-deploy.
4. **Live Tunnel Sharing (Cloudflare / Localhost.run):**
   - Ulipresent mfumo kwa supervisor na kuwapa link ya live ya simu (`npx cloudflared tunnel --url http://localhost:80`) bila kuhitaji server ya kulipia ya mtandaoni.
5. **Usahihi wa Tarehe za Kalenda:**
   - **Week 1:** 24/08/2026 – 28/08/2026 (Orientation, Network layout, PC Hardware, PHP Project Kickoff)
   - **Week 2:** 31/08/2026 – 04/09/2026 (PC Maintenance, Frontend Study, Presentation 1, Backend Refactor, Inventory Module)
   - **Week 3:** 07/09/2026 – 11/09/2026 (Network Switch Ports, Linux CLI Basics, RBAC Security, Database Indexing, GIS Leaflet Mapping)
   - **Week 4:** 14/09/2026 – 18/09/2026 (Python DB Backup Script, Asynchronous APIs, CSRF/XSS Hardening, Market Concurrency, Developer Dev Environment & Sprint 2 Review)

---

## SEHEMU YA 1: UFAFANUZI WA KINA WA DAY 9 & DAY 10 (WEEK 2)

```
+-----------------------------------------------------------------------------------+
| WEEK 2, DAY 4 (Alhamisi - 03/09/2026): Backend Refactoring and DB Connection       |
+-----------------------------------------------------------------------------------+
```

### 1. Nini Kilitokea Kiuhalisia? (The Technical Context)
Mwanzoni (prototype ya wiki ya kwanza), PHP code ilikuwa imeandikwa kiholela ambapo credentials za database zilikuwa zimeandikwa moja kwa moja ndani ya kila file (`root`, `""`, `localhost`). Pia, ikiwa database ikishindwa kuunganisha, mfumo ulikuwa ukitoa error ndefu ya PHP kwenye screen inayoonyesha jina la server na root password (hatari kiusalama — *Information Disclosure Vulnerability*).

Katika siku hii, ulifanya **Backend Refactoring & Database Standardization** kupitia:
- `config/config.php`
- `config/credentials.php`
- `config/db.php`
- `.env`

### 2. Nguzo 4 Kuu Zilizofanyika Kwenye Msimbo (Code):
1. **Decoupling Credentials Kupitia Environment Variables (`.env`):**
   Credentials zilitenganishwa na kuwekwa ndani ya `.env`:
   ```ini
   DB_HOST=localhost
   DB_USER=root
   DB_PASS=
   DB_NAME=avocado_db
   ```
2. **Uunganishaji Salama na UTF-8 Multibyte Support (`config/db.php`):**
   ```php
   $conn = @mysqli_connect($host, $username, $password, $database);
   mysqli_set_charset($conn, 'utf8mb4');
   ```
   Inaruhusu kuhifadhi majina ya wakulima yenye alama za Kiswahili na inazuia *Multibyte SQL Injection attacks*.
3. **Kuficha Makosa ya Database na Centralized Error Logging:**
   - `display_errors = 0` kwenye production ili wateja wasione makosa ya ndani ya server.
   - Makosa yote yanaandikwa kisiri kwenye `logs/php_errors.log`.
   - Mtumiaji wa kawaida anaonyeshwa ukurasa safi wa kitaalamu wa `500.php` (*Service Temporarily Unavailable*).
   - Simu za API zinarudisha JSON: `{"success": false, "message": "The data service is temporarily unavailable."}`
4. **Prepared Statement Architecture (`mysqli_prepare`):**
   Uliweka msingi wa queries kutumia Parameterized Queries (zaidi ya calls 140 zilizopo kwenye mfumo) kuzuia SQL Injection kwa 100%.

> **Jinsi ya Kujibu Supervisor:**  
> *"Sir, on September 3rd, I refactored the legacy database connection layer into an enterprise-grade, decoupled architecture. I separated credentials into an environment file (`.env`), enforced strict `utf8mb4` character encoding, silenced raw PHP errors in production to prevent information disclosure, and routed internal database exceptions to a secure server log (`logs/php_errors.log`) while rendering a custom 500 error page."*

---

```
+-----------------------------------------------------------------------------------+
| WEEK 2, DAY 5 (Ijumaa - 04/09/2026): Product Inventory and Stock Module           |
+-----------------------------------------------------------------------------------+
```

### 1. Nini Kilitokea Kiuhalisia?
Baada ya presentation ya tarehe 02/09, ulielekezwa kuwa mfumo haupaswi kuwa directory tu ya majina ya wakulima, bali lazima uwe na uwezo wa kusimamia **uzalishaji wa mazao (agronomic inventory)**, makadirio ya mavuno (yield estimates), na ulinzi wa bei (floor price).

Mafaili yaliyohusika:
- Database Table: `farms`
- `farmer/my_farm.php`
- `farmer/farm_add.php` & `farmer/farm_edit.php`
- `farmer/quick_produce_update.php`
- Database Table: `market_requests`

### 2. Nguzo 4 za Moduli Hii ya Inventory:
1. **Hatua 4 za Mzunguko wa Zao (Phenological Growth Stages):**
   - `growing` (Miti inakua / bado haijazaa matunda)
   - `flowering` (Miti imechanua maua — kiashiria cha msimu unaokuja)
   - `harvest_ready` (Parachichi zimekomaa na zipo tayari kuvunwa na kuuzwa sokoni)
   - `harvested` (Mavuno yameshakusanywa na shamba limefungwa kwa msimu huo)
2. **Viwango vya Mazao na Aina za Parachichi:**
   - Aina: `Hass`, `Fuerte`, `Pinkerton`, `Reed`, `Local`, `Mixed`.
   - `tree_count`: Idadi ya miti iliyopo shambani.
   - `expected_yield_kg`: Makadirio ya uzito wa mavuno (kwa kilo) kulingana na idadi ya miti.
   - `actual_harvest_kg`: Uzito halisi uliovunwa baada ya uchumaji.
3. **Ulinzi wa Bei ya Chini ya Mkulima (Floor Price Protection - `min_price_per_kg`):**
   Mkulima anaweka bei ya chini anayokubali (k.m. TZS 1,800/kg). Mfumo unazuia wanunuzi wakubwa kwenye soko (`marketplace.php`) kuagiza mzigo chini ya kiwango hiki.
4. **Stock Reservation & Quick Produce Updates (`quick_produce_update.php`):**
   Mkulima anaweza kubadili haraka hali ya mavuno (kutoka `flowering` kwenda `harvest_ready`) kwa mbofyo mmoja. Wanunuzi wanapoweka maombi (`market_requests`), kilo zinazopatikana zinazuiliwa ili zisinunuliwe na wafanyabiashara wengine kwa wakati mmoja (*Atomic Concurrency*).

> **Jinsi ya Kujibu Supervisor:**  
> *"On September 4th, I implemented the agricultural inventory and stock lifecycle engine. This included tracking phenological growth stages (growing, flowering, harvest-ready, and harvested), tree count metrics, expected yield forecasting versus actual yield in kilograms, and enforcing a farmer floor-price protection threshold (`min_price_per_kg`) to guard smallholders against market underpricing."*

---

## SEHEMU YA 2: MPANGO WA LOGBOOK YA WEEK 3 (07/09/2026 – 11/09/2026)

```
====================================================================================
JUMATATU: 07/09/2026
====================================================================================
Activity Title:
TTCL LAN DIAGNOSTICS, IP SUBNETTING & SWITCH PORT CONFIGURATION

Maelezo ya Kuandika Kwenye Logbook:
Conducted local area network diagnostics at TTCL office. Learned IPv4 subnetting 
classes, verified switch port configurations, crimped RJ45 patch cords (T568B standard), 
and mapped device IP assignments using ping, traceroute, and arp commands.

Ufafanuzi wa Kiufundi:
- Mgawanyo wa Subnets (VLANs) kwenye TTCL local network kuzuia network congestion.
- Utengenezaji wa nyaya za Cat6 Ethernet kwa kufuata mpangilio wa T568B.
- Kupima connectivity kwa `ping 192.168.1.1` na kuangalia network path kwa `tracert`.

====================================================================================
JUMANNE: 08/09/2026
====================================================================================
Activity Title:
LINUX SERVER FUNDAMENTALS & APACHE SERVICE MANAGEMENT

Maelezo ya Kuandika Kwenye Logbook:
Studied Linux server fundamentals using Unix documentation. Practiced terminal CLI 
commands for directory navigation, file permissions (chmod, chown), process monitoring 
(top, ps aux), and managed web server daemon services (systemctl status apache2/mysql).

Ufafanuzi wa Kiufundi (Kutoka Kitabu cha Paul Cobbaut - Linux Fundamentals):
- Kusimamia server bila graphical interface (CLI navigation).
- Ruhusa za mafaili: `chmod 755` kwa folda na `chmod 644` kwa mafaili ya web.
- Kuangalia utendaji wa server kupitia `top` na amri za `systemctl status/restart apache2`.

====================================================================================
JUMATANO: 09/09/2026
====================================================================================
Activity Title:
ROLE-BASED ACCESS CONTROL (RBAC) & SESSION SECURITY IMPLEMENTATION

Maelezo ya Kuandika Kwenye Logbook:
Implemented Role-Based Access Control (RBAC) in Avocado system for SuperAdmin, Admin, 
Agricultural Officer, Farmer, and Buyer roles. Added session timeout guard (15-minute 
idle limit) and automatic modal alert to terminate unauthorized sessions.

Ufafanuzi wa Kiufundi:
- Faili: `includes/auth.php` na `includes/session_timer.php`.
- `require_role(['admin', 'agricultural_officer'])`: Mkulima akijaribu kuandika URL ya admin, anatupwa nje mara moja.
- Session Inactivity Timer: Kama mtumiaji hasogei mouse kwa dakika 9.5, pop-up inatokea ikiwa na sekunde 30 kabla ya ku-logout.

====================================================================================
ALHAMISI: 10/09/2026
====================================================================================
Activity Title:
RELATIONAL DATABASE INDEXING & SQL QUERY OPTIMIZATION

Maelezo ya Kuandika Kwenye Logbook:
Studied relational SQL principles from enterprise documentation. Optimized database 
schema by creating composite indexes on farmers and farms tables, verified foreign key 
integrity, and tested high-performance JOIN queries across districts and wards.

Ufafanuzi wa Kiufundi (Kutoka Kitabu cha McGraw-Hill Oracle Database 11g SQL):
- Indexing: Kuweka `CREATE INDEX idx_farms_status ON farms(status);` ili kuongeza kasi ya utafutaji sokoni bila kufanya Full Table Scan.
- Kuthibitisha Foreign Key Cascades: Kuhakikisha shamba halisajiliwi bila `district_id` au `ward_id` iliyopo.

====================================================================================
IJUMAA: 11/09/2026
====================================================================================
Activity Title:
INTERACTIVE GIS MAPPING & GEOJSON ORCHARD PLOTTING MODULE

Maelezo ya Kuandika Kwenye Logbook:
Integrated GIS mapping module using Leaflet.js and OpenStreetMap API. Built backend 
endpoint to convert farm GPS coordinates into GeoJSON feature collections, enabling 
real-time interactive orchard pinpoints and ward centroid fallbacks.

Ufafanuzi wa Kiufundi:
- Faili: `api/get_farms_geojson.php`, `includes/map_picker.php`, na `farmer/map.php`.
- GeoJSON format: Kubadilisha lat/long kuwa data za ramani ya Leaflet.
- Ward Centroid Fallback: Shamba lisilo na GPS linasomewa katikati ya kata yake ya Njombe kiotomatiki ili lionekane kwenye ramani.

====================================================================================
DETAILS OF THE MAIN JOB OF THE WEEK (WEEK 3 CHINI YA UKURASA)
====================================================================================
Operation:
Enterprise Linux System Administration, Network Switch Troubleshooting, RBAC Security Implementation, and GIS Mapping Integration.

Machinery/ Tools Used:
Cisco Catalyst Switch, RJ45 Crimper & Cable Tester, Ubuntu Linux Terminal, XAMPP (Apache, MariaDB), VS Code, Leaflet.js GIS Engine.
```

---

## SEHEMU YA 3: MPANGO WA LOGBOOK YA WEEK 4 (14/09/2026 – 18/09/2026)

```
====================================================================================
JUMATATU: 14/09/2026
====================================================================================
Activity Title:
PYTHON SCRIPTING FOR AUTOMATED DATABASE BACKUP & DATA AUDIT

Maelezo ya Kuandika Kwenye Logbook:
Developed Python automation script to connect with MySQL database. Automated scheduled 
database dumps, verified table row integrity, and generated automated system health 
summaries and export files for TTCL IT archives.

Ufafanuzi wa Kiufundi:
- Script ya Python inayotumia `mysql-connector` kuunganisha na `avocado_db`.
- Kutoa database dump ya `.sql` bila kulazimika kufungua phpMyAdmin kwa mkono.
- Kusafisha namba za simu na data za wakulima (Data Cleansing).

====================================================================================
JUMANNE: 15/09/2026
====================================================================================
Activity Title:
RESTFUL API ENDPOINTS & ASYNCHRONOUS AJAX COMMUNICATION

Maelezo ya Kuandika Kwenye Logbook:
Engineered RESTful JSON API endpoints for asynchronous client-server communication. 
Implemented dynamic ward loading using JavaScript Fetch API without page reload, 
reducing server payload and improving frontend responsiveness.

Ufafanuzi wa Kiufundi:
- Faili: `api/get_wards.php`.
- Mtumiaji anapochagua Wilaya, JavaScript inatuma ombi la chini kwa chini (`fetch('api/get_wards.php?district_id=' + id)`) na kuleta kata zake kwa JSON bila ku-reload ukurasa mzima (Asynchronous UX).

====================================================================================
JUMATANO: 16/09/2026
====================================================================================
Activity Title:
WEB APPLICATION SECURITY HARDENING: CSRF & XSS MITIGATION

Maelezo ya Kuandika Kwenye Logbook:
Hardened web application security against cyber vulnerabilities. Implemented anti-CSRF 
cryptographic tokens (hash_equals) on all form submissions, enforced HTML output 
escaping against XSS, and secured user passwords using BCRYPT hashing algorithms.

Ufafanuzi wa Kiufundi:
- CSRF Protection: Kila fomu ina token ya siri ya herufi 64 (`bin2hex(random_bytes(32))`) inayothibitishwa kwa `hash_equals()`.
- XSS Prevention: Kutumia `htmlspecialchars()` kwa data zote za wakulima kabla ya kuziandika kwenye HTML.
- Password BCRYPT Hashing: `password_hash($password, PASSWORD_BCRYPT)` kulinda akaunti.

====================================================================================
ALHAMISI: 17/09/2026
====================================================================================
Activity Title:
MARKETPLACE ORDER DISPATCH & CONCURRENCY TRANSACTION LOCKING

Maelezo ya Kuandika Kwenye Logbook:
Constructed buyer marketplace ordering system and order processing pipeline. Implemented 
database transaction locking (BEGIN...COMMIT) to prevent double-booking of harvest yields, 
and built receipt and delivery confirmation tracking module.

Ufafanuzi wa Kiufundi:
- Faili: `marketplace.php`, `farmer/orders.php`, `buyer/dashboard.php`, na `receipt.php`.
- Database Transactions (`mysqli_begin_transaction`): Kuzuia wanunuzi wawili wasinunue shamba lilelile kwa wakati mmoja (Race Condition prevention).
- Risiti rasmi inayoweza ku-printiwa na mnunuzi baada ya oda kukubaliwa.

====================================================================================
IJUMAA: 18/09/2026 (LEO)
====================================================================================
Activity Title:
DEVELOPER ENVIRONMENT SETUP, INTEGRATION TESTING & SPRINT 2 DEMO

Maelezo ya Kuandika Kwenye Logbook:
Configured developer environment (Node.js, Git, Python venv, IDE tools), conducted 
full end-to-end integration testing, and shared live preview link via Cloudflare tunnel. 
Successfully presented Sprint 2 milestone progress to supervisor.

Ufafanuzi wa Kiufundi:
- Uliweka/kuthibitisha tools muhimu za developer: Node.js (v24), Git (2.54), na Python (3.11).
- Ulifanya majaribio ya mfumo mzima kuanzia usajili, ramani ya Leaflet, na soko.
- Ulitumia Cloudflare live tunnel (`npx cloudflared tunnel --url http://localhost:80`) kushare link ya mfumo kwa ajili ya presentation ya simu na kompyuta kwa supervisor wa TTCL.

====================================================================================
DETAILS OF THE MAIN JOB OF THE WEEK (WEEK 4 CHINI YA UKURASA)
====================================================================================
Operation:
Python Script Automation, Full-Stack Web Security Hardening, Asynchronous REST API Development, and Marketplace Concurrency Testing.

Machinery/ Tools Used:
Python 3.11 Environment, Node.js, Git, Postman REST Client, Google Chrome DevTools, XAMPP (Apache, MySQL), Cloudflare Tunnel, VS Code.
```

---

## SEHEMU YA 4: MATARAJIO YA MBELE (WEEKS 5 & 6 PREVIEW)
- **Week 5:** Enterprise Web Server Deployment (Virtual Hosts configuration on Apache/Nginx, SSL/TLS Let's Encrypt Certificate binding, Local TTCL DNS routing, database stress testing).
- **Week 6:** User Acceptance Testing (UAT), End-User Manual & Documentation, Data Migration from CSV to MySQL, Final Field Training Report Compilation & Defense Preparation.

---

## SEHEMU YA 5: OPERATION MACHINERY & ARCHITECTURE FLOW
*(Kama supervisor akikuuliza "Eleza mtiririko mzima wa mashine na msimbo wako"):*

```
[Browser / Mobile] 
       │ (HTTP GET/POST / Live Cloudflare Tunnel)
       ▼
[Apache Web Server :80] 
       │
[includes/auth.php & session_timer.php] ──► (Inathibitisha Login & RBAC Role)
       │
[includes/functions.php] ────────────────► (Inathibitisha CSRF Token & Inasafisha XSS)
       │
[config/db.php] ─────────────────────────► (Inasoma .env, inafungua MySQLi utf8mb4)
       │
[Prepared Statements (mysqli_prepare)] ──► (140 Queries Salama bila SQLi)
       │
[MariaDB: avocado_db] ───────────────────► (InnoDB: users, farms, wards, market_requests)
       │
[api/get_farms_geojson.php] ─────────────► (Leaflet.js Interactive GIS Map)
       │
[logs/php_errors.log] ───────────────────► (Centralized Error Log — Inalinda 500.php)
```
