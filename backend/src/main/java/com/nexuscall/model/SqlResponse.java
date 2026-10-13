package com.nexuscall.model;

import java.util.List;
import java.util.Map;

public class SqlResponse {
    private boolean success;
    private String operationType; // DQL, DML, DDL, TCL
    private String message;
    private List<String> columns;
    private List<Map<String, Object>> rows;
    private Integer rowCount;
    private Integer affectedRows;
    private String sqlState;
    private Integer errorCode;
    private Long executionDurationMs;

    public SqlResponse() {}

    public static SqlResponse dqlSuccess(List<String> columns, List<Map<String, Object>> rows, long durationMs) {
        SqlResponse resp = new SqlResponse();
        resp.setSuccess(true);
        resp.setOperationType("DQL");
        resp.setColumns(columns);
        resp.setRows(rows);
        resp.setRowCount(rows.size());
        resp.setMessage("Retrieved " + rows.size() + " row(s) successfully.");
        resp.setExecutionDurationMs(durationMs);
        return resp;
    }

    public static SqlResponse dmlSuccess(String op, int affectedRows, long durationMs) {
        SqlResponse resp = new SqlResponse();
        resp.setSuccess(true);
        resp.setOperationType("DML");
        resp.setAffectedRows(affectedRows);
        resp.setMessage(affectedRows + " row(s) affected. (executeUpdate() returned " + affectedRows + ")");
        resp.setExecutionDurationMs(durationMs);
        return resp;
    }

    public static SqlResponse ddlSuccess(String message, long durationMs) {
        SqlResponse resp = new SqlResponse();
        resp.setSuccess(true);
        resp.setOperationType("DDL");
        resp.setMessage(message);
        resp.setExecutionDurationMs(durationMs);
        return resp;
    }

    public static SqlResponse error(String message, String sqlState, int errorCode) {
        SqlResponse resp = new SqlResponse();
        resp.setSuccess(false);
        resp.setMessage(message);
        resp.setSqlState(sqlState);
        resp.setErrorCode(errorCode);
        return resp;
    }

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }
    public String getOperationType() { return operationType; }
    public void setOperationType(String operationType) { this.operationType = operationType; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public List<String> getColumns() { return columns; }
    public void setColumns(List<String> columns) { this.columns = columns; }
    public List<Map<String, Object>> getRows() { return rows; }
    public void setRows(List<Map<String, Object>> rows) { this.rows = rows; }
    public Integer getRowCount() { return rowCount; }
    public void setRowCount(Integer rowCount) { this.rowCount = rowCount; }
    public Integer getAffectedRows() { return affectedRows; }
    public void setAffectedRows(Integer affectedRows) { this.affectedRows = affectedRows; }
    public String getSqlState() { return sqlState; }
    public void setSqlState(String sqlState) { this.sqlState = sqlState; }
    public Integer getErrorCode() { return errorCode; }
    public void setErrorCode(Integer errorCode) { this.errorCode = errorCode; }
    public Long getExecutionDurationMs() { return executionDurationMs; }
    public void setExecutionDurationMs(Long executionDurationMs) { this.executionDurationMs = executionDurationMs; }
}
