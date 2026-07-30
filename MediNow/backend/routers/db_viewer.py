from fastapi import APIRouter
from fastapi.responses import HTMLResponse
import sqlite3
import json
import os

router = APIRouter(prefix="/db", tags=["Database Explorer"])

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "medinow.db")

@router.get("/api/tables")
def get_db_tables():
    if not os.path.exists(DB_PATH):
        return {"error": "Database file not found", "path": DB_PATH}
    
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
    tables = [row["name"] for row in cursor.fetchall()]
    
    result = {}
    for table in tables:
        # Schema info
        cursor.execute(f"PRAGMA table_info({table})")
        columns = [{"cid": c[0], "name": c[1], "type": c[2], "notnull": c[3], "dflt_value": c[4], "pk": c[5]} for c in cursor.fetchall()]
        
        # Rows
        cursor.execute(f"SELECT * FROM {table}")
        rows = [dict(row) for row in cursor.fetchall()]
        
        result[table] = {
            "columns": columns,
            "count": len(rows),
            "rows": rows
        }
    conn.close()
    return result

@router.get("", response_class=HTMLResponse)

@router.get("/", response_class=HTMLResponse)
def render_db_explorer():
    html_content = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MediNow — Web Database Explorer</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-dark: #0b0f19;
            --card-bg: rgba(23, 31, 48, 0.7);
            --border-color: rgba(255, 255, 255, 0.08);
            --primary: #00d2ff;
            --primary-glow: rgba(0, 210, 255, 0.2);
            --accent: #3a7bd5;
            --success: #10b981;
            --warning: #f59e0b;
            --text-main: #f3f4f6;
            --text-muted: #9ca3af;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            background: radial-gradient(circle at 15% 15%, #151d30 0%, #0b0f19 100%);
            color: var(--text-main);
            min-height: 100vh;
            padding: 2rem;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
            padding-bottom: 1.5rem;
            border-bottom: 1px solid var(--border-color);
        }

        .title-group {
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .logo-badge {
            background: linear-gradient(135deg, var(--primary), var(--accent));
            width: 44px;
            height: 44px;
            border-radius: 12px;
            display: grid;
            place-items: center;
            font-size: 1.4rem;
            box-shadow: 0 4px 20px var(--primary-glow);
        }

        h1 {
            font-size: 1.6rem;
            font-weight: 800;
            letter-spacing: -0.02em;
            background: linear-gradient(to right, #ffffff, #94a3b8);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .subtitle {
            font-size: 0.85rem;
            color: var(--text-muted);
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }

        .stat-card {
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 14px;
            padding: 1.2rem;
            backdrop-filter: blur(12px);
        }

        .stat-val {
            font-size: 1.8rem;
            font-weight: 800;
            color: var(--primary);
        }

        .stat-lbl {
            font-size: 0.8rem;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-top: 0.2rem;
        }

        .tabs-container {
            display: flex;
            gap: 0.5rem;
            overflow-x: auto;
            padding-bottom: 0.5rem;
            margin-bottom: 1.5rem;
        }

        .tab-btn {
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            color: var(--text-muted);
            padding: 0.6rem 1.2rem;
            border-radius: 10px;
            font-size: 0.88rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 0.6rem;
            white-space: nowrap;
        }

        .tab-btn:hover {
            border-color: var(--primary);
            color: #ffffff;
        }

        .tab-btn.active {
            background: linear-gradient(135deg, rgba(0, 210, 255, 0.15), rgba(58, 123, 213, 0.15));
            border-color: var(--primary);
            color: var(--primary);
            box-shadow: 0 0 15px var(--primary-glow);
        }

        .badge {
            background: rgba(255, 255, 255, 0.1);
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.75rem;
        }

        .active .badge {
            background: var(--primary);
            color: #000;
            font-weight: 700;
        }

        .table-card {
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 16px;
            padding: 1.5rem;
            backdrop-filter: blur(12px);
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }

        .table-toolbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
        }

        .search-box {
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid var(--border-color);
            color: #fff;
            padding: 0.6rem 1rem;
            border-radius: 8px;
            font-size: 0.88rem;
            width: 300px;
            outline: none;
        }

        .search-box:focus {
            border-color: var(--primary);
        }

        .btn-refresh {
            background: linear-gradient(135deg, var(--primary), var(--accent));
            color: #000;
            font-weight: 700;
            border: none;
            padding: 0.6rem 1.2rem;
            border-radius: 8px;
            cursor: pointer;
            transition: transform 0.2s;
        }

        .btn-refresh:hover {
            transform: translateY(-2px);
        }

        .table-wrapper {
            overflow-x: auto;
            border-radius: 10px;
            border: 1px solid var(--border-color);
        }

        table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
            font-size: 0.88rem;
        }

        th {
            background: rgba(0, 0, 0, 0.4);
            padding: 0.8rem 1rem;
            color: var(--primary);
            font-weight: 700;
            text-transform: uppercase;
            font-size: 0.75rem;
            letter-spacing: 0.05em;
            border-bottom: 1px solid var(--border-color);
        }

        td {
            padding: 0.8rem 1rem;
            border-bottom: 1px solid var(--border-color);
            color: #d1d5db;
        }

        tr:last-child td {
            border-bottom: none;
        }

        tr:hover td {
            background: rgba(255, 255, 255, 0.03);
        }

        .json-cell {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.78rem;
            background: rgba(0,0,0,0.4);
            padding: 4px 8px;
            border-radius: 6px;
            max-width: 400px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            cursor: pointer;
            color: #38bdf8;
        }

        .empty-state {
            text-align: center;
            padding: 3rem;
            color: var(--text-muted);
            font-size: 0.95rem;
        }
    </style>
