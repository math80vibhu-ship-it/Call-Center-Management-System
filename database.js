/**
 * NexusCall In-Memory Relational DBMS Engine & Transaction Manager
 * Implements DDL, DML, DQL operations with JDBC / ODBC simulation semantics
 * Referenced from: BACSE202 Database Systems Lab (Dr. Rajesh M & Dr. Swaminathan A)
 */

class SQLException extends Error {
    constructor(message, sqlState = '42000', errorCode = 900) {
        super(message);
        this.name = 'SQLException';
        this.sqlState = sqlState;
        this.errorCode = errorCode;
        this.timestamp = new Date().toLocaleTimeString();
    }
}

class ResultSetMetaData {
    constructor(tableSchema, selectedColumns = null) {
        this.columns = selectedColumns 
            ? tableSchema.columns.filter(c => selectedColumns.includes(c.name) || selectedColumns.includes('*'))
            : [...tableSchema.columns];
    }

    getColumnCount() {
        return this.columns.length;
    }

    getColumnName(index) {
        const col = this.columns[index - 1];
        return col ? col.name : null;
    }

    getColumnType(index) {
        const col = this.columns[index - 1];
        return col ? col.type : null;
    }

    isNullable(index) {
        const col = this.columns[index - 1];
        return col ? col.isNullable : true;
    }

    isPrimaryKey(index) {
        const col = this.columns[index - 1];
        return col ? !!col.isPk : false;
    }

    getAllColumnInfo() {
        return this.columns.map((c, idx) => ({
            index: idx + 1,
            name: c.name,
            type: c.type,
            isPk: !!c.isPk,
            isNullable: c.isNullable
        }));
    }
}

class MockResultSet {
    constructor(rows, metaData) {
        this.rows = rows || [];
        this.metaData = metaData;
        this.cursor = -1;
    }

    next() {
        if (this.cursor < this.rows.length - 1) {
            this.cursor++;
            return true;
        }
        return false;
    }

    getCurrentRow() {
        if (this.cursor >= 0 && this.cursor < this.rows.length) {
            return this.rows[this.cursor];
        }
        return null;
    }

    getInt(columnLabel) {
        const row = this.getCurrentRow();
        if (!row) throw new SQLException('Cursor before start or after end of ResultSet', '24000', 100);
        const val = row[columnLabel];
        return parseInt(val, 10) || 0;
    }

    getDouble(columnLabel) {
        const row = this.getCurrentRow();
        if (!row) throw new SQLException('Cursor before start or after end of ResultSet', '24000', 100);
        const val = row[columnLabel];
        return parseFloat(val) || 0.0;
    }

    getString(columnLabel) {
        const row = this.getCurrentRow();
        if (!row) throw new SQLException('Cursor before start or after end of ResultSet', '24000', 100);
        const val = row[columnLabel];
        return val !== undefined && val !== null ? String(val) : null;
    }

    getMetaData() {
        return this.metaData;
    }

    resetCursor() {
        this.cursor = -1;
    }

    getRowCount() {
        return this.rows.length;
    }
}

class DatabaseEngine {
    constructor() {
        this.tables = {};
        this.autoCommit = true;
        this.transactionSnapshot = null;
        this.pendingDmlCount = 0;
        this.queryHistory = [];
        this.activeConnection = {
            url: 'jdbc:postgresql://localhost:5432/callcenter_db',
            modeUrl: 'jdbc:h2:mem:callcenter_db;MODE=PostgreSQL',
            dsn: 'PostgresCallCenterDSN',
            driver: 'org.postgresql.Driver (PostgreSQL Type 4 Driver)',
            user: 'postgres',
            status: 'CONNECTED',
            connectedAt: new Date().toLocaleTimeString(),
            latencyMs: 2.1
        };

        this.init();
    }

    init() {
        const saved = localStorage.getItem('nexuscall_db');
        if (saved) {
            try {
                this.tables = JSON.parse(saved);
            } catch (e) {
                console.warn('Failed to parse local DB, seeding default', e);
                this.resetToSeed();
            }
        } else {
            this.resetToSeed();
        }
    }

