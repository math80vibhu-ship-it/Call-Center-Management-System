/**
 * NexusCall DBMS - Frontend Controller & Lab Interaction Engine
 * Connects UI with In-Memory Database Engine and JDBC/ODBC Simulator
 */

let activeTable = 'CALL_RECORDS';
let currentUser = { username: 'admin', role: 'Administrator' };
let currentCodeView = 'JDBC'; // 'JDBC', 'ODBC', 'META'
let currentStepperCursor = -1;
let currentDisplayedRows = [];
let editingRowPk = null;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    renderTableTabs();
    refreshActiveTable();
    updateMetrics();
    updateTransactionUi();
    updateCodeInspector();

    // Initialize DDL & DML sections
    initDdlAndDmlSections();

    // Setup SQL terminal Enter key handler (Ctrl+Enter or Cmd+Enter)
    const sqlInput = document.getElementById('sqlTerminalInput');
    if (sqlInput) {
        sqlInput.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                handleExecuteTerminalSql();
            }
        });
    }
}

/* ==========================================================================
   AUTHENTICATION & SESSION MANAGEMENT
   ========================================================================== */

function selectRole(user, pass, roleTitle) {
    document.getElementById('loginUsername').value = user;
    document.getElementById('loginPassword').value = pass;

    document.querySelectorAll('.role-chip').forEach(btn => btn.classList.remove('active'));
    if (user === 'postgres' || user === 'admin') document.getElementById('btnRoleAdmin').classList.add('active');
    else if (user === 'supervisor') document.getElementById('btnRoleSupervisor').classList.add('active');
    else if (user === 'agent_sarah') document.getElementById('btnRoleAgent').classList.add('active');
}

function handleLogin() {
    const user = document.getElementById('loginUsername').value.trim();
    const pass = document.getElementById('loginPassword').value.trim();

    if (!user || !pass) {
        showToast('Login Error', 'Please enter both database username and password.', 'error');
        return;
    }

    let role = 'Support Agent';
    if (user.toLowerCase().includes('admin') || user.toLowerCase() === 'system' || user.toLowerCase() === 'postgres') {
        role = 'Postgres DBA';
    } else if (user.toLowerCase().includes('super')) {
        role = 'Supervisor';
    }

    currentUser = { username: user, role };

    document.getElementById('userNameDisplay').textContent = `${role} (${user})`;
    document.getElementById('userAvatar').textContent = user.charAt(0).toUpperCase();

    const overlay = document.getElementById('authOverlay');
    overlay.classList.add('hidden');

    showToast('Database Connected', `Session opened via PostgreSQL JDBC Type 4 driver as ${user}.`, 'success', '00000');
    updateMetrics();
    refreshActiveTable();
}

function handleLogout() {
    const overlay = document.getElementById('authOverlay');
    overlay.classList.remove('hidden');
    handleResetResultSetCursor();
    showToast('Session Closed', 'Disconnected from PostgreSQL database session.', 'info');
}

/* ==========================================================================
   TABLE SELECTION & NAVIGATION
   ========================================================================== */

function renderTableTabs() {
    const container = document.getElementById('tableTabsContainer');
    if (!container) return;
    container.innerHTML = '';

    const tableNames = window.db.getTableNames();

    tableNames.forEach(tbl => {
        const rowCount = window.db.tables[tbl].rows.length;
        const btn = document.createElement('button');
        btn.className = `tab-btn ${tbl === activeTable ? 'active' : ''}`;
        btn.innerHTML = `
            <span>${tbl}</span>
            <span class="table-badge-count">${rowCount}</span>
        `;
        btn.onclick = () => switchTable(tbl);
        container.appendChild(btn);
    });
}

function switchTable(tableName) {
    activeTable = tableName;
    handleResetResultSetCursor();
    renderTableTabs();
    populateSortColumnOptions();
    refreshActiveTable();
    updateCodeInspector();
}

function populateSortColumnOptions() {
    const select = document.getElementById('sortColumnSelect');
    if (!select) return;
    select.innerHTML = '<option value="">Default Sort</option>';

    try {
        const table = window.db.getTable(activeTable);
        table.columns.forEach(col => {
            const opt = document.createElement('option');
            opt.value = col.name;
            opt.textContent = `Sort by ${col.name}`;
            select.appendChild(opt);
        });
    } catch (e) {
        console.warn(e);
    }
}

/* ==========================================================================
   DQL FILTERING & RESULTSET RENDERING
   ========================================================================== */

function refreshActiveTable() {
    const tableLabel = document.getElementById('activeTableLabel');
    const badge = document.getElementById('tableRowCountBadge');
    const dqlIndicator = document.getElementById('dqlQueryIndicator');

    if (tableLabel) tableLabel.textContent = `TABLE: ${activeTable}`;

    // Get filter inputs
    const searchVal = (document.getElementById('tableSearchInput')?.value || '').trim().toLowerCase();
    const deptVal = document.getElementById('filterDepartment')?.value || '';
    const statusVal = document.getElementById('filterStatus')?.value || '';
    const ratingVal = document.getElementById('filterRating')?.value || '';
    const sortCol = document.getElementById('sortColumnSelect')?.value || '';
    const sortDir = document.getElementById('sortDirectionSelect')?.value || 'ASC';

    // Show or hide Call Center specific filters if on other tables
    const filterGroup = document.getElementById('dqlFilterControls');
    if (activeTable === 'CALL_RECORDS') {
        document.getElementById('filterDepartment').style.display = 'inline-block';
        document.getElementById('filterStatus').style.display = 'inline-block';
        document.getElementById('filterRating').style.display = 'inline-block';
    } else {
        document.getElementById('filterDepartment').style.display = 'none';
        document.getElementById('filterStatus').style.display = 'none';
        document.getElementById('filterRating').style.display = 'none';
    }

    try {
        const table = window.db.getTable(activeTable);
        let rows = [...table.rows];

        // Apply Call Center filters
        if (activeTable === 'CALL_RECORDS') {
            if (deptVal) rows = rows.filter(r => r.DEPARTMENT === deptVal);
            if (statusVal) rows = rows.filter(r => r.CALL_STATUS === statusVal);
            if (ratingVal) {
                if (ratingVal === '5') rows = rows.filter(r => Number(r.RATING) === 5);
                else if (ratingVal === '4+') rows = rows.filter(r => Number(r.RATING) >= 4);
                else if (ratingVal === 'below3') rows = rows.filter(r => Number(r.RATING) < 3);
            }
        }

        // Apply general text search across all columns
        if (searchVal) {
            rows = rows.filter(row => {
                return Object.values(row).some(val => 
                    val !== null && val !== undefined && String(val).toLowerCase().includes(searchVal)
                );
            });
        }

        // Apply sorting
        if (sortCol) {
            const dir = sortDir === 'DESC' ? -1 : 1;
            rows.sort((a, b) => {
                const va = a[sortCol];
                const vb = b[sortCol];
                if (va === vb) return 0;
                if (va === null || va === undefined) return 1;
                if (vb === null || vb === undefined) return -1;
                if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
                return String(va).localeCompare(String(vb)) * dir;
            });
        }

        currentDisplayedRows = rows;

        // Render Table Headers
        renderTableHeader(table);

        // Render Table Body
        renderTableBody(table, rows);

        if (badge) badge.textContent = `${rows.length} / ${table.rows.length} Rows`;
        const countDisplay = document.getElementById('displayingRowCount');
        if (countDisplay) countDisplay.textContent = rows.length;

        // Query string indicator
        let whereClauses = [];
        if (deptVal) whereClauses.push(`DEPARTMENT = '${deptVal}'`);
        if (statusVal) whereClauses.push(`CALL_STATUS = '${statusVal}'`);
        if (ratingVal === '5') whereClauses.push(`RATING = 5`);
        else if (ratingVal === '4+') whereClauses.push(`RATING >= 4`);
        else if (ratingVal === 'below3') whereClauses.push(`RATING < 3`);
        if (searchVal) whereClauses.push(`(SEARCH LIKE '%${searchVal}%')`);

        const whereText = whereClauses.length > 0 ? ` WHERE ${whereClauses.join(' AND ')}` : '';
        const orderText = sortCol ? ` ORDER BY ${sortCol} ${sortDir}` : '';
        if (dqlIndicator) {
            dqlIndicator.textContent = `SELECT * FROM ${activeTable}${whereText}${orderText};`;
        }

    } catch (e) {
        console.error('Error refreshing table:', e);
    }
}

function renderTableHeader(table) {
    const thead = document.getElementById('tableHead');
    if (!thead) return;
    thead.innerHTML = '';

    const tr = document.createElement('tr');

    table.columns.forEach(col => {
        const th = document.createElement('th');
        if (col.isPk) th.classList.add('pk-column');
        th.innerHTML = `
            <span>${col.name}</span>
            ${col.isPk ? '<span style="font-size: 9px; background: rgba(56, 189, 248, 0.2); padding: 1px 4px; border-radius: 3px; margin-left: 4px;">PK</span>' : ''}
        `;
        th.onclick = () => {
            const select = document.getElementById('sortColumnSelect');
            const dirSelect = document.getElementById('sortDirectionSelect');
            if (select.value === col.name) {
                dirSelect.value = dirSelect.value === 'ASC' ? 'DESC' : 'ASC';
            } else {
                select.value = col.name;
                dirSelect.value = 'ASC';
            }
            refreshActiveTable();
        };
        tr.appendChild(th);
    });

    // Actions Header
    const thActions = document.createElement('th');
    thActions.textContent = 'ACTIONS';
    thActions.style.textAlign = 'center';
    tr.appendChild(thActions);

    thead.appendChild(tr);
}

