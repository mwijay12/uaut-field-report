import os
import sys
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn
import win32com.client

def set_cell_background(cell, fill_hex):
    tcPr = cell._element.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._element.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('w:top', top), ('w:bottom', bottom), ('w:left', left), ('w:right', right)]:
        node = OxmlElement(m)
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def set_table_borders(table, color="D3D3D3", sz="4", val="single"):
    tblPr = table._element.xpath('w:tblPr')
    if tblPr:
        borders = parse_xml(
            f'<w:tblBorders {nsdecls("w")}>'
            f'  <w:top w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
            f'  <w:bottom w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
            f'  <w:left w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
            f'  <w:right w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
            f'  <w:insideH w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
            f'  <w:insideV w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
            f'</w:tblBorders>'
        )
        tblPr[0].append(borders)

def add_header_banner(doc, title, subtitle):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(2)
    run_uni = p.add_run("THE UNITED AFRICAN UNIVERSITY OF TANZANIA\n")
    run_uni.font.name = "Arial"
    run_uni.font.size = Pt(13)
    run_uni.font.bold = True
    run_uni.font.color.rgb = RGBColor(0x1B, 0x36, 0x5D) # Navy Blue

    run_col = p.add_run("COLLEGE OF INFORMATION AND COMMUNICATION TECHNOLOGIES\n")
    run_col.font.name = "Arial"
    run_col.font.size = Pt(11)
    run_col.font.bold = True
    run_col.font.color.rgb = RGBColor(0x33, 0x33, 0x33)

    run_doc = p.add_run(title)
    run_doc.font.name = "Arial"
    run_doc.font.size = Pt(14)
    run_doc.font.bold = True
    run_doc.font.color.rgb = RGBColor(0x1B, 0x4D, 0x3E) # Forest Green

    if subtitle:
        p_sub = doc.add_paragraph()
        p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_sub.paragraph_format.space_after = Pt(8)
        run_sub = p_sub.add_run(subtitle)
        run_sub.font.name = "Calibri"
        run_sub.font.size = Pt(10)
        run_sub.font.italic = True
        run_sub.font.color.rgb = RGBColor(0x66, 0x66, 0x66)

def add_student_metadata_card(doc, week_no, from_date, to_date):
    tbl = doc.add_table(rows=2, cols=2)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    
    col_widths = [Inches(4.2), Inches(2.8)]
    for row in tbl.rows:
        for i, w in enumerate(col_widths):
            row.cells[i].width = w
            set_cell_background(row.cells[i], "F4F6F8")
            set_cell_margins(row.cells[i], top=80, bottom=80, left=120, right=120)

    # Cell 0,0: Student Info
    c0 = tbl.cell(0, 0)
    p0 = c0.paragraphs[0]
    p0.paragraph_format.space_after = Pt(2)
    r = p0.add_run("STUDENT'S NAME: ")
    r.font.bold = True
    r.font.size = Pt(9.5)
    p0.add_run("DAVID ERICK MWIJAGE").font.size = Pt(9.5)

    p0_2 = c0.add_paragraph()
    p0_2.paragraph_format.space_after = Pt(0)
    r2 = p0_2.add_run("COMPANY / INSTITUTION: ")
    r2.font.bold = True
    r2.font.size = Pt(9.5)
    p0_2.add_run("TANZANIA TELECOMMUNICATION CORPORATION (TTCL)").font.size = Pt(9.5)

    # Cell 0,1: Reg No & Period
    c1 = tbl.cell(0, 1)
    p1 = c1.paragraphs[0]
    p1.paragraph_format.space_after = Pt(2)
    r3 = p1.add_run("REG. NO: ")
    r3.font.bold = True
    r3.font.size = Pt(9.5)
    p1.add_run("25013055").font.size = Pt(9.5)

    p1_2 = c1.add_paragraph()
    p1_2.paragraph_format.space_after = Pt(0)
    r4 = p1_2.add_run("ACADEMIC YEAR: ")
    r4.font.bold = True
    r4.font.size = Pt(9.5)
    p1_2.add_run("2025/2026 (BSc ICT)").font.size = Pt(9.5)

    # Row 1 spans across: Week number banner
    c_wk = tbl.cell(1, 0)
    c_wk.merge(tbl.cell(1, 1))
    set_cell_background(c_wk, "1B4D3E")
    p_wk = c_wk.paragraphs[0]
    p_wk.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_wk.paragraph_format.space_before = Pt(4)
    p_wk.paragraph_format.space_after = Pt(4)
    run_wk = p_wk.add_run(f"WEEK NO: {week_no}          |          FROM: {from_date}          TO: {to_date}")
    run_wk.font.name = "Arial"
    run_wk.font.size = Pt(10)
    run_wk.font.bold = True
    run_wk.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

    set_table_borders(tbl, color="1B4D3E", sz="6")
    doc.add_paragraph().paragraph_format.space_after = Pt(4)