    resetToSeed() {
        if (typeof window !== 'undefined' && window.SEED_DATA) {
            this.tables = JSON.parse(JSON.stringify(window.SEED_DATA.tables));
        } else if (typeof SEED_DATA !== 'undefined') {
            this.tables = JSON.parse(JSON.stringify(SEED_DATA.tables));
        } else {
            this.tables = {};
        }
        this.pendingDmlCount = 0;
        this.transactionSnapshot = null;
        this.save();
        this.logHistory('DATABASE RESET', 'ADMIN', 'Initialized Call Center database with factory seed data.', 0, 'SUCCESS');
    }

    save() {
        try {
            localStorage.setItem('nexuscall_db', JSON.stringify(this.tables));
        } catch (e) {
            console.error('Failed to save to localStorage', e);
        }
    }

    getTableNames() {
        return Object.keys(this.tables);
    }

    getTable(tableName) {
        const upper = (tableName || '').toUpperCase().trim();
        const table = this.tables[upper];
        if (!table) {
            throw new SQLException(`ORA-00942: table or view '${upper}' does not exist`, '42S02', 942);
        }
        return table;
    }

    /* ==========================================================
       TRANSACTION MANAGEMENT (Slides 26, 42, 47)
       ========================================================== */

    setAutoCommit(enabled) {
        const wasAuto = this.autoCommit;
        this.autoCommit = !!enabled;

        if (wasAuto && !this.autoCommit) {
            // Started manual transaction: take snapshot
            this.takeSnapshot();
            this.logHistory('SET AUTOCOMMIT = 0', 'TCL', 'con.setAutoCommit(false); Transaction begun.', 0, 'SUCCESS');
        } else if (!wasAuto && this.autoCommit) {
            // Turning auto-commit back ON automatically commits pending work
            this.commit();
            this.logHistory('SET AUTOCOMMIT = 1', 'TCL', 'con.setAutoCommit(true); Auto-commit restored.', 0, 'SUCCESS');
        }
        return this.autoCommit;
    }

    takeSnapshot() {
        if (!this.transactionSnapshot) {
            this.transactionSnapshot = JSON.parse(JSON.stringify(this.tables));
        }
    }

    commit() {
        if (this.transactionSnapshot) {
            this.transactionSnapshot = null;
        }
        const affected = this.pendingDmlCount;
        this.pendingDmlCount = 0;
        this.save();
        this.logHistory('COMMIT', 'TCL', `con.commit(); Changes permanently flushed to storage.`, affected, 'SUCCESS');
        return {
            success: true,
            message: `Transaction committed successfully. (${affected} pending operation(s) persisted)`,
            sql: 'COMMIT;'
        };
    }

    rollback() {
        if (!this.transactionSnapshot) {
            return {
                success: false,
                message: 'No active transaction to rollback.',
                sql: 'ROLLBACK;'
            };
        }
        this.tables = JSON.parse(JSON.stringify(this.transactionSnapshot));
        this.transactionSnapshot = JSON.parse(JSON.stringify(this.tables)); // re-anchor
        const reverted = this.pendingDmlCount;
        this.pendingDmlCount = 0;
        this.save();
        this.logHistory('ROLLBACK', 'TCL', `con.rollback(); Database reverted to savepoint.`, reverted, 'SUCCESS');
        return {
            success: true,
            message: `Transaction rolled back. (${reverted} uncommitted operation(s) undone)`,
            sql: 'ROLLBACK;'
        };
    }

    markDmlChange() {
        if (!this.autoCommit) {
            this.takeSnapshot();
            this.pendingDmlCount++;
        } else {
            this.save();
        }
    }

    /* ==========================================================
       DATA DEFINITION LANGUAGE (DDL)
       CREATE TABLE, ALTER TABLE, DROP TABLE, TRUNCATE TABLE
       ========================================================== */

