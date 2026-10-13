/**
 * NexusCall JDBC REST API Server & Web Server
 * Mirrors Java Spring Boot endpoints (/api/sql/execute, /api/tables/...)
 * Provides zero-config execution on port 3000 while serving the frontend.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Load in-memory engine and seed data for the server runtime
const seedDataPath = path.join(__dirname, 'seedData.js');
const dbEnginePath = path.join(__dirname, 'database.js');

global.window = {};
global.performance = { now: () => Date.now() };
global.localStorage = {
    _data: {},
    getItem(k) { return this._data[k]; },
    setItem(k, v) { this._data[k] = v; }
};

if (fs.existsSync(seedDataPath)) {
    eval(fs.readFileSync(seedDataPath, 'utf8'));
    global.SEED_DATA = window.SEED_DATA;
}
if (fs.existsSync(dbEnginePath)) {
    eval(fs.readFileSync(dbEnginePath, 'utf8'));
}

const db = window.db;
const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.sql': 'text/plain'
};

const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // -------------------------------------------------------------------------
    // API ROUTE: POST /api/sql/execute (Slide 17, 48 - Dynamic ResultSetMetaData)
    // -------------------------------------------------------------------------
    if (pathname === '/api/sql/execute' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const payload = JSON.parse(body || '{}');
                const sql = payload.sql;
                const startTime = Date.now();

                const result = db.executeSql(sql);
                const duration = Date.now() - startTime;

                if (result.resultSet) {
                    // SELECT Query
                    const meta = result.metaData;
                    const cols = meta ? meta.columns.map(c => c.name) : Object.keys(result.rows[0] || {});
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: true,
                        operationType: 'DQL',
                        columns: cols,
                        rows: result.rows,
                        rowCount: result.rowCount,
                        message: `Retrieved ${result.rowCount} row(s) via PostgreSQL JDBC ResultSet.`,
                        executionDurationMs: duration
                    }));
                } else {
                    // DML / DDL / TCL
                    const isDdl = /^(CREATE|ALTER|DROP|TRUNCATE)/i.test((sql || '').trim());
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: true,
                        operationType: isDdl ? 'DDL' : 'DML',
                        affectedRows: result.affectedRows !== undefined ? result.affectedRows : 0,
                        message: result.message || 'Operation executed successfully.',
                        executionDurationMs: duration
                    }));
                }
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    message: err.message,
                    sqlState: err.sqlState || '42000',
                    errorCode: err.errorCode || 900
                }));
            }
        });
        return;
    }

    // -------------------------------------------------------------------------
    // API ROUTE: GET /api/tables/:tableName
    // -------------------------------------------------------------------------
    if (pathname.startsWith('/api/tables/') && req.method === 'GET') {
        const parts = pathname.split('/');
        const tableName = parts[3].toUpperCase();
        try {
            const table = db.getTable(tableName);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(table.rows));
        } catch (e) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message }));
        }
        return;
    }

    // -------------------------------------------------------------------------
    // API ROUTE: POST /api/tables/:tableName
    // -------------------------------------------------------------------------
    if (pathname.startsWith('/api/tables/') && req.method === 'POST') {
        const parts = pathname.split('/');
        const tableName = parts[3].toUpperCase();
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const rowData = JSON.parse(body || '{}');
                const result = db.insertRow(tableName, rowData);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: e.message, sqlState: e.sqlState }));
            }
        });
        return;
    }

    // -------------------------------------------------------------------------
    // API ROUTE: PUT /api/tables/:tableName/:id
    // -------------------------------------------------------------------------
    if (pathname.startsWith('/api/tables/') && req.method === 'PUT') {
        const parts = pathname.split('/');
        const tableName = parts[3].toUpperCase();
        const id = parts[4];
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const updates = JSON.parse(body || '{}');
                const table = db.getTable(tableName);
                const pkCol = table.columns.find(c => c.isPk) || table.columns[0];
                const result = db.updateRows(tableName, updates, r => String(r[pkCol.name]) === String(id));
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: e.message }));
            }
        });
        return;
    }

    // -------------------------------------------------------------------------
    // API ROUTE: DELETE /api/tables/:tableName/:id
    // -------------------------------------------------------------------------
    if (pathname.startsWith('/api/tables/') && req.method === 'DELETE') {
        const parts = pathname.split('/');
        const tableName = parts[3].toUpperCase();
        const id = parts[4];
        try {
            const table = db.getTable(tableName);
            const pkCol = table.columns.find(c => c.isPk) || table.columns[0];
            const result = db.deleteRows(tableName, r => String(r[pkCol.name]) === String(id));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
        } catch (e) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: e.message }));
        }
        return;
    }

    // -------------------------------------------------------------------------
    // STATIC FILE SERVING (index.html, styles.css, app.js, etc.)
    // -------------------------------------------------------------------------
    let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        fs.readFile(filePath, (readErr, content) => {
            if (readErr) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('500 Internal Server Error');
                return;
            }
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        });
    });
});

server.listen(PORT, () => {
    console.log(`========================================================`);
    console.log(` NexusCall PostgreSQL JDBC Server running on port ${PORT}`);
    console.log(` REST Endpoints: http://localhost:${PORT}/api/tables`);
    console.log(` SQL Terminal:   http://localhost:${PORT}/api/sql/execute`);
    console.log(` Web Dashboard:  http://localhost:${PORT}/`);
    console.log(`========================================================`);
});
