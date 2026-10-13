package com.nexuscall.model;

import java.util.List;
import java.util.Map;

public class SqlRequest {
    private String sql;

    public SqlRequest() {}
    public SqlRequest(String sql) { this.sql = sql; }

    public String getSql() { return sql; }
    public void setSql(String sql) { this.sql = sql; }
}