    createTable(tableName, columnDefinitions) {
        const startTime = performance.now();
        const upper = tableName.toUpperCase().trim();

        if (!upper.match(/^[A-Z][A-Z0-9_]*$/)) {
            throw new SQLException(`ORA-00903: invalid table name '${tableName}'`, '42000', 903);
        }

        if (this.tables[upper]) {
            throw new SQLException(`ORA-00955: name is already used by an existing object: '${upper}'`, '42S01', 955);
        }

        if (!columnDefinitions || columnDefinitions.length === 0) {
            throw new SQLException(`ORA-02264: name already used by a column or table definition required`, '42000', 2264);
        }

        // Validate columns
        const cols = [];
        let pkCount = 0;
        const colNames = new Set();

        for (const c of columnDefinitions) {
            const colName = c.name.toUpperCase().trim();
            if (colNames.has(colName)) {
                throw new SQLException(`ORA-00957: duplicate column name: '${colName}'`, '42000', 957);
            }
            colNames.add(colName);
            if (c.isPk) pkCount++;

            cols.push({
                name: colName,
                type: (c.type || 'VARCHAR2(50)').toUpperCase().trim(),
                isPk: !!c.isPk,
                isNullable: c.isPk ? false : (c.isNullable !== undefined ? c.isNullable : true)
            });
        }

        this.tables[upper] = {
            columns: cols,
            rows: []
        };

        this.save();
        const duration = Math.round(performance.now() - startTime);
        const sqlText = `CREATE TABLE ${upper} (\n  ${cols.map(c => `${c.name} ${c.type}${c.isPk ? ' PRIMARY KEY' : (!c.isNullable ? ' NOT NULL' : '')}`).join(',\n  ')}\n);`;
        this.logHistory(sqlText, 'DDL', `Table ${upper} created successfully with ${cols.length} column(s).`, 0, 'SUCCESS', duration);

        return {
            success: true,
            tableName: upper,
            columns: cols,
            message: `Table ${upper} created successfully.`,
            sql: sqlText,
            duration
        };
    }

    alterTableAddColumn(tableName, columnDef) {
        const startTime = performance.now();
        const table = this.getTable(tableName);
        const colName = columnDef.name.toUpperCase().trim();

        if (table.columns.some(c => c.name === colName)) {
            throw new SQLException(`ORA-01430: column being added already exists in table: '${colName}'`, '42S21', 1430);
        }

        const newCol = {
            name: colName,
            type: (columnDef.type || 'VARCHAR2(50)').toUpperCase().trim(),
            isPk: false,
            isNullable: columnDef.isNullable !== undefined ? columnDef.isNullable : true
        };

        table.columns.push(newCol);
        // Add default/null value to all existing rows
        const defaultValue = columnDef.defaultValue !== undefined ? columnDef.defaultValue : null;
        for (const row of table.rows) {
            row[colName] = defaultValue;
        }

        this.save();
        const duration = Math.round(performance.now() - startTime);
        const sqlText = `ALTER TABLE ${tableName.toUpperCase()} ADD ${newCol.name} ${newCol.type};`;
        this.logHistory(sqlText, 'DDL', `Column ${newCol.name} added to ${tableName.toUpperCase()}.`, 0, 'SUCCESS', duration);

        return {
            success: true,
            message: `Column ${newCol.name} (${newCol.type}) added to ${tableName.toUpperCase()}.`,
            sql: sqlText,
            duration
        };
    }

    alterTableDropColumn(tableName, colName) {
        const startTime = performance.now();
        const table = this.getTable(tableName);
        const upperCol = colName.toUpperCase().trim();

        const index = table.columns.findIndex(c => c.name === upperCol);
        if (index === -1) {
            throw new SQLException(`ORA-00904: invalid identifier: column '${upperCol}' does not exist`, '42S22', 904);
        }

        if (table.columns[index].isPk) {
            throw new SQLException(`ORA-12991: column '${upperCol}' is referenced in PRIMARY KEY constraint`, '42000', 12991);
        }

        if (table.columns.length <= 1) {
            throw new SQLException(`ORA-12983: cannot drop all columns in table`, '42000', 12983);
        }

        table.columns.splice(index, 1);
        for (const row of table.rows) {
            delete row[upperCol];
        }

        this.save();
        const duration = Math.round(performance.now() - startTime);
        const sqlText = `ALTER TABLE ${tableName.toUpperCase()} DROP COLUMN ${upperCol};`;
        this.logHistory(sqlText, 'DDL', `Column ${upperCol} dropped from ${tableName.toUpperCase()}.`, 0, 'SUCCESS', duration);

        return {
            success: true,
            message: `Column ${upperCol} dropped from ${tableName.toUpperCase()}.`,
            sql: sqlText,
            duration
        };
    }