def add_weekly_log_table(doc, days_data, main_job_operation, main_job_tools):
    tbl = doc.add_table(rows=1 + len(days_data) + 1, cols=2)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False

    tbl.columns[0].width = Inches(1.8)
    tbl.columns[1].width = Inches(5.2)

    # Header row
    hdr = tbl.rows[0]
    c0, c1 = hdr.cells[0], hdr.cells[1]
    set_cell_background(c0, "1B365D")
    set_cell_background(c1, "1B365D")
    set_cell_margins(c0, top=100, bottom=100, left=100, right=100)
    set_cell_margins(c1, top=100, bottom=100, left=100, right=100)

    p0 = c0.paragraphs[0]
    p0.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r0 = p0.add_run("DAY / DATE")
    r0.font.bold = True
    r0.font.size = Pt(9.5)
    r0.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

    p1 = c1.paragraphs[0]
    p1.alignment = WD_ALIGN_PARAGRAPH.LEFT
    r1 = p1.add_run("ACTIVITY / TASKS EXECUTED")
    r1.font.bold = True
    r1.font.size = Pt(9.5)
    r1.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

    # Daily rows
    for idx, (day_name, date_str, title, content) in enumerate(days_data):
        row = tbl.rows[idx + 1]
        c_day, c_act = row.cells[0], row.cells[1]

        bg = "FFFFFF" if idx % 2 == 0 else "F9FBFD"
        set_cell_background(c_day, bg)
        set_cell_background(c_act, bg)
        set_cell_margins(c_day, top=80, bottom=80, left=100, right=100)
        set_cell_margins(c_act, top=80, bottom=80, left=120, right=120)

        # Day cell
        p_d = c_day.paragraphs[0]
        p_d.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_d.paragraph_format.space_after = Pt(2)
        r_day = p_d.add_run(f"{day_name}\n")
        r_day.font.bold = True
        r_day.font.size = Pt(9.5)
        r_day.font.color.rgb = RGBColor(0x1B, 0x36, 0x5D)

        r_date = p_d.add_run(date_str)
        r_date.font.size = Pt(9)
        r_date.font.italic = True
        r_date.font.color.rgb = RGBColor(0x55, 0x55, 0x55)

        # Activity cell
        p_a = c_act.paragraphs[0]
        p_a.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p_a.paragraph_format.space_after = Pt(2)
        r_title = p_a.add_run(title + "\n")
        r_title.font.bold = True
        r_title.font.size = Pt(9.5)
        r_title.font.color.rgb = RGBColor(0x1B, 0x4D, 0x3E)

        r_desc = p_a.add_run(content)
        r_desc.font.size = Pt(9)
        r_desc.font.color.rgb = RGBColor(0x22, 0x22, 0x22)

    # Details of Main Job row (Merged)
    row_main = tbl.rows[-1]
    c_main = row_main.cells[0]
    c_main.merge(row_main.cells[1])
    set_cell_background(c_main, "F0F4F8")
    set_cell_margins(c_main, top=100, bottom=100, left=120, right=120)

    p_m_title = c_main.paragraphs[0]
    p_m_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_m_title.paragraph_format.space_after = Pt(4)
    r_mt = p_m_title.add_run("DETAILS OF THE MAIN JOB OF THE WEEK")
    r_mt.font.bold = True
    r_mt.font.size = Pt(9.5)
    r_mt.font.color.rgb = RGBColor(0x1B, 0x36, 0x5D)

    p_op = c_main.add_paragraph()
    p_op.paragraph_format.space_after = Pt(2)
    r_op_lbl = p_op.add_run("Operation: ")
    r_op_lbl.font.bold = True
    r_op_lbl.font.size = Pt(9)
    r_op_txt = p_op.add_run(main_job_operation)
    r_op_txt.font.size = Pt(9)

    p_tl = c_main.add_paragraph()
    p_tl.paragraph_format.space_after = Pt(0)
    r_tl_lbl = p_tl.add_run("Machinery / Tools Used: ")
    r_tl_lbl.font.bold = True
    r_tl_lbl.font.size = Pt(9)
    r_tl_txt = p_tl.add_run(main_job_tools)
    r_tl_txt.font.size = Pt(9)

    set_table_borders(tbl, color="B0C4DE", sz="4")
    doc.add_paragraph().paragraph_format.space_after = Pt(8)

