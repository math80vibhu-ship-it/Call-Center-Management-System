/**
 * PostgreSQL JDBC & ODBC Code Generator and Cursor Stepper Simulator
 * Generates Native Java JDBC code strictly using core java.sql.* APIs (No ORM/No Hibernate/No NoSQL)
 * Reference: BACSE202 Database Systems Lab Slides
 */

const JdbcSimulator = {
    generateJdbcSelect(tableName, columns = '*', whereClause = null, orderBy = null) {
        const cols = Array.isArray(columns) ? columns.join(', ') : columns;
        const whereStr = whereClause ? ` WHERE ${whereClause}` : '';
        const orderStr = orderBy ? ` ORDER BY ${orderBy}` : '';
        const sql = `SELECT ${cols} FROM ${tableName.toLowerCase()}${whereStr}${orderStr}`;

        return `// Java PostgreSQL JDBC Implementation (Native Core JDBC - No ORM)
import java.sql.*;

public class CallCenterPostgresQuery {
    private static final String URL = "jdbc:postgresql://localhost:5432/callcenter_db";
    private static final String USER = "postgres";
    private static final String PASS = "postgres";

    public static void main(String[] args) {
        String sql = "${sql}";

        // try-with-resources safely closes Connection, PreparedStatement, and ResultSet
        try (Connection con = DriverManager.getConnection(URL, USER, PASS);
             PreparedStatement ps = con.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {

            System.out.println("--- Retrieved Records from ${tableName} (PostgreSQL) ---");
            ResultSetMetaData meta = rs.getMetaData();
            int colCount = meta.getColumnCount();

            while (rs.next()) {
                StringBuilder rowStr = new StringBuilder();
                for (int i = 1; i <= colCount; i++) {
                    rowStr.append(meta.getColumnLabel(i)).append(": ")
                          .append(rs.getString(i)).append(" | ");
                }
                System.out.println(rowStr.toString());
            }

        } catch (SQLException e) {
            System.err.println("PostgreSQL Error: " + e.getMessage());
            System.err.println("SQLState: " + e.getSQLState());
            System.err.println("ErrorCode: " + e.getErrorCode());
        }
    }
}`;
    },

    generateJdbcInsert(tableName, rowData) {
        const keys = Object.keys(rowData);
        const colList = keys.map(k => k.toLowerCase()).join(', ');
        const placeholders = keys.map(() => '?').join(', ');
        const sql = `INSERT INTO ${tableName.toLowerCase()} (${colList}) VALUES (${placeholders})`;

        const bindings = keys.map((key, idx) => {
            const val = rowData[key];
            const paramIdx = idx + 1;
            if (typeof val === 'number') {
                return Number.isInteger(val)
                    ? `            ps.setInt(${paramIdx}, ${val});`
                    : `            ps.setDouble(${paramIdx}, ${val});`;
            }
            return `            ps.setString(${paramIdx}, "${String(val || '').replace(/"/g, '\\"')}");`;
        }).join('\n');

        return `// Java PostgreSQL Parameterized INSERT with PreparedStatement (Slide 22 / 25)
import java.sql.*;

public class CallCenterPostgresInsert {
    private static final String URL = "jdbc:postgresql://localhost:5432/callcenter_db";
    private static final String USER = "postgres";
    private static final String PASS = "postgres";

    public static void main(String[] args) {
        String sql = "${sql}";

        try (Connection con = DriverManager.getConnection(URL, USER, PASS);
             PreparedStatement ps = con.prepareStatement(sql)) {

            // Parameterized binding guarantees immunity against SQL injection
${bindings}

            int rowsAffected = ps.executeUpdate();
            System.out.println("Rows inserted into PostgreSQL = " + rowsAffected);

        } catch (SQLException e) {
            System.err.println("Message: " + e.getMessage());
            System.err.println("SQLState: " + e.getSQLState());
            System.err.println("ErrorCode: " + e.getErrorCode());
        }
    }
}`;
    },

    generateJdbcUpdate(tableName, updates, whereClause) {
        const updateKeys = Object.keys(updates);
        const setClauses = updateKeys.map(k => `${k.toLowerCase()} = ?`).join(', ');
        const sql = `UPDATE ${tableName.toLowerCase()} SET ${setClauses} WHERE ${whereClause || 'call_id = ?'}`;

        const bindings = updateKeys.map((key, idx) => {
            const val = updates[key];
            const paramIdx = idx + 1;
            if (typeof val === 'number') {
                return `            ps.setDouble(${paramIdx}, ${val});`;
            }
            return `            ps.setString(${paramIdx}, "${String(val).replace(/"/g, '\\"')}");`;
        }).join('\n');

        return `// Java PostgreSQL Parameterized UPDATE (Slide 23)
import java.sql.*;

public class CallCenterPostgresUpdate {
    private static final String URL = "jdbc:postgresql://localhost:5432/callcenter_db";
    private static final String USER = "postgres";
    private static final String PASS = "postgres";

    public static void main(String[] args) {
        String sql = "${sql}";

        try (Connection con = DriverManager.getConnection(URL, USER, PASS);
             PreparedStatement ps = con.prepareStatement(sql)) {

${bindings}

            int rowsUpdated = ps.executeUpdate();
            System.out.println("Rows updated in PostgreSQL = " + rowsUpdated);

        } catch (SQLException e) {
            System.err.println("Message: " + e.getMessage());
            System.err.println("SQLState: " + e.getSQLState());
            System.err.println("ErrorCode: " + e.getErrorCode());
        }
    }
}`;
    },

    generateJdbcDelete(tableName, whereClause) {
        const sql = `DELETE FROM ${tableName.toLowerCase()} WHERE ${whereClause || 'call_id = ?'}`;

        return `// Java PostgreSQL Parameterized DELETE (Slide 24)
import java.sql.*;

public class CallCenterPostgresDelete {
    private static final String URL = "jdbc:postgresql://localhost:5432/callcenter_db";
    private static final String USER = "postgres";
    private static final String PASS = "postgres";

    public static void main(String[] args) {
        String sql = "${sql}";

        try (Connection con = DriverManager.getConnection(URL, USER, PASS);
             PreparedStatement ps = con.prepareStatement(sql)) {

            int rowsDeleted = ps.executeUpdate();
            System.out.println("Rows deleted from PostgreSQL = " + rowsDeleted);

        } catch (SQLException e) {
            System.err.println("Message: " + e.getMessage());
            System.err.println("SQLState: " + e.getSQLState());
            System.err.println("ErrorCode: " + e.getErrorCode());
        }
    }
}`;
    },

    generateJdbcTransaction(isCommit) {
        const action = isCommit ? 'commit' : 'rollback';
        return `// Java PostgreSQL Explicit Transaction Handling (Slide 26, 42)
import java.sql.*;

public class PostgresTransactionControl {
    public static void executeWithTransaction(Connection con) throws SQLException {
        // Step 1: Disable Auto-Commit mode for atomicity
        con.setAutoCommit(false);

        try {
            // Step 2: Perform multiple atomic DML operations
            // PreparedStatement ps1 = con.prepareStatement("INSERT INTO call_records (...) VALUES (...)");
            // ps1.executeUpdate();
            // PreparedStatement ps2 = con.prepareStatement("UPDATE customers SET total_calls = total_calls + 1 WHERE ...");
            // ps2.executeUpdate();

            // Step 3: Explicit ${isCommit ? 'COMMIT to permanently persist' : 'ROLLBACK'}
            con.${action}();
            System.out.println("PostgreSQL Transaction ${action.toUpperCase()} completed successfully.");

        } catch (SQLException e) {
            // Step 4: Undo all operations on failure
            con.rollback();
            System.err.println("Transaction rolled back due to error: " + e.getMessage());
            throw e;
        } finally {
            con.setAutoCommit(true); // Restore default auto-commit mode
        }
    }
}`;
    },

    generateOdbcCode(sqlText, opType = 'QUERY') {
        return `/* PostgreSQL ODBC Driver (PostgreSQL Unicode/ANSI)
 * DSN: PostgresCallCenterDSN
 */
#include <windows.h>
#include <sql.h>
#include <sqlext.h>
#include <stdio.h>

int main() {
    SQLHENV  hEnv  = NULL;
    SQLHDBC  hDbc  = NULL;
    SQLHSTMT hStmt = NULL;
    SQLRETURN ret;

    // 1. Allocate Environment Handle
    SQLAllocHandle(SQL_HANDLE_ENV, SQL_NULL_HANDLE, &hEnv);
    SQLSetEnvAttr(hEnv, SQL_ATTR_ODBC_VERSION, (SQLPOINTER)SQL_OV_ODBC3, 0);

    // 2. Allocate Connection Handle & Connect to PostgreSQL DSN
    SQLAllocHandle(SQL_HANDLE_DBC, hEnv, &hDbc);
    ret = SQLConnect(hDbc, (SQLCHAR*)"PostgresCallCenterDSN", SQL_NTS,
                           (SQLCHAR*)"postgres", SQL_NTS,
                           (SQLCHAR*)"postgres", SQL_NTS);

    if (SQL_SUCCEEDED(ret)) {
        printf("ODBC Connected to PostgreSQL successfully.\\n");

        SQLAllocHandle(SQL_HANDLE_STMT, hDbc, &hStmt);
        SQLCHAR* sql = (SQLCHAR*)"${sqlText.replace(/"/g, '\\"')}";
        ret = SQLExecDirect(hStmt, sql, SQL_NTS);

        if (SQL_SUCCEEDED(ret)) {
            printf("PostgreSQL ODBC Direct Execution Succeeded.\\n");
        }

        SQLFreeHandle(SQL_HANDLE_STMT, hStmt);
        SQLDisconnect(hDbc);
    }

    SQLFreeHandle(SQL_HANDLE_DBC, hDbc);
    SQLFreeHandle(SQL_HANDLE_ENV, hEnv);
    return 0;
}`;
    }
};

window.JdbcSimulator = JdbcSimulator;