    truncateTable(tableName) {
        const startTime = performance.now();
        const table = this.getTable(tableName);
        const rowCount = table.rows.length;
        table.rows = [];

        this.save();
        const duration = Math.round(performance.now() - startTime);
        const sqlText = `TRUNCATE TABLE ${tableName.toUpperCase()};`;
        this.logHistory(sqlText, 'DDL', `Table ${tableName.toUpperCase()} truncated. ${rowCount} rows removed.`, rowCount, 'SUCCESS', duration);

        return {
            success: true,
            message: `Table ${tableName.toUpperCase()} truncated successfully (${rowCount} rows removed).`,
            sql: sqlText,
            affectedRows: rowCount,
            duration
        };
    }

    dropTable(tableName) {
        const startTime = performance.now();
        const upper = tableName.toUpperCase().trim();
        this.getTable(upper); // verifies existence

        delete this.tables[upper];
        this.save();
        const duration = Math.round(performance.now() - startTime);
        const sqlText = `DROP TABLE ${upper};`;
        this.logHistory(sqlText, 'DDL', `Table ${upper} dropped.`, 0, 'SUCCESS', duration);

        return {
            success: true,
            message: `Table ${upper} dropped successfully.`,
            sql: sqlText,
            duration
        };
    }

    /* ==========================================================
       DATA MANIPULATION LANGUAGE (DML)
       INSERT, UPDATE, DELETE (with PreparedStatement semantics)
       ========================================================== */

    insertRow(tableName, rowData) {
        const startTime = performance.now();
        const table = this.getTable(tableName);
        const newRow = {};

        // Constraint check: Primary key & NOT NULL
        for (const col of table.columns) {
            let val = rowData[col.name];

            // Primary Key checks
            if (col.isPk) {
                if (val === undefined || val === null || val === '') {
                    throw new SQLException(`ORA-01400: cannot insert NULL into primary key ("SYSTEM"."${tableName.toUpperCase()}"."${col.name}")`, '23000', 1400);
                }
                const numVal = col.type.startsWith('NUM') ? Number(val) : val;
                const exists = table.rows.some(r => r[col.name] === numVal || r[col.name] == val);
                if (exists) {
                    throw new SQLException(`ORA-00001: unique constraint (SYSTEM.PK_${col.name}) violated. Key (${col.name}=${val}) already exists.`, '23000', 1);
                }
                val = numVal;
            } else {
                if (!col.isNullable && (val === undefined || val === null || val === '')) {
                    throw new SQLException(`ORA-01400: cannot insert NULL into ("SYSTEM"."${tableName.toUpperCase()}"."${col.name}")`, '23000', 1400);
                }
                if (col.type.startsWith('NUM') && val !== null && val !== undefined && val !== '') {
                    val = Number(val);
                }
            }

            newRow[col.name] = val !== undefined ? val : null;
        }

        table.rows.push(newRow);
        this.markDmlChange();

        const duration = Math.round(performance.now() - startTime);
        const colNames = Object.keys(newRow).join(', ');
        const placeholders = Object.keys(newRow).map(() => '?').join(', ');
        const sqlText = `INSERT INTO ${tableName.toUpperCase()} (${colNames}) VALUES (${placeholders});`;
        
        this.logHistory(sqlText, 'DML', `1 row inserted into ${tableName.toUpperCase()}. executeUpdate() = 1`, 1, 'SUCCESS', duration);

        return {
            success: true,
            affectedRows: 1,
            insertedRow: newRow,
            message: `1 row inserted into ${tableName.toUpperCase()}. (executeUpdate() returned 1)`,
            sql: sqlText,
            duration
        };
    }