function renderTableBody(table, rows) {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (rows.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = table.columns.length + 1;
        td.style.textAlign = 'center';
        td.style.padding = '36px';
        td.style.color = 'var(--text-muted)';
        td.innerHTML = `
            <div style="font-size: 24px; margin-bottom: 8px;">📭</div>
            <div>No matching records found in <strong>${activeTable}</strong></div>
            <div style="font-size: 11px; margin-top: 4px;">Try clearing search filters or insert a new record.</div>
        `;
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
    }

    const pkCol = table.columns.find(c => c.isPk) || table.columns[0];

    rows.forEach((row, rowIdx) => {
        const tr = document.createElement('tr');
        tr.id = `row-${rowIdx}`;
        if (rowIdx === currentStepperCursor) {
            tr.classList.add('active-stepper-row');
        }

        table.columns.forEach(col => {
            const td = document.createElement('td');
            const val = row[col.name];

            // Custom formatting for specific Call Center fields
            if (col.name === 'CALL_STATUS' || col.name === 'STATUS') {
                const statusStr = String(val || '').toLowerCase().replace(/\s+/g, '-');
                td.innerHTML = `<span class="badge-status ${statusStr}">${val || 'UNKNOWN'}</span>`;
            } else if (col.name === 'RATING') {
                const ratingNum = Number(val) || 0;
                let stars = '★'.repeat(ratingNum) + '☆'.repeat(Math.max(0, 5 - ratingNum));
                td.innerHTML = `<span class="rating-stars">${stars}</span> <span style="font-size: 11px; color: var(--text-muted);">(${ratingNum})</span>`;
            } else if (col.name === 'DURATION_SECS') {
                const secs = Number(val) || 0;
                const m = Math.floor(secs / 60);
                const s = secs % 60;
                td.textContent = `${m}m ${s}s (${secs}s)`;
            } else if (col.name === 'PRIORITY') {
                const p = String(val || '').toUpperCase();
                const cls = p === 'CRITICAL' ? 'escalated' : p === 'HIGH' ? 'in-progress' : 'pending';
                td.innerHTML = `<span class="badge-status ${cls}">${val}</span>`;
            } else {
                td.textContent = val !== null && val !== undefined ? String(val) : '—';
            }

            tr.appendChild(td);
        });

        // Action Buttons (Update & Delete)
        const tdActions = document.createElement('td');
        tdActions.className = 'table-row-actions';
        tdActions.style.justifyContent = 'center';

        const btnEdit = document.createElement('button');
        btnEdit.className = 'btn-table-action';
        btnEdit.innerHTML = '✏ Edit';
        btnEdit.title = 'Parameterized UPDATE';
        btnEdit.onclick = () => openUpdateModal(row[pkCol.name]);

        const btnDel = document.createElement('button');
        btnDel.className = 'btn-table-action delete';
        btnDel.innerHTML = '🗑 Delete';
        btnDel.title = 'Parameterized DELETE';
        btnDel.onclick = () => handleDeleteRecord(row[pkCol.name]);

        tdActions.appendChild(btnEdit);
        tdActions.appendChild(btnDel);
        tr.appendChild(tdActions);

        tbody.appendChild(tr);
    });
}

function handleSearchFilter() {
    refreshActiveTable();
    updateCodeInspector();
}

/* ==========================================================================
   METRICS / HUD CALCULATOR
   ========================================================================== */

function updateMetrics() {
    try {
        const callTable = window.db.getTable('CALL_RECORDS');
        const agentTable = window.db.getTable('AGENTS');

        const calls = callTable ? callTable.rows : [];
        const totalCalls = calls.length;

        // Resolution Rate
        const resolvedCalls = calls.filter(c => c.CALL_STATUS === 'Resolved').length;
        const resolutionRate = totalCalls > 0 ? Math.round((resolvedCalls / totalCalls) * 100) : 0;

        // Avg Duration
        const totalDuration = calls.reduce((acc, c) => acc + (Number(c.DURATION_SECS) || 0), 0);
        const avgDurationSecs = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;
        const avgMin = Math.floor(avgDurationSecs / 60);
        const avgSec = avgDurationSecs % 60;

        // Avg Rating
        const ratedCalls = calls.filter(c => c.RATING !== null && c.RATING !== undefined);
        const totalRating = ratedCalls.reduce((acc, c) => acc + Number(c.RATING), 0);
        const avgRating = ratedCalls.length > 0 ? (totalRating / ratedCalls.length).toFixed(1) : '0.0';

        // Active Agents
        const activeAgentsCount = agentTable ? agentTable.rows.filter(a => a.STATUS === 'Active' || a.STATUS === 'On Call').length : 0;

        document.getElementById('kpiTotalCalls').textContent = totalCalls;
        document.getElementById('kpiResolutionRate').textContent = `${resolutionRate}%`;
        document.getElementById('kpiAvgDuration').textContent = `${avgMin}m ${avgSec}s`;
        document.getElementById('kpiAvgRating').textContent = `${avgRating} ★`;
        document.getElementById('kpiActiveAgents').textContent = activeAgentsCount;

    } catch (e) {
        console.warn('Metrics update error:', e);
    }
}

/* ==========================================================================
   TRANSACTION CONTROL (TCL) - COMMIT & ROLLBACK (Slides 26, 42)
   ========================================================================== */

function handleToggleAutoCommit(isChecked) {
    window.db.setAutoCommit(isChecked);
    updateTransactionUi();
    if (isChecked) {
        showToast('Auto-Commit ENABLED', 'con.setAutoCommit(true); All DML statements commit immediately.', 'info', '00000');
    } else {
        showToast('Auto-Commit DISABLED', 'con.setAutoCommit(false); Manual transaction active. Remember to COMMIT or ROLLBACK.', 'info', '00000');
    }
    updateCodeInspector();
}

function updateTransactionUi() {
    const isAuto = window.db.autoCommit;
    const badge = document.getElementById('autoCommitBadge');
    const desc = document.getElementById('transactionStatusDesc');
    const toggle = document.getElementById('autoCommitToggle');
    const btnCommit = document.getElementById('btnCommit');
    const btnRollback = document.getElementById('btnRollback');

    if (toggle) toggle.checked = isAuto;

    if (isAuto) {
        if (badge) {
            badge.className = 'transaction-pill autocommit-on';
            badge.innerHTML = '<span class="status-indicator-green"></span> Auto-Commit: ENABLED';
        }
        if (desc) desc.textContent = 'Statements are committed immediately (con.setAutoCommit(true)).';
        if (btnCommit) btnCommit.style.opacity = '0.5';
        if (btnRollback) btnRollback.style.opacity = '0.5';
    } else {
        const pending = window.db.pendingDmlCount;
        if (badge) {
            badge.className = 'transaction-pill autocommit-off';
            badge.innerHTML = `⚠️ Manual Transaction (${pending} pending DML)`;
        }
        if (desc) desc.textContent = `Changes held in uncommitted buffer. Call con.commit() to persist or con.rollback() to undo.`;
        if (btnCommit) btnCommit.style.opacity = '1';
        if (btnRollback) btnRollback.style.opacity = '1';
    }
}

function handleCommit() {
    try {
        const res = window.db.commit();
        updateTransactionUi();
        showToast('Transaction Committed', res.message, 'success', '00000');
        updateCodeInspector(window.JdbcSimulator.generateJdbcTransaction(true));
    } catch (e) {
        showToast('Commit Error', e.message, 'error', e.sqlState);
    }
}

function handleRollback() {
    try {
        const res = window.db.rollback();
        updateTransactionUi();
        refreshActiveTable();
        updateMetrics();
        showToast('Transaction Rolled Back', res.message, 'info', '00000');
        updateCodeInspector(window.JdbcSimulator.generateJdbcTransaction(false));
    } catch (e) {
        showToast('Rollback Error', e.message, 'error', e.sqlState);
    }
}

function handleResetDatabase() {
    if (confirm('Reset entire Call Center database to factory lab seed data?')) {
        window.db.resetToSeed();
        renderTableTabs();
        refreshActiveTable();
        updateMetrics();
        updateTransactionUi();
        showToast('Database Reset', 'Initialized all tables with authentic Call Center data.', 'success', '00000');
    }
}

/* ==========================================================================
   DML OPERATIONS: INSERT RECORD (Slide 22)
   ========================================================================== */