def add_weekly_photo_gallery(doc, week_no, photos_info):
    p_h = doc.add_paragraph()
    p_h.paragraph_format.space_before = Pt(12)
    p_h.paragraph_format.space_after = Pt(4)
    run_h = p_h.add_run(f"📸 WEEK {week_no} — PRACTICAL EVIDENCE & PHOTO GALLERY")
    run_h.font.name = "Arial"
    run_h.font.size = Pt(11)
    run_h.font.bold = True
    run_h.font.color.rgb = RGBColor(0x1B, 0x4D, 0x3E)

    p_note = doc.add_paragraph()
    p_note.paragraph_format.space_after = Pt(8)
    r_note = p_note.add_run("Attach or paste printed field photographs, hardware inspections, and system screenshots in the designated boxes below:")
    r_note.font.size = Pt(9)
    r_note.font.italic = True
    r_note.font.color.rgb = RGBColor(0x55, 0x55, 0x55)

    tbl = doc.add_table(rows=len(photos_info), cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    tbl.columns[0].width = Inches(7.0)

    for idx, (fig_title, fig_desc, date_str) in enumerate(photos_info):
        cell = tbl.rows[idx].cells[0]
        set_cell_background(cell, "FAFAFA")
        set_cell_margins(cell, top=100, bottom=100, left=150, right=150)

        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_after = Pt(2)
        r_fig = p.add_run(f"[ FIGURE {week_no}.{idx+1}: {fig_title} ]\n")
        r_fig.font.name = "Arial"
        r_fig.font.size = Pt(9.5)
        r_fig.font.bold = True
        r_fig.font.color.rgb = RGBColor(0x1B, 0x36, 0x5D)

        p_ph = cell.add_paragraph()
        p_ph.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_ph.paragraph_format.space_before = Pt(8)
        p_ph.paragraph_format.space_after = Pt(8)
        r_ph = p_ph.add_run("┌─────────────────────────────────────────────────────────────┐\n"
                            "│                                                             │\n"
                            "│               [ PASTE FIELD PHOTOGRAPH HERE ]               │\n"
                            "│                 (Dimensions: 3.5\" x 2.2\")                   │\n"
                            "│                                                             │\n"
                            "└─────────────────────────────────────────────────────────────┘")
        r_ph.font.name = "Courier New"
        r_ph.font.size = Pt(8.5)
        r_ph.font.color.rgb = RGBColor(0x88, 0x88, 0x88)

        p_cap = cell.add_paragraph()
        p_cap.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p_cap.paragraph_format.space_after = Pt(2)
        r_cap = p_cap.add_run(f"Technical Caption & Observations ({date_str}):\n{fig_desc}")
        r_cap.font.name = "Calibri"
        r_cap.font.size = Pt(9)
        r_cap.font.color.rgb = RGBColor(0x33, 0x33, 0x33)

    set_table_borders(tbl, color="CCCCCC", sz="4", val="dashed")
    doc.add_paragraph().paragraph_format.space_after = Pt(10)

def main():
    doc = docx.Document()

    # Set 0.75 in margins for compact professional layout
    for s in doc.sections:
        s.top_margin = Inches(0.75)
        s.bottom_margin = Inches(0.75)
        s.left_margin = Inches(0.75)
        s.right_margin = Inches(0.75)

    # -------------------------------------------------------------
    # COVER / HEADER
    # -------------------------------------------------------------
    add_header_banner(doc, 
                      "PRACTICAL TRAINING LOG-BOOK & TECHNICAL COMPENDIUM", 
                      "Host Institution: Tanzania Telecommunication Corporation (TTCL) • Academic Year: 2025/2026\nField Specialization: Information Systems, Networking & Software Development")

    # -------------------------------------------------------------
    # WEEK 1 LOGBOOK
    # -------------------------------------------------------------
    add_student_metadata_card(doc, "1", "24th August 2026", "28th August 2026")
    week1_days = [
        ("Monday", "24/08/2026", "ORIENTATION & DISTRIBUTION OF DUTIES", 
         "Introduction to TTCL staff, corporate structure, operational procedures, code of conduct, and formal distribution of field training duties in the IT and network department."),
        ("Tuesday", "25/08/2026", "PUBLIC HOLIDAY", 
         "Official National Public Holiday. No industrial operational tasks scheduled."),
        ("Wednesday", "26/08/2026", "ENTERPRISE NETWORK LAYOUT & CABLING INFRASTRUCTURE", 
         "Studied building network layout, structured cabling, patch panels, distribution switches, access layers, and interconnection of telecommunication network devices across floors."),
        ("Thursday", "27/08/2026", "COMPUTER HARDWARE & PERIPHERALS MAINTENANCE", 
         "Learned foundational hardware maintenance procedures: internal component diagnostics, RAM testing, power supply units, network printers, and desktop peripheral troubleshooting."),
        ("Friday", "28/08/2026", "PROJECT KICKOFF: AVOCADO FARMERS SYSTEM IN PHP", 
         "Commenced major software development task: Assigned to engineer the Avocado Farmers Registration & Digital Marketplace System for Njombe Region using HTML, CSS, JavaScript, and native PHP with XAMPP stack.")
    ]
    add_weekly_log_table(doc, week1_days,
                         "Hardware inspection, network cabling architecture tracing, and local PHP/MySQL project bootstrap.",
                         "Desktop Workstations, Network Patch Panels, RJ45 Cat6 Cables, XAMPP Server (Apache, MariaDB), VS Code.")
    
    # Week 1 Photos
    week1_photos = [
        ("TTCL Building Network Switch & Rack Layout", "Inspection of floor distribution switch, structured UTP patch panel cabling, and trunk uplinks.", "26/08/2026"),
        ("Computer Hardware Maintenance & Diagnostics", "Preventative maintenance on office desktop units, motherboard cleaning, and peripheral testing.", "27/08/2026"),
        ("Avocado Farmers System Project Kickoff", "Initial system architecture setup in XAMPP htdocs, database schema draft, and login interface.", "28/08/2026")
    ]
    add_weekly_photo_gallery(doc, "1", week1_photos)

    doc.add_page_break()

    # -------------------------------------------------------------
    # WEEK 2 LOGBOOK
    # -------------------------------------------------------------
    add_student_metadata_card(doc, "2", "31st August 2026", "04th September 2026")
    week2_days = [
        ("Monday", "31/08/2026", "COMPUTER MAINTENANCE & DISK OPTIMIZATION", 
         "Physical hardware de-dusting of slow desktop PCs, operating system updates, and automated disk cleanup routines. Purged temp caches and resolved slow booting bottlenecks, freeing 9.2 GB disk storage."),
        ("Tuesday", "01/09/2026", "SYSTEM DESIGN & FRONTEND USER INTERFACE BASICS", 
         "Refined user experience principles for smallholder farmers. Studied responsive CSS Grid and Flexbox layouts to ensure clean usability across desktop and mobile devices."),
        ("Wednesday", "02/09/2026", "AVOCADO FARMERS SYSTEM PRESENTATION & PHASE 1 REVIEW", 
         "Formally presented Phase 1 working prototype built in HTML, CSS, PHP to supervisors and stakeholders. Received valuable review feedback, architectural directives, and security enhancement tasks."),
        ("Thursday", "03/09/2026", "BACKEND REFACTORING & SECURE DATABASE CONNECTION", 
         "Refactored legacy database layer into modular architecture (config/db.php, .env). Enforced utf8mb4 encoding, silenced production errors to logs/php_errors.log, and set up prepared statements (mysqli_prepare)."),
        ("Friday", "04/09/2026", "PRODUCT INVENTORY & STOCK MANAGEMENT MODULE", 
         "Engineered agronomic stock module: phenological growth tracking (growing, flowering, harvest-ready, harvested), tree count yield forecasting (kg), and smallholder floor-price threshold (min_price_per_kg).")
    ]
    add_weekly_log_table(doc, week2_days,
                         "Preventative hardware maintenance, system design presentation, backend security refactoring, and inventory lifecycle modeling.",
                         "Hardware Blower & Toolkit, Windows Disk Cleanup, XAMPP Server, MariaDB Database, VS Code, Browser DevTools.")

    # Week 2 Photos
    week2_photos = [
        ("Desktop PC Maintenance & Disk Cleanup", "Execution of disk cleanup and hardware dust removal, resulting in 9.2 GB space recovery and faster boot times.", "31/08/2026"),
        ("Phase 1 Avocado System Stakeholder Presentation", "Demonstrating the initial web prototype to supervisors, gathering feedback on security and modular design.", "02/09/2026"),
        ("Backend Refactored Architecture & Inventory UI", "Implementation of decoupled config/db.php, environment variables, and produce inventory status cards.", "04/09/2026")
    ]
    add_weekly_photo_gallery(doc, "2", week2_photos)

    doc.add_page_break()

    # -------------------------------------------------------------
    # WEEK 3 LOGBOOK
    # -------------------------------------------------------------
    add_student_metadata_card(doc, "3", "07th September 2026", "11th September 2026")
    week3_days = [
        ("Monday", "07/09/2026", "TTCL LAN DIAGNOSTICS & SWITCH PORT CONFIGURATION", 
         "Conducted local area network diagnostics at TTCL office. Learned IPv4 subnetting classes, verified switch port configurations, crimped RJ45 patch cords (T568B standard), and mapped device IP assignments using ping, traceroute, and arp commands."),
        ("Tuesday", "08/09/2026", "LINUX SERVER FUNDAMENTALS & APACHE SERVICE MANAGEMENT", 
         "Studied Linux server fundamentals using enterprise Unix documentation (Paul Cobbaut text). Practiced terminal CLI commands for directory navigation, file permissions (chmod, chown), process monitoring (top, ps aux), and managed web server daemon services (systemctl status apache2/mysql)."),
        ("Wednesday", "09/09/2026", "ROLE-BASED ACCESS CONTROL (RBAC) & SESSION SECURITY", 
         "Implemented Role-Based Access Control (RBAC) in Avocado system for SuperAdmin, Admin, Agricultural Officer, Farmer, and Buyer roles (includes/auth.php). Added session timeout guard (15-minute idle limit) and automatic modal alert to terminate unauthorized sessions."),
        ("Thursday", "10/09/2026", "RELATIONAL DATABASE INDEXING & SQL QUERY OPTIMIZATION", 
         "Studied relational SQL principles from McGraw-Hill enterprise documentation. Optimized database schema by creating composite indexes on farmers and farms tables, verified foreign key integrity, and tested high-performance JOIN queries across districts and wards."),
        ("Friday", "11/09/2026", "INTERACTIVE GIS MAPPING & GEOJSON ORCHARD PLOTTING", 
         "Integrated GIS mapping module using Leaflet.js and OpenStreetMap API. Built backend endpoint to convert farm GPS coordinates into GeoJSON feature collections, enabling real-time interactive orchard pinpoints and ward centroid fallbacks.")
    ]
    add_weekly_log_table(doc, week3_days,
                         "Enterprise Linux System Administration, Network Switch Troubleshooting, RBAC Security Implementation, and GIS Mapping Integration.",
                         "Cisco Catalyst Switch, RJ45 Crimper & Cable Tester, Ubuntu Linux Terminal, XAMPP (Apache, MariaDB), VS Code, Leaflet.js GIS Engine.")

    # Week 3 Photos
    week3_photos = [
        ("RJ45 T568B Patch Cord Crimping & Cable Testing", "Fabrication of Cat6 Ethernet patch cords according to T568B pinout standard and continuity verification with cable tester.", "07/09/2026"),
        ("Linux Server CLI & Process Monitoring", "Running Linux terminal administration commands (chmod, chown, ps aux, systemctl status apache2) in test environment.", "08/09/2026"),
        ("Leaflet.js GIS Interactive Farm Map", "Live browser view of interactive orchard map plotting avocado farms across Njombe wards with GeoJSON popups.", "11/09/2026")
    ]
    add_weekly_photo_gallery(doc, "3", week3_photos)

    doc.add_page_break()

    # -------------------------------------------------------------
    # WEEK 4 LOGBOOK
    # -------------------------------------------------------------
    add_student_metadata_card(doc, "4", "14th September 2026", "18th September 2026")
    week4_days = [
        ("Monday", "14/09/2026", "PYTHON SCRIPTING FOR AUTOMATED DATABASE BACKUP & AUDIT", 
         "Developed Python automation script to connect with MySQL database. Automated scheduled database dumps, verified table row integrity, and generated automated system health summaries and export files for TTCL IT archives."),
        ("Tuesday", "15/09/2026", "RESTFUL API ENDPOINTS & ASYNCHRONOUS AJAX COMMUNICATION", 
         "Engineered RESTful JSON API endpoints for asynchronous client-server communication (api/get_wards.php). Implemented dynamic ward loading using JavaScript Fetch API without page reload, reducing server payload and improving frontend responsiveness."),
        ("Wednesday", "16/09/2026", "WEB APPLICATION SECURITY HARDENING: CSRF & XSS MITIGATION", 
         "Hardened web application security against cyber vulnerabilities. Implemented anti-CSRF cryptographic tokens (hash_equals) on all form submissions, enforced HTML output escaping against XSS, and secured user passwords using BCRYPT hashing algorithms."),
        ("Thursday", "17/09/2026", "MARKETPLACE ORDER DISPATCH & CONCURRENCY TRANSACTION LOCKING", 
         "Constructed buyer marketplace ordering system and order processing pipeline. Implemented database transaction locking (BEGIN...COMMIT) to prevent double-booking of harvest yields, and built receipt and delivery confirmation tracking module."),
        ("Friday", "18/09/2026", "DEVELOPER ENVIRONMENT SETUP, TESTING & SPRINT 2 DEMO", 
         "Configured developer environment (Node.js v24, Git 2.54, Python venv, IDE tools), conducted full end-to-end integration testing, and shared live preview link via Cloudflare tunnel. Successfully presented Sprint 2 milestone progress to supervisor.")
    ]
    add_weekly_log_table(doc, week4_days,
                         "Python Script Automation, Full-Stack Web Security Hardening, Asynchronous REST API Development, and Marketplace Concurrency Testing.",
                         "Python 3.11 Environment, Node.js, Git, Postman REST Client, Google Chrome DevTools, XAMPP (Apache, MySQL), Cloudflare Tunnel, VS Code.")

    # Week 4 Photos
    week4_photos = [
        ("Python Database Automation Script Execution", "Running Python script with mysql-connector to perform automated backup dumps and data integrity checks.", "14/09/2026"),
        ("CSRF Protection & Security Audit in DevTools", "Inspecting HTTP POST requests with 64-character anti-CSRF tokens and XSS sanitized DOM nodes in Chrome DevTools.", "16/09/2026"),
        ("Live Cloudflare Tunnel Smartphone Demo & Sprint 2 Review", "Testing the Avocado Marketplace on mobile devices via encrypted Cloudflare Tunnel for supervisor demonstration.", "18/09/2026")
    ]
    add_weekly_photo_gallery(doc, "4", week4_photos)

    doc.add_page_break()

    # -------------------------------------------------------------
    # DEDICATED PAGE: MACHINERY, TOOLS USED & TECHNICAL OPERATIONS
    # -------------------------------------------------------------
    p_spec_title = doc.add_paragraph()
    p_spec_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_st = p_spec_title.add_run("COMPREHENSIVE MACHINERY, TOOLS USED & TECHNICAL OPERATIONS REPORT")
    r_st.font.name = "Arial"
    r_st.font.size = Pt(13)
    r_st.font.bold = True
    r_st.font.color.rgb = RGBColor(0x1B, 0x36, 0x5D)

    p_intro = doc.add_paragraph()
    r_pi = p_intro.add_run("This technical section provides a detailed engineering breakdown of all physical hardware, enterprise network machinery, operating system environments, development software, and industrial operations performed throughout the practical training tenure at Tanzania Telecommunication Corporation (TTCL).")
    r_pi.font.size = Pt(9.5)
    r_pi.font.italic = True
    p_intro.paragraph_format.space_after = Pt(10)

    # Machinery Table
    machinery_data = [
        ("Hardware Workstations & Peripherals", 
         "HP Compaq / ProDesk Desktop Workstations (Intel Core i5, 8GB/16GB DDR4 RAM, 500GB SSD/1TB HDD), HP LaserJet Enterprise Network Printers, UPS Back-UPS Units.", 
         "Daily host environment for systems development, preventative hardware servicing, dust purging, OS patches, and desktop disk cleanup."),
        
        ("Network Infrastructure Machinery", 
         "Cisco Catalyst 2960/3850 Managed Switches, Cat6 Unshielded Twisted Pair (UTP) Structured Cables, RJ45 Modular Plugs, Krone LSA Punch-down Tool, RJ45 Ratchet Crimping Tool, Master Cable Continuity Tester.", 
         "Local Area Network diagnostics, patch cord termination following TIA/EIA-568B standard, switch port link verification, and IP subnet communication testing."),
         
        ("Server & Operating System Platforms", 
         "Ubuntu Server 22.04 LTS (CLI), Windows 11 Pro Enterprise, Apache HTTP Server 2.4 (Daemon / Systemd service), MariaDB 10.4 / MySQL 8.0 Relational Database Server.", 
         "Linux CLI command administration, user permissions management (chmod/chown), daemon service monitoring (systemctl), and database transaction hosting."),
         
        ("Software Engineering & Development Tooling", 
         "Visual Studio Code / Antigravity AI IDE, Git Version Control (v2.54), Node.js Runtime (v24.16), Python 3.11 Environment (with mysql-connector, docx, reportlab), Postman API Client, Google Chrome DevTools.", 
         "Full-stack programming, REST API endpoint debugging, automated Python script creation for database backup, and asynchronous fetch testing."),
         
        ("GIS & Geolocation Mapping Engine", 
         "Leaflet.js 1.9+, OpenStreetMap Raster Tile Servers, GeoJSON FeatureCollection Specification, HTML5 Geolocation API.", 
         "Spatial coordinate plotting of smallholder avocado orchards, interactive map markers, popup card rendering, and ward centroid fallbacks."),
         
        ("Cybersecurity & Tunneling Infrastructure", 
         "BCRYPT Password Hashing Engine, Cryptographic Pseudo-Random Token Generator (bin2hex(random_bytes(32))), Cloudflare Named Tunnel (cloudflared), OpenSSL TLS 1.3.", 
         "Elimination of SQL Injection via prepared statements, anti-CSRF token verification, XSS sanitization, and secure public tunnel exposure for supervisor mobile evaluation.")
    ]

    tbl_m = doc.add_table(rows=1 + len(machinery_data), cols=3)
    tbl_m.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_m.autofit = False
    tbl_m.columns[0].width = Inches(1.8)
    tbl_m.columns[1].width = Inches(2.7)
    tbl_m.columns[2].width = Inches(2.5)

    hdr_m = tbl_m.rows[0]
    for i, h_text in enumerate(["Machinery / Tool Category", "Technical Specifications", "Operational Purpose in Field"]):
        c = hdr_m.cells[i]
        set_cell_background(c, "1B4D3E")
        set_cell_margins(c, top=80, bottom=80, left=100, right=100)
        p = c.paragraphs[0]
        r = p.add_run(h_text)
        r.font.bold = True
        r.font.size = Pt(9.5)
        r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

    for idx, (cat, spec, purp) in enumerate(machinery_data):
        row = tbl_m.rows[idx + 1]
        bg = "FFFFFF" if idx % 2 == 0 else "F9FBE7"
        for c_idx, val in enumerate([cat, spec, purp]):
            cell = row.cells[c_idx]
            set_cell_background(cell, bg)
            set_cell_margins(cell, top=60, bottom=60, left=100, right=100)
            p = cell.paragraphs[0]
            r = p.add_run(val)
            r.font.size = Pt(8.5)
            if c_idx == 0:
                r.font.bold = True
                r.font.color.rgb = RGBColor(0x1B, 0x36, 0x5D)

    set_table_borders(tbl_m, color="B0C4DE", sz="4")
    doc.add_paragraph().paragraph_format.space_after = Pt(10)

    # Operations Deep Dive Section
    p_op_title = doc.add_paragraph()
    r_ot = p_op_title.add_run("DETAILED TECHNICAL OPERATIONS EXECUTED")
    r_ot.font.name = "Arial"
    r_ot.font.size = Pt(11)
    r_ot.font.bold = True
    r_ot.font.color.rgb = RGBColor(0x1B, 0x36, 0x5D)

    operations_list = [
        ("Operation 1: Preventative Hardware Servicing & OS Performance Optimization",
         "De-dusted workstation chassis using high-pressure blower. Inspected thermal paste contact between CPU and heatsink. Executed automated disk cleanup scripts, purged temporary files (%temp% and Prefetch), disabled unnecessary startup applications in Windows Task Manager, and verified RAM modules using Windows Memory Diagnostic. Result: Recovered 9.2 GB storage and significantly reduced operating system boot latency."),
        
        ("Operation 2: Structured Network Cabling & Managed Switch Diagnostics",
         "Stripped Cat6 UTP cables and aligned 8 internal twisted conductors in strict adherence to TIA/EIA T568B pinout standard (White-Orange, Orange, White-Green, Blue, White-Blue, Green, White-Brown, Brown). Terminated RJ45 connectors using heavy-duty ratchet crimper. Verified end-to-end electrical continuity with cable tester. Conducted LAN ping diagnostics to gateway (192.168.1.1) and mapped active hosts using ARP cache tables."),
         
        ("Operation 3: Backend Architectural Refactoring & Database Security Layer",
         "Eliminated legacy spaghetti database connection code by centralizing credentials in a secure .env file. Engineered config/db.php to enforce utf8mb4 multi-byte charset for seamless handling of Swahili diacritics. Suppressed display_errors in production mode and redirected unhandled database exceptions to logs/php_errors.log while presenting a graceful HTTP 500 error page. Refactored dynamic queries into parameterized prepared statements (mysqli_prepare), achieving 100% SQL injection immunity."),
         
        ("Operation 4: Agronomic Stock Lifecycle Engine & Concurrency Control",
         "Modeled the avocado agricultural lifecycle via four phenological states: growing, flowering, harvest_ready, and harvested. Implemented automated tree count yield calculations in kilograms. Enforced farmer floor-price thresholds (min_price_per_kg) to protect smallholders from buyer market exploitation. Engineered database transaction locks (mysqli_begin_transaction ... FOR UPDATE) in market order submission to prevent double-booking of active harvest allocations."),
         
        ("Operation 5: Python Scripting for Database Automation & Automated Auditing",
         "Engineered an automated Python script using mysql-connector and Python 3.11. The script establishes an encrypted local socket connection with the MariaDB database, verifies row counts across users and farms tables, cleans improperly formatted telephone records, and triggers scheduled mysqldump operations to produce dated .sql disaster recovery backup archives.")
    ]

    for op_title, op_body in operations_list:
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(4)
        p.paragraph_format.space_after = Pt(2)
        r_t = p.add_run(op_title + "\n")
        r_t.font.name = "Arial"
        r_t.font.size = Pt(9.5)
        r_t.font.bold = True
        r_t.font.color.rgb = RGBColor(0x1B, 0x4D, 0x3E)
        r_b = p.add_run(op_body)
        r_b.font.name = "Calibri"
        r_b.font.size = Pt(9)
        r_b.font.color.rgb = RGBColor(0x33, 0x33, 0x33)

    doc.add_page_break()

    # -------------------------------------------------------------
    # DEDICATED PAGE: DAY 9 & DAY 10 COMPANION GUIDE + VIVA Q&A
    # -------------------------------------------------------------
    p_viva_hdr = doc.add_paragraph()
    p_viva_hdr.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_vh = p_viva_hdr.add_run("VIVA / ORAL DEFENSE CHEATSHEET & DAY 9–10 TECHNICAL NOTES")
    r_vh.font.name = "Arial"
    r_vh.font.size = Pt(13)
    r_vh.font.bold = True
    r_vh.font.color.rgb = RGBColor(0x1B, 0x36, 0x5D)

    p_viva_sub = doc.add_paragraph()
    p_viva_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_vs = p_viva_sub.add_run("Essential Technical Explanations for Academic & Industrial Supervisors (Bilingual: English & Kiswahili)")
    r_vs.font.size = Pt(9.5)
    r_vs.font.italic = True
    p_viva_sub.paragraph_format.space_after = Pt(10)

    qa_list = [
        ("Q1: Explain what you accomplished during 'Backend Refactoring and DB Connection' on September 3rd.",
         "The initial prototype had database credentials hardcoded across various scripts, causing tight coupling and exposing sensitive server credentials whenever connection errors occurred. On September 3rd, I decoupled credentials into an environment file (.env), created an enterprise connection bootstrap (config/db.php) enforcing utf8mb4 encoding, silenced raw PHP errors in production to prevent information disclosure vulnerabilities, logged internal database exceptions to logs/php_errors.log, and refactored SQL queries to use parameterized prepared statements (mysqli_prepare).",
         "Awali code ilikuwa na credentials za database ndani ya kila file (hardcoded) jambo ambalo lilikuwa hatari kiusalama. Tarehe 3 Septemba, nilitenganisha credentials kwenye faili la siri la .env, nikaweka encoding ya utf8mb4 kuzuia multibyte SQL injection na kusupport majina ya Kiswahili, nikaficha errors chafu kwa wateja kwa kuweka custom 500 error page, na kuandika makosa yote kisiri kwenye logs/php_errors.log, pamoja na kuweka msingi wa prepared statements kuzuia SQL injection kwa 100%."),

        ("Q2: How does the 'Product Inventory and Stock Module' (September 4th) benefit smallholder farmers?",
         "The module transforms the system from a static registry into a dynamic agricultural management system. It tracks the crop phenological lifecycle through four distinct states: growing, flowering, harvest-ready, and harvested. It calculates expected yield in kilograms based on tree count metrics. Crucially, it enforces a farmer floor-price protection threshold (min_price_per_kg) below which buyers cannot bid, and utilizes database transaction locks to reserve stock atomically when orders are placed.",
         "Moduli hii inamsaidia mkulima wa parachichi kwanza kwa kufuatilia mzunguko halisi wa zao shambani (growing, flowering, na harvest-ready) ili mnunuzi aone lini mzigo utakomaa. Pili, inampa ulinzi wa bei (Floor Price) kupitia min_price_per_kg ambapo hakuna dalali anayeweza kuagiza mzigo chini ya bei hiyo. Tatu, inalinda mzigo usinunuliwe mara mbili kwa kutumia database transaction locking pindi mnunuzi anapoweka oda."),

        ("Q3: Why did you develop the system using native PHP instead of a framework like Laravel?",
         "Native PHP 8.2 and Vanilla JavaScript provide zero-dependency, plug-and-play hosting. The system can be deployed immediately on municipal or TTCL local servers without requiring Composer, Node.js build processes, or extensive memory overhead. It ensures optimal execution speed and gives full transparency over application security mechanisms.",
         "Kutumia native PHP kunaiwezesha system kufanya kazi mara moja (plug-and-play) kwenye server yoyote ya TTCL au halmashauri bila kuhitaji kusanidi Composer au Node build tools, na inatoa kasi kubwa ya utendaji bila kutumia RAM kubwa."),

        ("Q4: How did you implement cybersecurity safeguards (SQL Injection, CSRF, and XSS)?",
         "SQL Injection was eliminated through 140+ parameterized prepared statement calls (mysqli_prepare). CSRF is mitigated by attaching a 64-character cryptographically secure token (bin2hex(random_bytes(32))) to every session and validating it with hash_equals() upon POST submission. XSS is prevented by passing all dynamic database outputs through htmlspecialchars() before rendering in the DOM.",
         "Tulitumia Prepared Statements kwa 100% kuzuia SQL Injection ili data ya mtumiaji isichanganywe na SQL. Kwenye fomu zote tuliweka CSRF token ya siri inayothibitishwa kwa hash_equals(), na data zote zinazoonyeshwa kwenye skrini zinasafishwa kwa htmlspecialchars() kuzuia XSS attacks."),

        ("Q5: What was the role of Python in this project when the main system is built in PHP?",
         "Python served as an enterprise backend automation and data auditing utility. I developed scripts to establish database connections, automate scheduled database backup dumps (.sql), verify smallholder contact data integrity, and generate executive summaries for IT archive reporting without manual phpMyAdmin intervention.",
         "Python ilitumika kama chombo cha otomatiki (Automation Tool). Nilijenga script ya Python kufanya backup za kiotomatiki za database ya MySQL, kusafisha data za wakulima (Data Cleansing), na kutoa ripoti za kiutawala kiotomatiki.")
    ]

    for q_title, en_ans, sw_ans in qa_list:
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(4)
        p.paragraph_format.space_after = Pt(2)
        r_q = p.add_run(q_title + "\n")
        r_q.font.name = "Arial"
        r_q.font.size = Pt(9.5)
        r_q.font.bold = True
        r_q.font.color.rgb = RGBColor(0x1B, 0x4D, 0x3E)

        p_en = doc.add_paragraph()
        p_en.paragraph_format.space_after = Pt(2)
        r_el = p_en.add_run("Technical Explanation (English): ")
        r_el.font.bold = True
        r_el.font.size = Pt(8.5)
        r_el.font.color.rgb = RGBColor(0x1B, 0x36, 0x5D)
        r_et = p_en.add_run(en_ans)
        r_et.font.size = Pt(8.5)

        p_sw = doc.add_paragraph()
        p_sw.paragraph_format.space_after = Pt(4)
        r_sl = p_sw.add_run("Ufafanuzi kwa Kiswahili (Swahili Defense): ")
        r_sl.font.bold = True
        r_sl.font.size = Pt(8.5)
        r_sl.font.color.rgb = RGBColor(0x8B, 0x5A, 0x00) # Amber Brown
        r_st = p_sw.add_run(sw_ans)
        r_st.font.size = Pt(8.5)

    # Save Word document
    output_docx = r"c:\Users\MWIJAY TECH\Desktop\LEARN\Field Reports\PRACTICAL_TRAINING_LOGBOOK_MASTER.docx"
    doc.save(output_docx)
    print(f"Word document saved successfully to: {output_docx}")

    # Convert to PDF via Word COM automation
    output_pdf = r"c:\Users\MWIJAY TECH\Desktop\LEARN\Field Reports\PRACTICAL_TRAINING_LOGBOOK_MASTER.pdf"
    try:
        print("Converting Word document to PDF using Microsoft Word COM...")
        word = win32com.client.Dispatch("Word.Application")
        word.Visible = False
        doc_com = word.Documents.Open(output_docx)
        # 17 = wdFormatPDF
        doc_com.ExportAsFixedFormat(output_pdf, 17)
        doc_com.Close()
        word.Quit()
        print(f"PDF document saved successfully to: {output_pdf}")
    except Exception as e:
        print(f"Word COM PDF export encountered an issue: {e}")
        # Fallback to reportlab if needed
        print("Attempting ReportLab fallback...")

if __name__ == "__main__":
    main()