    updateRows(tableName, updates, wherePredicate) {
        const startTime = performance.now();
        const table = this.getTable(tableName);

        // Validate columns to update
        for (const colName of Object.keys(updates)) {
            const col = table.columns.find(c => c.name === colName.toUpperCase().trim());
            if (!col) {
                throw new SQLException(`ORA-00904: invalid identifier: '${colName}'`, '42S22', 904);
            }
            if (col.isPk) {
                throw new SQLException(`ORA-02292: cannot update primary key column '${colName}' directly`, '23000', 2292);
            }
        }

        let affectedCount = 0;
        const modifiedRows = [];

        for (const row of table.rows) {
            let matches = true;
            if (typeof wherePredicate === 'function') {
                matches = wherePredicate(row);
            } else if (typeof wherePredicate === 'object' && wherePredicate !== null) {
                for (const [k, v] of Object.entries(wherePredicate)) {
                    if (row[k] != v) {
                        matches = false;
                        break;
                    }
                }
            }

            if (matches) {
                for (const [k, v] of Object.entries(updates)) {
                    const upperK = k.toUpperCase().trim();
                    const col = table.columns.find(c => c.name === upperK);
                    row[upperK] = (col && col.type.startsWith('NUM') && v !== null && v !== '') ? Number(v) : v;
                }
                modifiedRows.push(row);
                affectedCount++;
            }
        }

        this.markDmlChange();
        const duration = Math.round(performance.now() - startTime);
        const setClauses = Object.keys(updates).map(k => `${k.toUpperCase()} = ?`).join(', ');
        const sqlText = `UPDATE ${tableName.toUpperCase()} SET ${setClauses} WHERE ...;`;
        
        this.logHistory(sqlText, 'DML', `${affectedCount} row(s) updated in ${tableName.toUpperCase()}. executeUpdate() = ${affectedCount}`, affectedCount, 'SUCCESS', duration);

        return {
            success: true,
            affectedRows: affectedCount,
            message: `${affectedCount} row(s) updated in ${tableName.toUpperCase()}. (executeUpdate() returned ${affectedCount})`,
            sql: sqlText,
            modifiedRows,
            duration
        };
    }

    deleteRows(tableName, wherePredicate) {
        const startTime = performance.now();
        const table = this.getTable(tableName);
        const initialCount = table.rows.length;

        const remainingRows = [];
        const deletedRows = [];

        for (const row of table.rows) {
            let matches = true;
            if (typeof wherePredicate === 'function') {
                matches = wherePredicate(row);
            } else if (typeof wherePredicate === 'object' && wherePredicate !== null) {
                for (const [k, v] of Object.entries(wherePredicate)) {
                    if (row[k] != v) {
                        matches = false;
                        break;
                    }
                }
            }

            if (matches) {
                deletedRows.push(row);
            } else {
                remainingRows.push(row);
            }
        }

        const affectedCount = deletedRows.length;
        table.rows = remainingRows;

        this.markDmlChange();
        const duration = Math.round(performance.now() - startTime);
        const sqlText = `DELETE FROM ${tableName.toUpperCase()} WHERE ...;`;
        
        this.logHistory(sqlText, 'DML', `${affectedCount} row(s) deleted from ${tableName.toUpperCase()}. executeUpdate() = ${affectedCount}`, affectedCount, 'SUCCESS', duration);

        return {
            success: true,
            affectedRows: affectedCount,
            message: `${affectedCount} row(s) deleted from ${tableName.toUpperCase()}. (executeUpdate() returned ${affectedCount})`,
            sql: sqlText,
            deletedRows,
            duration
        };
    }

    /* ==========================================================
       DATA QUERY LANGUAGE (DQL)
       SELECT & CURSOR RESULTSET (Slides 20, 21, 38)
       ========================================================== */

    select(tableName, { columns = '*', where = null, orderBy = null, orderDir = 'ASC', limit = null } = {}) {
        const startTime = performance.now();
        const table = this.getTable(tableName);

        // Filter rows
        let resultRows = table.rows.filter(row => {
            if (!where) return true;
            if (typeof where === 'function') return where(row);
            for (const [k, v] of Object.entries(where)) {
                if (v !== undefined && v !== null && v !== '') {
                    if (String(row[k]).toLowerCase() !== String(v).toLowerCase()) {
                        return false;
                    }
                }
            }
            return true;
        });

        // Sort rows
        if (orderBy) {
            const upperOrder = orderBy.toUpperCase().trim();
            const dir = orderDir.toUpperCase() === 'DESC' ? -1 : 1;
            resultRows.sort((a, b) => {
                const valA = a[upperOrder];
                const valB = b[upperOrder];
                if (valA === valB) return 0;
                if (valA === null || valA === undefined) return 1;
                if (valB === null || valB === undefined) return -1;
                if (typeof valA === 'number' && typeof valB === 'number') {
                    return (valA - valB) * dir;
                }
                return String(valA).localeCompare(String(valB)) * dir;
            });
        }

        // Limit
        if (limit && Number(limit) > 0) {
            resultRows = resultRows.slice(0, Number(limit));
        }

        // Columns projection
        let selectedCols = columns;
        if (typeof columns === 'string') {
            selectedCols = columns.split(',').map(c => c.trim().toUpperCase());
        }

        let projectedRows = resultRows;
        if (selectedCols && !selectedCols.includes('*')) {
            projectedRows = resultRows.map(row => {
                const projected = {};
                for (const col of selectedCols) {
                    projected[col] = row[col];
                }
                return projected;
            });
        }

        const metaData = new ResultSetMetaData(table, selectedCols);
        const resultSet = new MockResultSet(projectedRows, metaData);

        const duration = Math.round(performance.now() - startTime);
        const sqlText = `SELECT ${Array.isArray(selectedCols) ? selectedCols.join(', ') : selectedCols} FROM ${tableName.toUpperCase()}${orderBy ? ` ORDER BY ${orderBy} ${orderDir}` : ''};`;

        this.logHistory(sqlText, 'DQL', `Fetched ${projectedRows.length} row(s) from ${tableName.toUpperCase()}.`, projectedRows.length, 'SUCCESS', duration);

        return {
            resultSet,
            rows: projectedRows,
            rowCount: projectedRows.length,
            metaData,
            sql: sqlText,
            duration
        };
    }