function openInsertModal() {
    const table = window.db.getTable(activeTable);
    const form = document.getElementById('insertForm');
    document.getElementById('insertModalTableTitle').textContent = activeTable;
    form.innerHTML = '';

    table.columns.forEach(col => {
        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';

        const label = document.createElement('label');
        label.textContent = `${col.name} ${col.isPk ? '(PRIMARY KEY)' : (!col.isNullable ? '(REQUIRED)' : '')}`;

        let input;
        if (col.name === 'DEPARTMENT') {
            input = document.createElement('select');
            input.className = 'select-control';
            input.style.width = '100%';
            input.style.height = '42px';
            input.innerHTML = `
                <option value="Technical Support">Technical Support</option>
                <option value="Billing & Accounts">Billing & Accounts</option>
                <option value="Sales & Inquiries">Sales & Inquiries</option>
                <option value="Complaints">Complaints</option>
                <option value="General Helpdesk">General Helpdesk</option>
            `;
        } else if (col.name === 'CALL_STATUS' || col.name === 'STATUS') {
            input = document.createElement('select');
            input.className = 'select-control';
            input.style.width = '100%';
            input.style.height = '42px';
            input.innerHTML = activeTable === 'CALL_RECORDS' ? `
                <option value="Resolved">Resolved</option>
                <option value="In Progress">In Progress</option>
                <option value="Escalated">Escalated</option>
                <option value="Pending Customer">Pending Customer</option>
                <option value="Dropped">Dropped</option>
            ` : `
                <option value="Active">Active</option>
                <option value="On Call">On Call</option>
                <option value="Break">Break</option>
                <option value="Offline">Offline</option>
            `;
        } else if (col.name === 'RATING') {
            input = document.createElement('select');
            input.className = 'select-control';
            input.style.width = '100%';
            input.style.height = '42px';
            input.innerHTML = `
                <option value="5">5 - Excellent ★★★★★</option>
                <option value="4">4 - Good ★★★★☆</option>
                <option value="3">3 - Satisfactory ★★★☆☆</option>
                <option value="2">2 - Needs Improvement ★★☆☆☆</option>
                <option value="1">1 - Poor ★☆☆☆☆</option>
            `;
        } else {
            input = document.createElement('input');
            input.className = 'input-control';
            input.style.paddingLeft = '14px';
            input.type = col.type.startsWith('NUM') ? 'number' : 'text';

            // Auto-suggest next PK value
            if (col.isPk && col.type.startsWith('NUM')) {
                const maxId = table.rows.reduce((max, r) => Math.max(max, Number(r[col.name]) || 0), 1000);
                input.value = maxId + 1;
            } else if (col.name === 'CALL_DATE') {
                const now = new Date();
                input.value = `${now.toISOString().split('T')[0]} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            } else if (col.name === 'DURATION_SECS') {
                input.value = 240;
            }
        }

        input.id = `insert_${col.name}`;
        input.name = col.name;
        if (!col.isNullable) input.required = true;

        formGroup.appendChild(label);
        formGroup.appendChild(input);
        form.appendChild(formGroup);
    });

    openModal('modalInsert');
}

function submitInsertRecord() {
    try {
        const table = window.db.getTable(activeTable);
        const newRow = {};

        table.columns.forEach(col => {
            const el = document.getElementById(`insert_${col.name}`);
            if (el) {
                let val = el.value.trim();
                if (col.type.startsWith('NUM') && val !== '') val = Number(val);
                newRow[col.name] = val;
            }
        });

        const res = window.db.insertRow(activeTable, newRow);

        closeModal('modalInsert');
        renderTableTabs();
        refreshActiveTable();
        updateMetrics();
        updateTransactionUi();

        showToast('INSERT Executed', res.message, 'success', '00000');
        updateCodeInspector(window.JdbcSimulator.generateJdbcInsert(activeTable, newRow));

    } catch (e) {
        showToast('DML Error', e.message, 'error', e.sqlState || '23000');
    }
}

/* ==========================================================================
   DML OPERATIONS: UPDATE RECORD (Slide 23)
   ========================================================================== */

function openUpdateModal(pkVal) {
    editingRowPk = pkVal;
    const table = window.db.getTable(activeTable);
    const pkCol = table.columns.find(c => c.isPk) || table.columns[0];
    const row = table.rows.find(r => r[pkCol.name] == pkVal);

    if (!row) {
        showToast('Error', `Record with ${pkCol.name} = ${pkVal} not found.`, 'error');
        return;
    }

    const form = document.getElementById('updateForm');
    document.getElementById('updateModalTableTitle').textContent = `${activeTable} (${pkCol.name} = ${pkVal})`;
    form.innerHTML = '';

    table.columns.forEach(col => {
        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';

        const label = document.createElement('label');
        label.textContent = col.isPk ? `${col.name} (PRIMARY KEY - Read Only)` : col.name;

        let input;
        if (col.name === 'DEPARTMENT') {
            input = document.createElement('select');
            input.className = 'select-control';
            input.style.width = '100%';
            input.style.height = '42px';
            input.innerHTML = `
                <option value="Technical Support">Technical Support</option>
                <option value="Billing & Accounts">Billing & Accounts</option>
                <option value="Sales & Inquiries">Sales & Inquiries</option>
                <option value="Complaints">Complaints</option>
                <option value="General Helpdesk">General Helpdesk</option>
            `;
            input.value = row[col.name] || 'Technical Support';
        } else if (col.name === 'CALL_STATUS' || col.name === 'STATUS') {
            input = document.createElement('select');
            input.className = 'select-control';
            input.style.width = '100%';
            input.style.height = '42px';
            input.innerHTML = activeTable === 'CALL_RECORDS' ? `
                <option value="Resolved">Resolved</option>
                <option value="In Progress">In Progress</option>
                <option value="Escalated">Escalated</option>
                <option value="Pending Customer">Pending Customer</option>
                <option value="Dropped">Dropped</option>
            ` : `
                <option value="Active">Active</option>
                <option value="On Call">On Call</option>
                <option value="Break">Break</option>
                <option value="Offline">Offline</option>
            `;
            input.value = row[col.name] || 'Resolved';
        } else if (col.name === 'RATING') {
            input = document.createElement('select');
            input.className = 'select-control';
            input.style.width = '100%';
            input.style.height = '42px';
            input.innerHTML = `
                <option value="5">5 - Excellent ★★★★★</option>
                <option value="4">4 - Good ★★★★☆</option>
                <option value="3">3 - Satisfactory ★★★☆☆</option>
                <option value="2">2 - Needs Improvement ★★☆☆☆</option>
                <option value="1">1 - Poor ★☆☆☆☆</option>
            `;
            input.value = row[col.name] !== undefined ? String(row[col.name]) : '5';
        } else {
            input = document.createElement('input');
            input.className = 'input-control';
            input.style.paddingLeft = '14px';
            input.type = col.type.startsWith('NUM') ? 'number' : 'text';
            input.value = row[col.name] !== undefined && row[col.name] !== null ? row[col.name] : '';
            if (col.isPk) {
                input.readOnly = true;
                input.style.opacity = '0.6';
            }
        }

        input.id = `update_${col.name}`;
        formGroup.appendChild(label);
        formGroup.appendChild(input);
        form.appendChild(formGroup);
    });

    openModal('modalUpdate');
}

function submitUpdateRecord() {
    try {
        const table = window.db.getTable(activeTable);
        const pkCol = table.columns.find(c => c.isPk) || table.columns[0];
        const updates = {};

        table.columns.forEach(col => {
            if (!col.isPk) {
                const el = document.getElementById(`update_${col.name}`);
                if (el) {
                    let val = el.value.trim();
                    if (col.type.startsWith('NUM') && val !== '') val = Number(val);
                    updates[col.name] = val;
                }
            }
        });

        const res = window.db.updateRows(activeTable, updates, (r) => r[pkCol.name] == editingRowPk);

        closeModal('modalUpdate');
        refreshActiveTable();
        updateMetrics();
        updateTransactionUi();

        showToast('UPDATE Executed', res.message, 'success', '00000');
        updateCodeInspector(window.JdbcSimulator.generateJdbcUpdate(activeTable, updates, `${pkCol.name} = ${editingRowPk}`));

    } catch (e) {
        showToast('Update Error', e.message, 'error', e.sqlState || '42000');
    }
}

/* ==========================================================================
   DML OPERATIONS: DELETE RECORD (Slide 24)
   ========================================================================== */

function handleDeleteRecord(pkVal) {
    const table = window.db.getTable(activeTable);
    const pkCol = table.columns.find(c => c.isPk) || table.columns[0];

    if (!confirm(`Are you sure you want to execute DELETE FROM ${activeTable} WHERE ${pkCol.name} = ${pkVal}?`)) {
        return;
    }

    try {
        const res = window.db.deleteRows(activeTable, (r) => r[pkCol.name] == pkVal);

        renderTableTabs();
        refreshActiveTable();
        updateMetrics();
        updateTransactionUi();

        showToast('DELETE Executed', res.message, 'info', '00000');
        updateCodeInspector(window.JdbcSimulator.generateJdbcDelete(activeTable, `${pkCol.name} = ${pkVal}`));

    } catch (e) {
        showToast('Delete Error', e.message, 'error', e.sqlState || '42000');
    }
}

/* ==========================================================================
   DDL OPERATIONS: CREATE, ALTER, DROP, TRUNCATE (Slides 31, 34, 48)
   ========================================================================== */

function openCreateTableModal() {
    document.getElementById('newTableName').value = '';
    const container = document.getElementById('createTableColumnsList');
    container.innerHTML = '';

    // Add 3 default columns template
    addCreateColumnRow('ID', 'NUMBER', true);
    addCreateColumnRow('NAME', 'VARCHAR2(50)', false);
    addCreateColumnRow('STATUS', 'VARCHAR2(20)', false);

    openModal('modalCreateTable');
}

function addCreateColumnRow(name = '', type = 'VARCHAR2(50)', isPk = false) {
    const container = document.getElementById('createTableColumnsList');
    const row = document.createElement('div');
    row.className = 'column-def-row';
    row.style.display = 'grid';
    row.style.gridTemplateColumns = '2fr 2fr 1fr auto';
    row.style.gap = '8px';
    row.style.alignItems = 'center';

    row.innerHTML = `
        <input type="text" class="input-control" placeholder="Column Name" value="${name}" style="padding-left: 10px;">
        <select class="select-control" style="height: 38px;">
            <option value="NUMBER" ${type === 'NUMBER' ? 'selected' : ''}>NUMBER</option>
            <option value="VARCHAR2(50)" ${type === 'VARCHAR2(50)' ? 'selected' : ''}>VARCHAR2(50)</option>
            <option value="VARCHAR2(100)" ${type === 'VARCHAR2(100)' ? 'selected' : ''}>VARCHAR2(100)</option>
            <option value="DATE" ${type === 'DATE' ? 'selected' : ''}>DATE</option>
        </select>
        <label style="display: flex; align-items: center; gap: 4px; font-size: 11px; color: var(--text-secondary); cursor: pointer;">
            <input type="checkbox" ${isPk ? 'checked' : ''}> PK
        </label>
        <button type="button" class="btn-icon-danger" style="font-size: 14px;" onclick="this.parentElement.remove()">✕</button>
    `;

    container.appendChild(row);
}

function submitCreateTable() {
    const tableName = document.getElementById('newTableName').value.trim();
    if (!tableName) {
        showToast('DDL Error', 'Please specify a table name.', 'error');
        return;
    }

    const rows = document.querySelectorAll('#createTableColumnsList .column-def-row');
    const colDefs = [];

    rows.forEach(r => {
        const colName = r.querySelector('input[type="text"]').value.trim();
        const colType = r.querySelector('select').value;
        const isPk = r.querySelector('input[type="checkbox"]').checked;

        if (colName) {
            colDefs.push({ name: colName, type: colType, isPk });
        }
    });

    if (colDefs.length === 0) {
        showToast('DDL Error', 'Define at least one column for the table.', 'error');
        return;
    }

    try {
        const res = window.db.createTable(tableName, colDefs);
        closeModal('modalCreateTable');
        activeTable = res.tableName;
        renderTableTabs();
        populateSortColumnOptions();
        refreshActiveTable();
        showToast('Table Created (DDL)', res.message, 'success', '00000');
        updateCodeInspector(`// DDL Statement Executed via JDBC Statement.execute():\n${res.sql}`);
    } catch (e) {
        showToast('DDL Error', e.message, 'error', e.sqlState || '42000');
    }
}

function openAlterTableModal() {
    const targetSelect = document.getElementById('alterTargetTable');
    targetSelect.innerHTML = '';
    window.db.getTableNames().forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t;
        if (t === activeTable) opt.selected = true;
        targetSelect.appendChild(opt);
    });

    targetSelect.onchange = () => updateAlterDropColumnOptions();
    updateAlterDropColumnOptions();
    toggleAlterFields('ADD');
    openModal('modalAlterTable');
}

function toggleAlterFields(type) {
    if (type === 'ADD') {
        document.getElementById('alterAddFields').style.display = 'block';
        document.getElementById('alterDropFields').style.display = 'none';
    } else {
        document.getElementById('alterAddFields').style.display = 'none';
        document.getElementById('alterDropFields').style.display = 'block';
        updateAlterDropColumnOptions();
    }
}

function updateAlterDropColumnOptions() {
    const targetTable = document.getElementById('alterTargetTable').value;
    const dropSelect = document.getElementById('alterDropColSelect');
    dropSelect.innerHTML = '';

    try {
        const table = window.db.getTable(targetTable);
        table.columns.forEach(col => {
            if (!col.isPk) {
                const opt = document.createElement('option');
                opt.value = col.name;
                opt.textContent = `${col.name} (${col.type})`;
                dropSelect.appendChild(opt);
            }
        });
    } catch (e) {
        console.warn(e);
    }
}

function submitAlterTable() {
    const targetTable = document.getElementById('alterTargetTable').value;
    const action = document.getElementById('alterActionType').value;

    try {
        let res;
        if (action === 'ADD') {
            const colName = document.getElementById('alterColName').value.trim();
            const colType = document.getElementById('alterColType').value;
            if (!colName) {
                showToast('Error', 'Column name required', 'error');
                return;
            }
            res = window.db.alterTableAddColumn(targetTable, { name: colName, type: colType });
        } else {
            const colToDrop = document.getElementById('alterDropColSelect').value;
            if (!colToDrop) {
                showToast('Error', 'No non-PK column selected to drop', 'error');
                return;
            }
            res = window.db.alterTableDropColumn(targetTable, colToDrop);
        }

        closeModal('modalAlterTable');
        refreshActiveTable();
        showToast('ALTER TABLE Executed', res.message, 'success', '00000');
        updateCodeInspector(`// DDL ALTER TABLE Statement Executed via JDBC:\n${res.sql}`);

    } catch (e) {
        showToast('DDL Alter Error', e.message, 'error', e.sqlState || '42000');
    }
}

function handleTruncateCurrentTable() {
    if (confirm(`TRUNCATE TABLE ${activeTable}?\nThis will remove all rows permanently from ${activeTable} while keeping table structure.`)) {
        try {
            const res = window.db.truncateTable(activeTable);
            renderTableTabs();
            refreshActiveTable();
            updateMetrics();
            showToast('Table Truncated (DDL)', res.message, 'info', '00000');
            updateCodeInspector(`// DDL Statement Executed:\nTRUNCATE TABLE ${activeTable};`);
        } catch (e) {
            showToast('Truncate Error', e.message, 'error', e.sqlState || '42000');
        }
    }
}

function handleDropCurrentTable() {
    if (activeTable === 'CALL_RECORDS') {
        alert('Cannot drop primary CALL_RECORDS table in laboratory mode.');
        return;
    }
    if (confirm(`DROP TABLE ${activeTable}?\nThis will destroy the table definition and all rows.`)) {
        try {
            const res = window.db.dropTable(activeTable);
            activeTable = 'CALL_RECORDS';
            renderTableTabs();
            refreshActiveTable();
            updateMetrics();
            showToast('Table Dropped (DDL)', res.message, 'info', '00000');
            updateCodeInspector(`// DDL Statement Executed:\n${res.sql}`);
        } catch (e) {
            showToast('Drop Error', e.message, 'error', e.sqlState || '42000');
        }
    }
}

/* ==========================================================================
   SQL QUERY TERMINAL & PRESETS
   ========================================================================== */

function loadSqlPreset(presetKey) {
    const input = document.getElementById('sqlTerminalInput');
    switch (presetKey) {
        case 'dql_tech':
            input.value = "SELECT * FROM call_records WHERE department = 'Technical Support' AND rating >= 4;";
            break;
        case 'dql_group':
            input.value = "SELECT * FROM call_records WHERE call_status = 'Resolved' ORDER BY duration_secs DESC;";
            break;
        case 'dml_update':
            input.value = "UPDATE call_records SET call_status = 'Resolved', notes = 'Customer confirmed resolved via SMS' WHERE call_id = 1003;";
            break;
        case 'ddl_create':
            input.value = "CREATE TABLE agent_shifts (shift_id SERIAL PRIMARY KEY, agent_id INT, shift_name VARCHAR(50), start_time VARCHAR(20));";
            break;
        case 'ddl_alter':
            input.value = "ALTER TABLE call_records ADD recording_url VARCHAR(255);";
            break;
    }
}

async function handleExecuteTerminalSql() {
    const input = document.getElementById('sqlTerminalInput');
    const resultBox = document.getElementById('terminalResultBox');
    const sql = (input.value || '').trim();

    if (!sql) {
        showToast('Terminal Warning', 'Please type a SQL statement to execute.', 'info');
        return;
    }

    resultBox.style.display = 'block';
    resultBox.className = 'terminal-result-box';
    resultBox.innerHTML = '<span style="color: var(--accent-cyan);">⏳ Executing statement via PostgreSQL JDBC Driver...</span>';

    // 1. Attempt Native JDBC REST API execution (POST /api/sql/execute)
    try {
        const response = await fetch('/api/sql/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sql })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            resultBox.className = 'terminal-result-box success';
            if (data.operationType === 'DQL') {
                resultBox.innerHTML = `
                    ✓ <strong>PostgreSQL Query executed:</strong> Retrieved ${data.rowCount} row(s) via <code>ResultSetMetaData</code> (${data.executionDurationMs}ms).<br>
                    <span style="color: var(--text-muted); font-size: 11px;">Columns: ${data.columns.join(', ')}</span>
                `;
                currentDisplayedRows = data.rows;
                const table = window.db.getTable(activeTable);
                renderTableBody(table, data.rows);
                document.getElementById('displayingRowCount').textContent = data.rowCount;
            } else {
                resultBox.innerHTML = `
                    ✓ <strong>PostgreSQL Statement executed:</strong> ${data.message} (${data.executionDurationMs}ms)<br>
                    <span style="color: var(--text-muted); font-size: 11px;">${sql}</span>
                `;
                renderTableTabs();
                refreshActiveTable();
                updateMetrics();
                updateTransactionUi();
            }
            showToast('PostgreSQL JDBC Success', data.message, 'success', '00000');
            updateCodeInspector(`// Statement Executed via PostgreSQL JDBC Statement:\n// String sql = "${sql}";\n// stmt.execute(sql);\n\n${sql}`);
            return;
        } else if (!data.success) {
            throw new Error(data.message || 'SQL Execution Failed');
        }
    } catch (apiErr) {
        console.warn('REST API unavailable or returned error, executing via In-Memory JDBC Engine:', apiErr);
    }

    // 2. Client-side In-Memory JDBC Engine Fallback
    try {
        const res = window.db.executeSql(sql);
        resultBox.style.display = 'block';
        resultBox.className = 'terminal-result-box success';

        if (res.resultSet) {
            resultBox.innerHTML = `
                ✓ <strong>Query executed successfully:</strong> Fetched ${res.rowCount} row(s) in ${res.duration}ms.<br>
                <span style="color: var(--text-muted); font-size: 11px;">${sql}</span>
            `;
            currentDisplayedRows = res.rows;
            const table = window.db.getTable(activeTable);
            renderTableBody(table, res.rows);
            document.getElementById('displayingRowCount').textContent = res.rows.length;
        } else {
            resultBox.innerHTML = `
                ✓ <strong>Statement executed:</strong> ${res.message || 'Operation succeeded.'} (Duration: ${res.duration || 3}ms)<br>
                <span style="color: var(--text-muted); font-size: 11px;">${sql}</span>
            `;
            renderTableTabs();
            refreshActiveTable();
            updateMetrics();
            updateTransactionUi();
        }

        showToast('SQL Executed', res.message || 'Statement processed successfully.', 'success', '00000');
        updateCodeInspector(`// Statement Executed via PostgreSQL JDBC Statement:\n// String sql = "${sql}";\n// stmt.execute(sql);\n\n${sql}`);

    } catch (e) {
        resultBox.style.display = 'block';
        resultBox.className = 'terminal-result-box error';
        resultBox.innerHTML = `
            ✕ <strong>SQLException Thrown (PostgreSQL):</strong><br>
            Message: ${e.message}<br>
            SQLState: ${e.sqlState || '42000'} | ErrorCode: ${e.errorCode || 900}
        `;
        showToast('SQLException', e.message, 'error', e.sqlState || '42000');
    }
}

/* ==========================================================================
   JDBC / ODBC LIVE CODE INSPECTOR & CURSOR STEPPER (Slides 18-28)
   ========================================================================== */

function switchCodeView(view) {
    currentCodeView = view;
    document.querySelectorAll('.code-tab-btn').forEach(b => b.classList.remove('active'));

    if (view === 'JDBC') document.getElementById('tabCodeJdbc').classList.add('active');
    else if (view === 'ODBC') document.getElementById('tabCodeOdbc').classList.add('active');
    else if (view === 'META') document.getElementById('tabCodeMeta').classList.add('active');

    updateCodeInspector();
}

function updateCodeInspector(customCode = null) {
    const codeArea = document.getElementById('codeDisplayArea');
    if (!codeArea) return;

    if (customCode && currentCodeView === 'JDBC') {
        codeArea.textContent = customCode;
        return;
    }

    if (currentCodeView === 'JDBC') {
        codeArea.textContent = window.JdbcSimulator.generateJdbcSelect(activeTable);
    } else if (currentCodeView === 'ODBC') {
        codeArea.textContent = window.JdbcSimulator.generateOdbcCode(`SELECT * FROM ${activeTable}`);
    } else if (currentCodeView === 'META') {
        try {
            const table = window.db.getTable(activeTable);
            const meta = new ResultSetMetaData(table);
            const colsInfo = meta.getAllColumnInfo();

            let metaStr = `// ResultSetMetaData for table: ${activeTable} (Slide 17)\n`;
            metaStr += `int columnCount = metaData.getColumnCount(); // Returns: ${colsInfo.length}\n\n`;
            colsInfo.forEach(c => {
                metaStr += `Column #${c.index}: ${c.name.padEnd(18)} Type: ${c.type.padEnd(14)} PK: ${String(c.isPk).padEnd(6)} Nullable: ${c.isNullable}\n`;
            });
            codeArea.textContent = metaStr;
        } catch (e) {
            codeArea.textContent = '// MetaData unavailable for current selection.';
        }
    }
}

function handleStepResultSetNext() {
    if (currentDisplayedRows.length === 0) {
        document.getElementById('stepperStatusText').textContent = 'Cursor: EMPTY_RESULTSET';
        document.getElementById('stepperOutputLine').textContent = 'No rows to step through in current table view.';
        return;
    }

    if (currentStepperCursor < currentDisplayedRows.length - 1) {
        currentStepperCursor++;
        const row = currentDisplayedRows[currentStepperCursor];

        // Highlight active row in table
        document.querySelectorAll('#tableBody tr').forEach(tr => tr.classList.remove('active-stepper-row'));
        const activeTr = document.getElementById(`row-${currentStepperCursor}`);
        if (activeTr) {
            activeTr.classList.add('active-stepper-row');
            activeTr.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        document.getElementById('stepperStatusText').textContent = `Cursor: ROW #${currentStepperCursor + 1} of ${currentDisplayedRows.length}`;

        // Print column values like JDBC slide 20
        const keys = Object.keys(row).slice(0, 4);
        const snippet = keys.map(k => `rs.getString("${k}") = "${row[k]}"`).join(', ');
        document.getElementById('stepperOutputLine').textContent = `rs.next() => TRUE | ${snippet}`;
    } else {
        document.getElementById('stepperStatusText').textContent = 'Cursor: AFTER_LAST_ROW';
        document.getElementById('stepperOutputLine').textContent = 'rs.next() => FALSE (End of ResultSet reached. Cursor closed.)';
        document.querySelectorAll('#tableBody tr').forEach(tr => tr.classList.remove('active-stepper-row'));
    }
}

function handleResetResultSetCursor() {
    currentStepperCursor = -1;
    document.querySelectorAll('#tableBody tr').forEach(tr => tr.classList.remove('active-stepper-row'));
    const status = document.getElementById('stepperStatusText');
    const out = document.getElementById('stepperOutputLine');
    if (status) status.textContent = 'Cursor: BEFORE_FIRST';
    if (out) out.textContent = 'Call rs.next() to step through rows like JDBC while(rs.next())';
}

/* ==========================================================================
   EXPORT CSV
   ========================================================================== */

function exportCurrentTableCsv() {
    const table = window.db.getTable(activeTable);
    if (!table || table.rows.length === 0) {
        showToast('Export', 'No data to export.', 'info');
        return;
    }

    const colHeaders = table.columns.map(c => c.name);
    let csv = colHeaders.join(',') + '\n';

    table.rows.forEach(r => {
        const rowValues = colHeaders.map(col => {
            let val = r[col] !== null && r[col] !== undefined ? String(r[col]) : '';
            if (val.includes(',') || val.includes('"')) {
                val = `"${val.replace(/"/g, '""')}"`;
            }
            return val;
        });
        csv += rowValues.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTable}_EXPORT.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Export Completed', `Downloaded ${activeTable}_EXPORT.csv`, 'success', '00000');
}

/* ==========================================================================
   MODAL UTILITIES & TOAST SYSTEM
   ========================================================================== */

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('open');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('open');
}

function showToast(title, message, type = 'info', sqlState = null) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✓';
    else if (type === 'error') icon = '✕';

    toast.innerHTML = `
        <div style="font-size: 16px; font-weight: bold;">${icon}</div>
        <div class="toast-content">
            <h4>${title}</h4>
            <p>${message}</p>
            ${sqlState ? `<span class="sql-state-badge">SQLState: ${sqlState}</span>` : ''}
        </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(40px)';
        setTimeout(() => toast.remove(), 300);
    }, 4500);
}

/* ==========================================================================
   VIEW NAVIGATION & SWITCHING
   ========================================================================== */

let activeDdlKey = 'customers';
let activeDmlKey = 'customers';

function switchMainView(viewId) {
    // Update nav buttons
    document.querySelectorAll('.nav-view-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`btnNav${viewId.charAt(0).toUpperCase() + viewId.slice(1)}`);
    if (activeBtn) activeBtn.classList.add('active');

    // Update view sections
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
    const targetSection = document.getElementById(`view-${viewId}`);
    if (targetSection) targetSection.classList.add('active');

    // Section specific updates
    if (viewId === 'records') {
        refreshActiveTable();
    } else if (viewId === 'ddl') {
        loadDdlDetail(activeDdlKey);
        refreshDdlWorkbenchActiveTables();
    } else if (viewId === 'dml') {
        loadDmlDetail(activeDmlKey);
        const tbl = document.getElementById('dmlWorkbenchTableSelect').value || 'CALL_RECORDS';
        handleDmlTableChange(tbl);
    }
}

function copySnippet(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const text = el.innerText || el.textContent;
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copied to Clipboard', 'Commands copied for execution.', 'success');
    }).catch(() => {
        showToast('Clipboard Error', 'Could not copy commands.', 'error');
    });
}

/* ==========================================================================
   DDL (DATA DEFINITION LANGUAGE) CATALOG & DETAIL VIEWER
   ========================================================================== */

const DDL_CATALOG = {
    customers: {
        title: "CREATE TABLE customers",
        badge: "CREATE",
        icon: "👥",
        sql: `-- 1. CUSTOMERS TABLE (Subscribers Directory)
CREATE TABLE customers (
    cust_id         SERIAL PRIMARY KEY,
    name            VARCHAR(60) NOT NULL,
    phone           VARCHAR(20) NOT NULL UNIQUE,
    tier            VARCHAR(20) NOT NULL DEFAULT 'Standard',
    city            VARCHAR(40) NOT NULL,
    total_calls     INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);`,
        meta: [
            { label: "Entity Purpose", value: "Customer / Subscriber Master Directory" },
            { label: "Primary Key", value: "cust_id (SERIAL auto-incrementing integer)" },
            { label: "Unique Constraint", value: "phone (VARCHAR(20) UNIQUE)" },
            { label: "Default Clauses", value: "tier='Standard', total_calls=0, created_at=CURRENT_TIMESTAMP" }
        ]
    },
    agents: {
        title: "CREATE TABLE agents",
        badge: "CREATE",
        icon: "🎧",
        sql: `-- 2. AGENTS TABLE (Call Center Support Staff)
CREATE TABLE agents (
    agent_id        SERIAL PRIMARY KEY,
    agent_name      VARCHAR(60) NOT NULL,
    email           VARCHAR(60) NOT NULL UNIQUE,
    department      VARCHAR(40) NOT NULL,
    extension       INT NOT NULL UNIQUE,
    shift           VARCHAR(30) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'Active',
    csat_avg        NUMERIC(3, 2) NOT NULL DEFAULT 4.00,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);`,
        meta: [
            { label: "Entity Purpose", value: "Staff roster, shifts, and performance metrics" },
            { label: "Primary Key", value: "agent_id (SERIAL auto-increment)" },
            { label: "Unique Constraints", value: "email (UNIQUE), extension (UNIQUE internal line)" },
            { label: "Numeric Precision", value: "csat_avg NUMERIC(3, 2) default 4.00" }
        ]
    },
    call_records: {
        title: "CREATE TABLE call_records",
        badge: "CREATE + FK",
        icon: "📞",
        sql: `-- 3. CALL_RECORDS TABLE (Primary Transactional Table)
CREATE TABLE call_records (
    call_id         SERIAL PRIMARY KEY,
    customer_name   VARCHAR(60) NOT NULL,
    phone_number    VARCHAR(20) NOT NULL,
    agent_id        INT NOT NULL,
    agent_name      VARCHAR(60) NOT NULL,
    department      VARCHAR(40) NOT NULL,
    call_type       VARCHAR(25) NOT NULL,
    call_status     VARCHAR(25) NOT NULL,
    duration_secs   INT NOT NULL,
    rating          INT CHECK (rating >= 1 AND rating <= 5),
    call_date       VARCHAR(30) NOT NULL,
    issue_category  VARCHAR(50) NOT NULL,
    notes           TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_call_agent FOREIGN KEY (agent_id) 
        REFERENCES agents (agent_id) ON DELETE RESTRICT
);`,
        meta: [
            { label: "Entity Purpose", value: "Inbound/Outbound call event transactional logs" },
            { label: "Foreign Key", value: "agent_id -> agents(agent_id) [ON DELETE RESTRICT]" },
            { label: "Check Constraint", value: "rating CHECK (rating >= 1 AND rating <= 5)" },
            { label: "Storage Datatypes", value: "notes TEXT, duration_secs INT, created_at TIMESTAMP" }
        ]
    },
    incidents: {
        title: "CREATE TABLE incidents",
        badge: "CREATE + CASCADE",
        icon: "🚨",
        sql: `-- 4. INCIDENTS TABLE (Escalations & SLA Tickets)
CREATE TABLE incidents (
    ticket_id       SERIAL PRIMARY KEY,
    call_id         INT NOT NULL,
    issue_type      VARCHAR(50) NOT NULL,
    priority        VARCHAR(20) NOT NULL CHECK (priority IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
    assigned_team   VARCHAR(40) NOT NULL,
    sla_hours       INT NOT NULL DEFAULT 24,
    status          VARCHAR(25) NOT NULL DEFAULT 'OPEN',
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_incident_call FOREIGN KEY (call_id) 
        REFERENCES call_records (call_id) ON DELETE CASCADE
);`,
        meta: [
            { label: "Entity Purpose", value: "Customer trouble tickets and NOC escalations" },
            { label: "Cascade Rule", value: "call_id -> call_records(call_id) [ON DELETE CASCADE]" },
            { label: "Check Constraint", value: "priority IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')" },
            { label: "Default SLA", value: "sla_hours INT DEFAULT 24, status='OPEN'" }
        ]
    },
    indexes: {
        title: "CREATE INDEX Performance Indexes",
        badge: "INDEX",
        icon: "⚡",
        sql: `-- 5. POSTGRESQL PERFORMANCE INDEXES (B-Tree)
CREATE INDEX idx_calls_dept ON call_records(department);
CREATE INDEX idx_calls_status ON call_records(call_status);
CREATE INDEX idx_calls_agent ON call_records(agent_id);
CREATE INDEX idx_incidents_priority ON incidents(priority);`,
        meta: [
            { label: "Index Type", value: "PostgreSQL B-Tree Indexes" },
            { label: "Query Acceleration", value: "Accelerates WHERE department = '...' queries (O(log n))" },
            { label: "Foreign Key Speed", value: "Indexes agent_id to optimize JOIN lookups" },
            { label: "Priority Filter", value: "Enables instant retrieval of CRITICAL tickets" }
        ]
    },
    alter_drop: {
        title: "ALTER TABLE & DROP TABLE Specifications",
        badge: "ALTER/DROP",
        icon: "⚙",
        sql: `-- 6. SCHEMA ALTERATION & TEARDOWN STATEMENTS
-- Add audio recording URL column to call_records
ALTER TABLE call_records ADD COLUMN recording_url VARCHAR(255);

-- Drop column if no longer needed
ALTER TABLE call_records DROP COLUMN recording_url;

-- Drop tables in reverse order of foreign key dependencies
DROP TABLE IF EXISTS incidents CASCADE;
DROP TABLE IF EXISTS call_records CASCADE;
DROP TABLE IF EXISTS agents CASCADE;
DROP TABLE IF EXISTS customers CASCADE;`,
        meta: [
            { label: "DDL Actions", value: "ALTER TABLE ADD COLUMN / DROP COLUMN / DROP TABLE" },
            { label: "Referential Handling", value: "CASCADE drops dependent foreign keys safely" },
            { label: "Safety Clause", value: "IF EXISTS prevents errors when table is absent" },
            { label: "Catalog Update", value: "Synchronously updates information_schema.tables" }
        ]
    }
};

function initDdlAndDmlSections() {
    loadDdlDetail('customers');
    loadDmlDetail('customers');
    refreshDdlWorkbenchActiveTables();
    handleDmlTableChange('CALL_RECORDS');
}

function loadDdlDetail(key) {
    activeDdlKey = key;
    const item = DDL_CATALOG[key];
    if (!item) return;

    // Sidebar active state
    document.querySelectorAll('.command-sidebar .command-item-card').forEach(c => {
        if (c.id && c.id.startsWith('ddlItem-')) c.classList.remove('active');
    });
    const activeCard = document.getElementById(`ddlItem-${key}`);
    if (activeCard) activeCard.classList.add('active');

    // Header info
    document.getElementById('ddlViewerIcon').textContent = item.icon;
    document.getElementById('ddlViewerTitle').textContent = item.title;

    // Syntax-highlighted SQL
    document.getElementById('ddlSqlCodeDisplay').innerHTML = formatSqlHighlight(item.sql);

    // Meta grid
    const metaContainer = document.getElementById('ddlMetaGrid');
    metaContainer.innerHTML = '';
    item.meta.forEach(m => {
        const div = document.createElement('div');
        div.className = 'meta-item';
        div.innerHTML = `<label>${m.label}</label><span>${m.value}</span>`;
        metaContainer.appendChild(div);
    });
}

function copyCurrentDdlSql() {
    const item = DDL_CATALOG[activeDdlKey];
    if (!item) return;
    navigator.clipboard.writeText(item.sql).then(() => {
        showToast('DDL SQL Copied', `Copied definition for ${item.title}.`, 'success');
    });
}

function runCurrentDdlInTerminal() {
    const item = DDL_CATALOG[activeDdlKey];
    if (!item) return;
    switchMainView('terminal');
    const input = document.getElementById('sqlTerminalInput');
    if (input) {
        input.value = item.sql;
        input.focus();
    }
    showToast('Sent to Terminal', 'DDL statement loaded into SQL terminal.', 'info');
}

function handleDdlWorkbenchActionChange(action) {
    const createFields = document.getElementById('ddlCreateFields');
    const alterFields = document.getElementById('ddlAlterFields');
    const alterTypeGroup = document.getElementById('ddlAlterTypeGroup');

    if (action === 'CREATE') {
        createFields.style.display = 'block';
        alterFields.style.display = 'none';
    } else if (action === 'ALTER_ADD') {
        createFields.style.display = 'none';
        alterFields.style.display = 'block';
        alterTypeGroup.style.display = 'block';
    } else if (action === 'ALTER_DROP') {
        createFields.style.display = 'none';
        alterFields.style.display = 'block';
        alterTypeGroup.style.display = 'none';
    } else {
        // TRUNCATE or DROP
        createFields.style.display = 'none';
        alterFields.style.display = 'none';
    }
}

function executeDdlWorkbench() {
    const action = document.getElementById('ddlWorkbenchAction').value;
    const tableName = (document.getElementById('ddlWorkbenchTableName').value || '').trim();

    if (!tableName) {
        showToast('DDL Error', 'Please specify a target table name.', 'error');
        return;
    }

    const startTime = performance.now();
    try {
        let executedSql = '';
        let message = '';

        if (action === 'CREATE') {
            const colsInput = document.getElementById('ddlWorkbenchCols').value.trim();
            const colParts = colsInput.split(',').map(s => s.trim()).filter(Boolean);
            const columns = colParts.map(colDef => {
                const parts = colDef.split(/\s+/);
                const name = parts[0];
                const type = parts[1] || 'VARCHAR(50)';
                const isPk = colDef.toUpperCase().includes('PRIMARY KEY');
                return { name, type, isPk };
            });

            const res = window.db.createTable(tableName, columns);
            executedSql = res.sql;
            message = res.message;
        } else if (action === 'ALTER_ADD') {
            const colName = document.getElementById('ddlWorkbenchColName').value.trim();
            const colType = document.getElementById('ddlWorkbenchColType').value;
            if (!colName) throw new Error('Column name is required for ALTER TABLE ADD.');
            const res = window.db.alterTableAddColumn(tableName, colName, colType);
            executedSql = res.sql;
            message = res.message;
        } else if (action === 'ALTER_DROP') {
            const colName = document.getElementById('ddlWorkbenchColName').value.trim();
            if (!colName) throw new Error('Column name is required for ALTER TABLE DROP.');
            const res = window.db.alterTableDropColumn(tableName, colName);
            executedSql = res.sql;
            message = res.message;
        } else if (action === 'TRUNCATE') {
            const res = window.db.truncateTable(tableName);
            executedSql = res.sql;
            message = res.message;
        } else if (action === 'DROP') {
            const res = window.db.dropTable(tableName);
            executedSql = res.sql;
            message = res.message;
        }

        const duration = (performance.now() - startTime).toFixed(1);
        document.getElementById('ddlWorkbenchLatency').textContent = `${duration} ms`;
        const statusBox = document.getElementById('ddlWorkbenchStatus');
        statusBox.className = 'output-status-strip success';
        statusBox.textContent = `✓ ${message}`;

        document.getElementById('ddlWorkbenchOutputSql').textContent = executedSql;

        renderTableTabs();
        refreshActiveTable();
        refreshDdlWorkbenchActiveTables();
        updateMetrics();
        showToast('DDL Executed', message, 'success');
    } catch (err) {
        const duration = (performance.now() - startTime).toFixed(1);
        document.getElementById('ddlWorkbenchLatency').textContent = `${duration} ms`;
        const statusBox = document.getElementById('ddlWorkbenchStatus');
        statusBox.className = 'output-status-strip error';
        statusBox.textContent = `✕ ${err.message}`;
        showToast('DDL Execution Error', err.message, 'error');
    }
}

function refreshDdlWorkbenchActiveTables() {
    const container = document.getElementById('ddlWorkbenchActiveTables');
    if (!container) return;
    container.innerHTML = '';
    const names = window.db.getTableNames();
    names.forEach(name => {
        const span = document.createElement('span');
        span.className = 'banner-pill accent';
        span.style.padding = '3px 8px';
        span.style.fontSize = '10px';
        span.textContent = `${name} (${window.db.tables[name].rows.length})`;
        container.appendChild(span);
    });
}

/* ==========================================================================
   DML (DATA MANIPULATION LANGUAGE) CATALOG & DETAIL VIEWER
   ========================================================================== */

const DML_CATALOG = {
    customers: {
        title: "INSERT INTO customers (7 Seed Records)",
        badge: "INSERT",
        icon: "👥",
        sql: `-- 1. INSERT CUSTOMERS (Subscriber Seed Dataset)
INSERT INTO customers (cust_id, name, phone, tier, city, total_calls) VALUES
(501, 'Aditya Sharma', '+91 98765 43210', 'Platinum VIP', 'Chennai', 4),
(502, 'Meera Nambiar', '+91 98112 34567', 'Gold', 'Bengaluru', 2),
(503, 'Rajesh Subramanian', '+91 99400 88219', 'Gold', 'Chennai', 7),
(504, 'Deepak Chawla', '+91 98200 11984', 'Platinum VIP', 'Mumbai', 3),
(505, 'Kavita Menon', '+91 94440 23156', 'Silver', 'Hyderabad', 1),
(506, 'Suresh Kumar', '+91 97890 65432', 'Standard', 'Coimbatore', 2),
(507, 'Sneha Patel', '+91 96543 21098', 'Gold', 'Ahmedabad', 3);`,
        meta: [
            { label: "Rows Seeded", value: "7 Records Inserted" },
            { label: "Target Table", value: "CUSTOMERS" },
            { label: "Subscribers", value: "Platinum VIP (2), Gold (3), Silver (1), Standard (1)" },
            { label: "Geographies", value: "Chennai, Bengaluru, Mumbai, Hyderabad, Ahmedabad" }
        ]
    },
    agents: {
        title: "INSERT INTO agents (5 Support Agents)",
        badge: "INSERT",
        icon: "🎧",
        sql: `-- 2. INSERT AGENTS (Staff Directory)
INSERT INTO agents (agent_id, agent_name, email, department, extension, shift, status, csat_avg) VALUES
(1, 'Priya Raman', 'priya.raman@nexuscall.com', 'Technical Support', 401, 'Morning (08:00 - 16:00)', 'Active', 4.90),
(2, 'Rahul Verma', 'rahul.verma@nexuscall.com', 'Billing & Accounts', 402, 'Morning (08:00 - 16:00)', 'Active', 4.60),
(3, 'Ananya Sen', 'ananya.sen@nexuscall.com', 'Complaints', 403, 'General (10:00 - 18:00)', 'On Call', 4.10),
(4, 'Arjun Das', 'arjun.das@nexuscall.com', 'Sales & Inquiries', 404, 'Evening (14:00 - 22:00)', 'Active', 4.80),
(5, 'Kavita Nair', 'kavita.nair@nexuscall.com', 'General Helpdesk', 405, 'Evening (14:00 - 22:00)', 'Break', 4.40);`,
        meta: [
            { label: "Rows Seeded", value: "5 Support Representatives" },
            { label: "Departments", value: "Tech Support, Billing, Complaints, Sales, Helpdesk" },
            { label: "Shifts Covered", value: "Morning, General, Evening shifts" },
            { label: "Performance", value: "Mean CSAT 4.56 / 5.00 rating" }
        ]
    },
    call_records: {
        title: "INSERT INTO call_records (15 Transactional Calls)",
        badge: "INSERT",
        icon: "📞",
        sql: `-- 3. INSERT CALL_RECORDS (Primary Call Transaction Logs)
INSERT INTO call_records (call_id, customer_name, phone_number, agent_id, agent_name, department, call_type, call_status, duration_secs, rating, call_date, issue_category, notes) VALUES
(1001, 'Aditya Sharma', '+91 98765 43210', 1, 'Priya Raman', 'Technical Support', 'Inbound', 'Resolved', 340, 5, '2026-10-12 09:15', 'Fiber Broadband Outage', 'Router rebooted, DNS flushed. Signal levels normalized.'),
(1002, 'Meera Nambiar', '+91 98112 34567', 2, 'Rahul Verma', 'Billing & Accounts', 'Inbound', 'Resolved', 215, 4, '2026-10-12 09:40', 'Duplicate Charge', 'Refund credit of INR 499 initiated to payment source.'),
(1003, 'Rajesh Subramanian', '+91 99400 88219', 3, 'Ananya Sen', 'Complaints', 'Escalated', 'In Progress', 680, 2, '2026-10-12 10:05', 'Frequent Disconnection', 'Escalated to L2 Field Engineer for physical line check.'),
(1004, 'Deepak Chawla', '+91 98200 11984', 1, 'Priya Raman', 'Technical Support', 'Inbound', 'Resolved', 190, 5, '2026-10-12 10:30', 'Modem Configuration', 'Wi-Fi 5GHz band channel reconfigured.'),
(1005, 'Kavita Menon', '+91 94440 23156', 4, 'Arjun Das', 'Sales & Inquiries', 'Inbound', 'Resolved', 420, 5, '2026-10-12 11:10', 'Plan Upgrade', 'Upgraded customer to Gigabit Ultra Plan with free OTT pack.'),
(1006, 'Suresh Kumar', '+91 97890 65432', 2, 'Rahul Verma', 'Billing & Accounts', 'Outbound', 'Resolved', 160, 4, '2026-10-12 11:45', 'Payment Reminder', 'Customer confirmed online UPI payment completion.');`,
        meta: [
            { label: "Rows Seeded", value: "15 Transactional Call Records" },
            { label: "Call Classifications", value: "Inbound (12), Outbound (1), Escalated (1), Follow-up (1)" },
            { label: "Duration Range", value: "45s to 680s (Avg ~325s)" },
            { label: "Resolution Status", value: "Resolved (12), In Progress (2), Dropped (1)" }
        ]
    },
    incidents: {
        title: "INSERT INTO incidents (4 Escalation Tickets)",
        badge: "INSERT",
        icon: "🚨",
        sql: `-- 4. INSERT INCIDENTS (Escalated Trouble Tickets)
INSERT INTO incidents (ticket_id, call_id, issue_type, priority, assigned_team, sla_hours, status) VALUES
(9021, 1003, 'Physical Fiber Cut', 'CRITICAL', 'L2 Field Ops', 4, 'IN_PROGRESS'),
(9022, 1008, 'Static IP Provisioning', 'MEDIUM', 'NOC Routing', 24, 'OPEN'),
(9023, 1010, 'Core Switch Latency', 'HIGH', 'Network Infra', 8, 'IN_PROGRESS'),
(9024, 1013, 'Downstream Packet Drop', 'HIGH', 'Broadband Core', 12, 'OPEN');`,
        meta: [
            { label: "Rows Seeded", value: "4 Escalated Tickets" },
            { label: "Priority Breakdown", value: "CRITICAL (1), HIGH (2), MEDIUM (1)" },
            { label: "Assigned Units", value: "L2 Field Ops, NOC Routing, Network Infra, Broadband Core" },
            { label: "SLA Commitments", value: "4h (Critical) to 24h (Standard)" }
        ]
    },
    updates: {
        title: "UPDATE Statements Executed in PostgreSQL",
        badge: "UPDATE",
        icon: "✏",
        sql: `-- 5. EXECUTED UPDATE STATEMENTS (Data Modification)
-- Update agent CSAT rating upon positive survey review
UPDATE agents 
SET csat_avg = 4.95, status = 'Active' 
WHERE agent_id = 1;

-- Update call record status to Resolved with updated customer rating
UPDATE call_records 
SET call_status = 'Resolved', rating = 5, notes = 'Issue verified and closed.' 
WHERE call_id = 1003;

-- Escalate incident priority and assign emergency SLA
UPDATE incidents 
SET status = 'RESOLVED', sla_hours = 2 
WHERE ticket_id = 9021;`,
        meta: [
            { label: "DML Type", value: "UPDATE ... SET ... WHERE ..." },
            { label: "Clause Used", value: "Parameterized WHERE clause on Primary Keys" },
            { label: "Transaction Handling", value: "Audited with affected row count feedback" },
            { label: "Referential Check", value: "Ensures foreign key consistency during record update" }
        ]
    },
    deletes: {
        title: "DELETE Statements Executed in PostgreSQL",
        badge: "DELETE",
        icon: "🗑",
        sql: `-- 6. EXECUTED DELETE STATEMENTS (Record Removal)
-- Remove dropped call transaction
DELETE FROM call_records 
WHERE call_id = 1013;

-- Purge closed incident ticket
DELETE FROM incidents 
WHERE ticket_id = 9024;

-- Note: Deleting a CALL_RECORD cascades to delete associated INCIDENTS (ON DELETE CASCADE)
-- Deleting an AGENT is blocked if calls exist (ON DELETE RESTRICT)`,
        meta: [
            { label: "DML Type", value: "DELETE FROM ... WHERE ..." },
            { label: "Constraint Handling", value: "ON DELETE CASCADE removes dependent incidents" },
            { label: "Restrict Handling", value: "ON DELETE RESTRICT protects referenced agents" },
            { label: "Affected Rows", value: "Returns precise count of deleted records" }
        ]
    }
};

function loadDmlDetail(key) {
    activeDmlKey = key;
    const item = DML_CATALOG[key];
    if (!item) return;

    // Sidebar active state
    document.querySelectorAll('.command-sidebar .command-item-card').forEach(c => {
        if (c.id && c.id.startsWith('dmlItem-')) c.classList.remove('active');
    });
    const activeCard = document.getElementById(`dmlItem-${key}`);
    if (activeCard) activeCard.classList.add('active');

    // Header info
    document.getElementById('dmlViewerIcon').textContent = item.icon;
    document.getElementById('dmlViewerTitle').textContent = item.title;

    // Syntax-highlighted SQL
    document.getElementById('dmlSqlCodeDisplay').innerHTML = formatSqlHighlight(item.sql);

    // Meta grid
    const metaContainer = document.getElementById('dmlMetaGrid');
    metaContainer.innerHTML = '';
    item.meta.forEach(m => {
        const div = document.createElement('div');
        div.className = 'meta-item';
        div.innerHTML = `<label>${m.label}</label><span>${m.value}</span>`;
        metaContainer.appendChild(div);
    });
}

function copyCurrentDmlSql() {
    const item = DML_CATALOG[activeDmlKey];
    if (!item) return;
    navigator.clipboard.writeText(item.sql).then(() => {
        showToast('DML SQL Copied', `Copied statements for ${item.title}.`, 'success');
    });
}

function runCurrentDmlInTerminal() {
    const item = DML_CATALOG[activeDmlKey];
    if (!item) return;
    switchMainView('terminal');
    const input = document.getElementById('sqlTerminalInput');
    if (input) {
        input.value = item.sql;
        input.focus();
    }
    showToast('Sent to Terminal', 'DML statements loaded into SQL terminal.', 'info');
}

function handleDmlTableChange(tableName) {
    const container = document.getElementById('dmlWorkbenchDynamicInputs');
    if (!container) return;
    container.innerHTML = '';

    const op = document.getElementById('dmlWorkbenchOpSelect').value;
    const table = window.db.getTable(tableName);
    if (!table) return;

    if (op === 'DELETE') {
        const pkCol = table.columns.find(c => c.isPk) || table.columns[0];
        container.innerHTML = `
            <div class="form-group">
                <label>Record Primary Key to DELETE (${pkCol.name})</label>
                <input type="text" id="dmlInput_${pkCol.name}" class="input-control" placeholder="e.g. ${table.rows[0] ? table.rows[0][pkCol.name] : '1'}" value="${table.rows[0] ? table.rows[0][pkCol.name] : '1'}" style="padding-left: 14px;">
            </div>
        `;
    } else if (op === 'UPDATE') {
        const pkCol = table.columns.find(c => c.isPk) || table.columns[0];
        const nonPkCols = table.columns.filter(c => !c.isPk);
        const sampleRow = table.rows[0] || {};

        let fieldsHtml = `
            <div class="form-group">
                <label>Target Row ID (${pkCol.name})</label>
                <input type="text" id="dmlInput_${pkCol.name}" class="input-control" value="${sampleRow[pkCol.name] || '1'}" style="padding-left: 14px;">
            </div>
            <div class="form-grid-2">
        `;

        nonPkCols.slice(0, 4).forEach(c => {
            fieldsHtml += `
                <div class="form-group">
                    <label>New ${c.name}</label>
                    <input type="text" id="dmlInput_${c.name}" class="input-control" value="${sampleRow[c.name] || ''}" style="padding-left: 14px;">
                </div>
            `;
        });
        fieldsHtml += `</div>`;
        container.innerHTML = fieldsHtml;
    } else {
        // INSERT
        let fieldsHtml = `<div class="form-grid-2">`;
        table.columns.forEach(c => {
            if (c.isPk) {
                // Auto-suggest next pk
                const nextId = (table.rows.length + 1) * 10;
                fieldsHtml += `
                    <div class="form-group">
                        <label>${c.name} (PK)</label>
                        <input type="text" id="dmlInput_${c.name}" class="input-control" value="${nextId}" style="padding-left: 14px;">
                    </div>
                `;
            } else {
                let defaultVal = '';
                if (c.name.includes('DATE') || c.name.includes('CREATED')) defaultVal = '2026-10-13 16:30';
                else if (c.name.includes('STATUS')) defaultVal = 'Resolved';
                else if (c.name.includes('RATING')) defaultVal = '5';
                else if (c.name.includes('DEPT') || c.name.includes('DEPARTMENT')) defaultVal = 'Technical Support';
                else if (c.name.includes('DURATION')) defaultVal = '300';
                else if (c.name.includes('NAME')) defaultVal = 'Test Record';
                else if (c.name.includes('PHONE')) defaultVal = '+91 99999 88888';

                fieldsHtml += `
                    <div class="form-group">
                        <label>${c.name}</label>
                        <input type="text" id="dmlInput_${c.name}" class="input-control" value="${defaultVal}" style="padding-left: 14px;">
                    </div>
                `;
            }
        });
        fieldsHtml += `</div>`;
        container.innerHTML = fieldsHtml;
    }

    renderDmlWorkbenchPreview(tableName);
}

function handleDmlOpChange() {
    const tbl = document.getElementById('dmlWorkbenchTableSelect').value;
    handleDmlTableChange(tbl);
}

function executeDmlWorkbench() {
    const tableName = document.getElementById('dmlWorkbenchTableSelect').value;
    const op = document.getElementById('dmlWorkbenchOpSelect').value;
    const table = window.db.getTable(tableName);

    const startTime = performance.now();
    try {
        let executedSql = '';
        let message = '';

        if (op === 'INSERT') {
            const record = {};
            table.columns.forEach(c => {
                const el = document.getElementById(`dmlInput_${c.name}`);
                if (el) record[c.name] = el.value.trim();
            });
            const res = window.db.insert(tableName, record);
            executedSql = res.sql;
            message = res.message;
        } else if (op === 'UPDATE') {
            const pkCol = table.columns.find(c => c.isPk) || table.columns[0];
            const pkVal = document.getElementById(`dmlInput_${pkCol.name}`).value.trim();
            const updates = {};
            table.columns.filter(c => !c.isPk).forEach(c => {
                const el = document.getElementById(`dmlInput_${c.name}`);
                if (el && el.value.trim() !== '') {
                    updates[c.name] = el.value.trim();
                }
            });
            const res = window.db.update(tableName, pkVal, updates);
            executedSql = res.sql;
            message = res.message;
        } else if (op === 'DELETE') {
            const pkCol = table.columns.find(c => c.isPk) || table.columns[0];
            const pkVal = document.getElementById(`dmlInput_${pkCol.name}`).value.trim();
            const res = window.db.delete(tableName, pkVal);
            executedSql = res.sql;
            message = res.message;
        }

        const duration = (performance.now() - startTime).toFixed(1);
        document.getElementById('dmlWorkbenchLatency').textContent = `${duration} ms`;
        const statusBox = document.getElementById('dmlWorkbenchStatus');
        statusBox.className = 'output-status-strip success';
        statusBox.textContent = `✓ ${message}`;

        document.getElementById('dmlWorkbenchOutputSql').textContent = executedSql;

        refreshActiveTable();
        updateMetrics();
        updateTransactionUi();
        renderDmlWorkbenchPreview(tableName);
        showToast('DML Executed', message, 'success');
    } catch (err) {
        const duration = (performance.now() - startTime).toFixed(1);
        document.getElementById('dmlWorkbenchLatency').textContent = `${duration} ms`;
        const statusBox = document.getElementById('dmlWorkbenchStatus');
        statusBox.className = 'output-status-strip error';
        statusBox.textContent = `✕ ${err.message}`;
        showToast('DML Execution Error', err.message, 'error');
    }
}

function renderDmlWorkbenchPreview(tableName) {
    const container = document.getElementById('dmlWorkbenchPreviewTable');
    if (!container) return;
    const table = window.db.getTable(tableName);
    if (!table || !table.rows.length) {
        container.innerHTML = '<tbody><tr><td style="color: var(--text-muted); padding: 8px;">Table has no rows.</td></tr></tbody>';
        return;
    }

    const cols = table.columns.slice(0, 5);
    const rows = table.rows.slice(0, 3);

    let html = '<thead><tr>';
    cols.forEach(c => html += `<th>${c.name}</th>`);
    html += '</tr></thead><tbody>';

    rows.forEach(r => {
        html += '<tr>';
        cols.forEach(c => html += `<td>${r[c.name] !== undefined ? r[c.name] : ''}</td>`);
        html += '</tr>';
    });
    html += '</tbody>';
    container.innerHTML = html;
}

function formatSqlHighlight(sql) {
    if (!sql) return '';
    let escaped = sql
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Comments
    escaped = escaped.replace(/(--.*$)/gm, '<span class="sql-comment">$1</span>');

    // Keywords
    const keywords = ['CREATE', 'TABLE', 'SERIAL', 'PRIMARY KEY', 'NOT NULL', 'UNIQUE', 'DEFAULT', 'INT', 'VARCHAR', 'TEXT', 'TIMESTAMP', 'CURRENT_TIMESTAMP', 'NUMERIC', 'CHECK', 'CONSTRAINT', 'FOREIGN KEY', 'REFERENCES', 'ON DELETE', 'CASCADE', 'RESTRICT', 'INDEX', 'ALTER', 'ADD COLUMN', 'DROP COLUMN', 'DROP', 'IF EXISTS', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'WHERE', 'DELETE FROM', 'SELECT', 'FROM'];
    keywords.forEach(kw => {
        const regex = new RegExp(`\\b${kw}\\b`, 'gi');
        escaped = escaped.replace(regex, `<span class="sql-keyword">${kw}</span>`);
    });

    // Strings
    escaped = escaped.replace(/'([^']*)'/g, '<span class="sql-string">\'$1\'</span>');

    return escaped;
}

