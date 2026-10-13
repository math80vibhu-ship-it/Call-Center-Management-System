package com.nexuscall.repository;

import com.nexuscall.model.SqlResponse;
import org.springframework.stereotype.Repository;

import javax.sql.DataSource;
import java.sql.*;
import java.util.*;

/**
 * Executes dynamic SQL statements using core JDBC Statement / PreparedStatement
 * and inspects ResultSetMetaData for column headers, types, and affected row counts.
 */
@Repository
public class SqlExecutionRepository {

    private final DataSource dataSource;

    public SqlExecutionRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    public SqlResponse executeRawSql(String rawSql) {
        String sql = (rawSql != null ? rawSql.trim().replace(";", "") : "");
        if (sql.isEmpty()) {
            return SqlResponse.error("Empty SQL statement provided", "42000", 900);
        }

        long startTime = System.currentTimeMillis();

        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement()) {

            boolean hasResultSet = stmt.execute(sql);
            long duration = System.currentTimeMillis() - startTime;

            if (hasResultSet) {
                // Process SELECT Query with ResultSetMetaData
                try (ResultSet rs = stmt.getResultSet()) {
                    ResultSetMetaData meta = rs.getMetaData();
                    int columnCount = meta.getColumnCount();

                    List<String> columns = new ArrayList<>();
                    for (int i = 1; i <= columnCount; i++) {
                        columns.add(meta.getColumnLabel(i));
                    }

                    List<Map<String, Object>> rows = new ArrayList<>();
                    while (rs.next()) {
                        Map<String, Object> rowMap = new LinkedHashMap<>();
                        for (int i = 1; i <= columnCount; i++) {
                            rowMap.put(meta.getColumnLabel(i), rs.getObject(i));
                        }
                        rows.add(rowMap);
                    }

                    return SqlResponse.dqlSuccess(columns, rows, duration);
                }
            } else {
                int updateCount = stmt.getUpdateCount();
                String upper = sql.toUpperCase();

                if (upper.startsWith("CREATE") || upper.startsWith("ALTER") ||
                    upper.startsWith("DROP") || upper.startsWith("TRUNCATE")) {
                    return SqlResponse.ddlSuccess("DDL command executed successfully.", duration);
                } else {
                    return SqlResponse.dmlSuccess("DML", updateCount, duration);
                }
            }

        } catch (SQLException e) {
            return SqlResponse.error(
                "SQLException: " + e.getMessage(),
                e.getSQLState() != null ? e.getSQLState() : "42000",
                e.getErrorCode()
            );
        } catch (Exception e) {
            return SqlResponse.error("Internal Server Error: " + e.getMessage(), "50000", 500);
        }
    }
}