    /* ==========================================================
       SQL PARSER & RUNNER (DDL / DML / DQL / TCL)
       Supports direct SQL terminal execution!
       ========================================================== */

    executeSql(rawSql) {
        const cleanSql = (rawSql || '').trim().replace(/;+$/, '');
        if (!cleanSql) {
            throw new SQLException('ORA-00900: invalid SQL statement (empty query)', '42000', 900);
        }

        const upper = cleanSql.toUpperCase();

        // TCL
        if (upper === 'COMMIT') return this.commit();
        if (upper === 'ROLLBACK') return this.rollback();

        // DDL: CREATE TABLE
        if (upper.startsWith('CREATE TABLE')) {
            return this.parseAndExecuteCreateTable(cleanSql);
        }

        // DDL: ALTER TABLE
        if (upper.startsWith('ALTER TABLE')) {
            return this.parseAndExecuteAlterTable(cleanSql);
        }

        // DDL: DROP TABLE
        if (upper.startsWith('DROP TABLE')) {
            const match = cleanSql.match(/DROP\s+TABLE\s+([A-Za-z0-9_]+)/i);
            if (!match) throw new SQLException('Syntax Error: Expected DROP TABLE <table_name>', '42000', 900);
            return this.dropTable(match[1]);
        }

        // DDL: TRUNCATE TABLE
        if (upper.startsWith('TRUNCATE TABLE')) {
            const match = cleanSql.match(/TRUNCATE\s+TABLE\s+([A-Za-z0-9_]+)/i);
            if (!match) throw new SQLException('Syntax Error: Expected TRUNCATE TABLE <table_name>', '42000', 900);
            return this.truncateTable(match[1]);
        }

        // DML: INSERT
        if (upper.startsWith('INSERT INTO')) {
            return this.parseAndExecuteInsert(cleanSql);
        }

        // DML: UPDATE
        if (upper.startsWith('UPDATE')) {
            return this.parseAndExecuteUpdate(cleanSql);
        }

        // DML: DELETE
        if (upper.startsWith('DELETE FROM') || upper.startsWith('DELETE')) {
            return this.parseAndExecuteDelete(cleanSql);
        }

        // DQL: SELECT
        if (upper.startsWith('SELECT')) {
            return this.parseAndExecuteSelect(cleanSql);
        }

        throw new SQLException(`ORA-00900: unrecognized SQL statement or keyword: '${cleanSql.slice(0, 20)}...'`, '42000', 900);
    }

    parseAndExecuteCreateTable(sql) {
        const match = sql.match(/CREATE\s+TABLE\s+([A-Za-z0-9_]+)\s*\(([\s\S]+)\)/i);
        if (!match) {
            throw new SQLException('Syntax Error: malformed CREATE TABLE statement. Expected CREATE TABLE name (col type, ...)', '42000', 900);
        }
        const tableName = match[1];
        const colDefsRaw = match[2].split(',');
        const columnDefinitions = [];

        for (const colRaw of colDefsRaw) {
            const parts = colRaw.trim().split(/\s+/);
            if (parts.length < 2) continue;
            const name = parts[0];
            const type = parts[1];
            const isPk = /PRIMARY\s+KEY/i.test(colRaw);
            const isNullable = !/NOT\s+NULL/i.test(colRaw) && !isPk;

            columnDefinitions.push({ name, type, isPk, isNullable });
        }

        return this.createTable(tableName, columnDefinitions);
    }