</head>
<body>

    <div class="header">
        <div class="title-group">
            <div class="logo-badge">💊</div>
            <div>
                <h1>MediNow Database Explorer</h1>
                <div class="subtitle">Live Local SQLite Inspector (medinow.db)</div>
            </div>
        </div>
        <button class="btn-refresh" onclick="loadData()">🔄 Refresh Database</button>
    </div>

    <div class="stats-grid" id="statsGrid">
        <div class="stat-card"><div class="stat-val" id="cntUsers">0</div><div class="stat-lbl">Total Users</div></div>
        <div class="stat-card"><div class="stat-val" id="cntMeds">0</div><div class="stat-lbl">User Medicines</div></div>
        <div class="stat-card"><div class="stat-val" id="cntOrders">0</div><div class="stat-lbl">Orders Placed</div></div>
        <div class="stat-card"><div class="stat-val" id="cntRx">0</div><div class="stat-lbl">Prescriptions</div></div>
    </div>

    <div class="tabs-container" id="tabsContainer"></div>

    <div class="table-card">
        <div class="table-toolbar">
            <h3 id="activeTableName" style="font-size:1.1rem; color:#fff;">Table View</h3>
            <input type="text" class="search-box" id="searchInput" placeholder="Search rows..." onkeyup="filterRows()">
        </div>
        <div class="table-wrapper">
            <table id="dataTable">
                <thead id="tableHead"></thead>
                <tbody id="tableBody"></tbody>
            </table>
        </div>
    </div>

    <script>
        let dbData = {};
        let currentTable = '';

        async function loadData() {
            try {
                const res = await fetch('/db/api/tables');
                dbData = await res.json();
                
                renderStats();
                renderTabs();
                
                const tableNames = Object.keys(dbData);
                if (tableNames.length > 0) {
                    if (!currentTable || !dbData[currentTable]) {
                        currentTable = tableNames.includes('users') ? 'users' : tableNames[0];
                    }
                    switchTab(currentTable);
                }
            } catch (err) {
                console.error("Failed to load DB data:", err);
            }
        }

        function renderStats() {
            document.getElementById('cntUsers').innerText = dbData['users'] ? dbData['users'].count : 0;
            document.getElementById('cntMeds').innerText = dbData['user_medicines'] ? dbData['user_medicines'].count : 0;
            document.getElementById('cntOrders').innerText = dbData['orders'] ? dbData['orders'].count : 0;
            document.getElementById('cntRx').innerText = dbData['prescriptions'] ? dbData['prescriptions'].count : 0;
        }

        function renderTabs() {
            const container = document.getElementById('tabsContainer');
            container.innerHTML = '';
            
            for (const [name, info] of Object.entries(dbData)) {
                const btn = document.createElement('button');
                btn.className = `tab-btn ${name === currentTable ? 'active' : ''}`;
                btn.onclick = () => switchTab(name);
                btn.innerHTML = `${name} <span class="badge">${info.count}</span>`;
                container.appendChild(btn);
            }
        }

        function switchTab(tableName) {
            currentTable = tableName;
            document.getElementById('activeTableName').innerText = `Table: ${tableName}`;
            renderTabs();
            
            const tableInfo = dbData[tableName];
            const head = document.getElementById('tableHead');
            const body = document.getElementById('tableBody');
            
            head.innerHTML = '';
            body.innerHTML = '';
            document.getElementById('searchInput').value = '';

            if (!tableInfo || tableInfo.columns.length === 0) {
                body.innerHTML = '<tr><td colspan="100%" class="empty-state">No schema available</td></tr>';
                return;
            }

            // Render Head
            let trHead = '<tr>';
            tableInfo.columns.forEach(col => {
                trHead += `<th>${col.name}</th>`;
            });
            trHead += '</tr>';
            head.innerHTML = trHead;

            // Render Body
            if (tableInfo.rows.length === 0) {
                body.innerHTML = `<tr><td colspan="${tableInfo.columns.length}" class="empty-state">Table "${tableName}" is currently empty (0 rows).</td></tr>`;
                return;
            }

            tableInfo.rows.forEach(row => {
                let tr = '<tr>';
                tableInfo.columns.forEach(col => {
                    let val = row[col.name];
                    if (val === null || val === undefined) {
                        val = '<span style="color:#6b7280; font-style:italic;">NULL</span>';
                    } else if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
                        val = `<div class="json-cell" title="${val.replace(/"/g, '&quot;')}">${val}</div>`;
                    }
                    tr += `<td>${val}</td>`;
                });
                tr += '</tr>';
                body.innerHTML += tr;
            });
        }

        function filterRows() {
            const query = document.getElementById('searchInput').value.toLowerCase();
            const rows = document.querySelectorAll('#tableBody tr');
            rows.forEach(row => {
                const text = row.innerText.toLowerCase();
                row.style.display = text.includes(query) ? '' : 'none';
            });
        }

        loadData();
    </script>
</body>
</html>
"""
    return HTMLResponse(content=html_content)