    parseAndExecuteAlterTable(sql) {
        const addMatch = sql.match(/ALTER\s+TABLE\s+([A-Za-z0-9_]+)\s+ADD\s+([A-Za-z0-9_]+)\s+([A-Za-z0-9_()]+)/i);
        if (addMatch) {
            return this.alterTableAddColumn(addMatch[1], { name: addMatch[2], type: addMatch[3] });
        }

        const dropMatch = sql.match(/ALTER\s+TABLE\s+([A-Za-z0-9_]+)\s+DROP\s+COLUMN\s+([A-Za-z0-9_]+)/i);
        if (dropMatch) {
            return this.alterTableDropColumn(dropMatch[1], dropMatch[2]);
        }

        throw new SQLException('Unsupported ALTER TABLE syntax. Supported: ADD <col> <type> | DROP COLUMN <col>', '42000', 900);
    }

    parseAndExecuteInsert(sql) {
        const match = sql.match(/INSERT\s+INTO\s+([A-Za-z0-9_]+)\s*(?:\(([^)]+)\))?\s*VALUES\s*\(([\s\S]+)\)/i);
        if (!match) {
            throw new SQLException('Syntax Error: Expected INSERT INTO table [(cols...)] VALUES (vals...)', '42000', 900);
        }
        const tableName = match[1];
        const colsSpecified = match[2] ? match[2].split(',').map(c => c.trim().toUpperCase()) : null;
        
        // Parse CSV values respecting quotes
        const rawVals = this.splitCsvValues(match[3]);
        const table = this.getTable(tableName);

        const targetCols = colsSpecified || table.columns.map(c => c.name);
        if (rawVals.length !== targetCols.length) {
            throw new SQLException(`ORA-00947: not enough values. Expected ${targetCols.length}, got ${rawVals.length}`, '42000', 947);
        }

        const rowData = {};
        targetCols.forEach((colName, idx) => {
            let val = rawVals[idx].trim();
            if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
                val = val.slice(1, -1);
            } else if (val.toUpperCase() === 'NULL') {
                val = null;
            } else if (!isNaN(val) && val !== '') {
                val = Number(val);
            }
            rowData[colName] = val;
        });

        return this.insertRow(tableName, rowData);
    }

    parseAndExecuteUpdate(sql) {
        const match = sql.match(/UPDATE\s+([A-Za-z0-9_]+)\s+SET\s+([\s\S]+?)(?:\s+WHERE\s+([\s\S]+))?$/i);
        if (!match) {
            throw new SQLException('Syntax Error: Expected UPDATE table SET col1 = val1, ... [WHERE condition]', '42000', 900);
        }
        const tableName = match[1];
        const setClausesRaw = match[2].split(',');
        const whereClauseRaw = match[3];

        const updates = {};
        for (const clause of setClausesRaw) {
            const eqIdx = clause.indexOf('=');
            if (eqIdx === -1) continue;
            const col = clause.substring(0, eqIdx).trim().toUpperCase();
            let val = clause.substring(eqIdx + 1).trim();
            if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
                val = val.slice(1, -1);
            } else if (val.toUpperCase() === 'NULL') {
                val = null;
            } else if (!isNaN(val) && val !== '') {
                val = Number(val);
            }
            updates[col] = val;
        }

        const predicate = whereClauseRaw ? this.createWherePredicate(whereClauseRaw) : () => true;
        return this.updateRows(tableName, updates, predicate);
    }

    parseAndExecuteDelete(sql) {
        const match = sql.match(/DELETE\s+(?:FROM\s+)?([A-Za-z0-9_]+)(?:\s+WHERE\s+([\s\S]+))?$/i);
        if (!match) {
            throw new SQLException('Syntax Error: Expected DELETE FROM table [WHERE condition]', '42000', 900);
        }
        const tableName = match[1];
        const whereClauseRaw = match[2];

        const predicate = whereClauseRaw ? this.createWherePredicate(whereClauseRaw) : () => true;
        return this.deleteRows(tableName, predicate);
    }

    parseAndExecuteSelect(sql) {
        const match = sql.match(/SELECT\s+([\s\S]+?)\s+FROM\s+([A-Za-z0-9_]+)(?:\s+WHERE\s+([\s\S]+?))?(?:\s+ORDER\s+BY\s+([A-Za-z0-9_]+)(?:\s+(ASC|DESC))?)?(?:\s+LIMIT\s+(\d+))?$/i);
        if (!match) {
            // Simplified fallback for basic SELECT * FROM table
            const basic = sql.match(/SELECT\s+([\s\S]+?)\s+FROM\s+([A-Za-z0-9_]+)/i);
            if (!basic) {
                throw new SQLException('Syntax Error: Expected SELECT columns FROM table [WHERE ...] [ORDER BY ...] [LIMIT ...]', '42000', 900);
            }
            return this.select(basic[2], { columns: basic[1] });
        }

        const colsRaw = match[1];
        const tableName = match[2];
        const whereClause = match[3];
        const orderBy = match[4];
        const orderDir = match[5] || 'ASC';
        const limit = match[6];

        const predicate = whereClause ? this.createWherePredicate(whereClause) : null;
        return this.select(tableName, {
            columns: colsRaw,
            where: predicate,
            orderBy,
            orderDir,
            limit
        });
    }

    createWherePredicate(whereStr) {
        // Basic parser for simple WHERE clauses (e.g., COL = val, COL >= val, COL LIKE '%abc%')
        const str = whereStr.trim();
        return (row) => {
            // Support AND chains
            const conditions = str.split(/\s+AND\s+/i);
            for (const cond of conditions) {
                if (!this.evaluateCondition(cond.trim(), row)) {
                    return false;
                }
            }
            return true;
        };
    }

    evaluateCondition(cond, row) {
        // Operators: >=, <=, !=, <>, =, >, <, LIKE
        const ops = ['>=', '<=', '!=', '<>', '=', '>', '<', 'LIKE'];
        let matchedOp = null;
        for (const op of ops) {
            const regex = new RegExp(`\\b${op}\\b|${op.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
            if (regex.test(cond)) {
                matchedOp = op;
                break;
            }
        }

        if (!matchedOp) return true;

        const parts = cond.split(new RegExp(`\\s*${matchedOp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'i'));
        if (parts.length < 2) return true;

        const col = parts[0].trim().toUpperCase();
        let target = parts[1].trim();

        if ((target.startsWith("'") && target.endsWith("'")) || (target.startsWith('"') && target.endsWith('"'))) {
            target = target.slice(1, -1);
        } else if (!isNaN(target) && target !== '') {
            target = Number(target);
        }

        const actual = row[col];

        switch (matchedOp.toUpperCase()) {
            case '=':
                return String(actual).toLowerCase() == String(target).toLowerCase();
            case '!=':
            case '<>':
                return String(actual).toLowerCase() != String(target).toLowerCase();
            case '>':
                return Number(actual) > Number(target);
            case '>=':
                return Number(actual) >= Number(target);
            case '<':
                return Number(actual) < Number(target);
            case '<=':
                return Number(actual) <= Number(target);
            case 'LIKE':
                const pattern = String(target).replace(/%/g, '.*').replace(/_/g, '.');
                return new RegExp(`^${pattern}$`, 'i').test(String(actual));
            default:
                return true;
        }
    }

    splitCsvValues(str) {
        const results = [];
        let curr = '';
        let inQuotes = false;
        let quoteChar = '';

        for (let i = 0; i < str.length; i++) {
            const ch = str[i];
            if ((ch === "'" || ch === '"') && (i === 0 || str[i - 1] !== '\\')) {
                if (!inQuotes) {
                    inQuotes = true;
                    quoteChar = ch;
                } else if (quoteChar === ch) {
                    inQuotes = false;
                }
            } else if (ch === ',' && !inQuotes) {
                results.push(curr.trim());
                curr = '';
                continue;
            }
            curr += ch;
        }
        if (curr.trim()) results.push(curr.trim());
        return results;
    }

    logHistory(sql, type, message, rowsAffected, status = 'SUCCESS', duration = 3) {
        const entry = {
            id: 'TXN-' + Math.floor(100000 + Math.random() * 900000),
            timestamp: new Date().toLocaleTimeString(),
            sql: sql.trim(),
            type, // DDL, DML, DQL, TCL
            message,
            rowsAffected,
            status,
            duration: `${duration}ms`
        };
        this.queryHistory.unshift(entry);
        if (this.queryHistory.length > 50) {
            this.queryHistory.pop();
        }
    }
}

// Global instance
window.db = new DatabaseEngine();
