package com.nexuscall.repository;

import com.nexuscall.model.CallRecord;
import com.nexuscall.model.Agent;
import com.nexuscall.model.Customer;
import com.nexuscall.model.Incident;
import org.springframework.stereotype.Repository;

import javax.sql.DataSource;
import java.sql.*;
import java.util.ArrayList;
import java.util.List;

/**
 * Pure Java JDBC Repository for Call Center Management System.
 * Uses core java.sql.* APIs exclusively (PreparedStatement, ResultSet, explicit transactions).
 * Strictly NO ORM, Hibernate, or Spring Data JPA.
 */
@Repository
public class CallCenterJdbcRepository {

    private final DataSource dataSource;

    public CallCenterJdbcRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    // -------------------------------------------------------------------------
    // CALL_RECORDS Operations (DQL & DML)
    // -------------------------------------------------------------------------

    public List<CallRecord> findAllCalls() throws SQLException {
        String sql = "SELECT call_id, customer_name, phone_number, agent_id, agent_name, " +
                     "department, call_type, call_status, duration_secs, rating, call_date, " +
                     "issue_category, notes FROM call_records ORDER BY call_id ASC";

        List<CallRecord> list = new ArrayList<>();
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {

            while (rs.next()) {
                list.add(mapRowToCallRecord(rs));
            }
        }
        return list;
    }

    public CallRecord findCallById(int callId) throws SQLException {
        String sql = "SELECT call_id, customer_name, phone_number, agent_id, agent_name, " +
                     "department, call_type, call_status, duration_secs, rating, call_date, " +
                     "issue_category, notes FROM call_records WHERE call_id = ?";

        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setInt(1, callId);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return mapRowToCallRecord(rs);
                }
            }
        }
        return null;
    }

    public int insertCall(CallRecord call) throws SQLException {
        String sql = "INSERT INTO call_records (customer_name, phone_number, agent_id, agent_name, " +
                     "department, call_type, call_status, duration_secs, rating, call_date, " +
                     "issue_category, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {

            bindCallParameters(ps, call);
            int rowsAffected = ps.executeUpdate();

            if (rowsAffected > 0) {
                try (ResultSet generatedKeys = ps.getGeneratedKeys()) {
                    if (generatedKeys.next()) {
                        call.setCallId(generatedKeys.getInt(1));
                    }
                }
            }
            return rowsAffected;
        }
    }

    public int updateCall(int callId, CallRecord call) throws SQLException {
        String sql = "UPDATE call_records SET customer_name = ?, phone_number = ?, agent_id = ?, " +
                     "agent_name = ?, department = ?, call_type = ?, call_status = ?, duration_secs = ?, " +
                     "rating = ?, call_date = ?, issue_category = ?, notes = ? WHERE call_id = ?";

        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            bindCallParameters(ps, call);
            ps.setInt(13, callId);

            return ps.executeUpdate();
        }
    }

    public int deleteCall(int callId) throws SQLException {
        String sql = "DELETE FROM call_records WHERE call_id = ?";

        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setInt(1, callId);
            return ps.executeUpdate();
        }
    }

    // -------------------------------------------------------------------------
    // TRANSACTION DEMONSTRATION (Slide 26, 42)
    // -------------------------------------------------------------------------

    public void insertCallWithIncidentTransaction(CallRecord call, Incident incident) throws SQLException {
        String insertCallSql = "INSERT INTO call_records (customer_name, phone_number, agent_id, agent_name, " +
                               "department, call_type, call_status, duration_secs, rating, call_date, " +
                               "issue_category, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        String insertIncidentSql = "INSERT INTO incidents (call_id, issue_type, priority, assigned_team, sla_hours, status) " +
                                  "VALUES (?, ?, ?, ?, ?, ?)";

        Connection conn = null;
        try {
            conn = dataSource.getConnection();
            // Step 1: Disable auto-commit
            conn.setAutoCommit(false);

            int generatedCallId;
            try (PreparedStatement psCall = conn.prepareStatement(insertCallSql, Statement.RETURN_GENERATED_KEYS)) {
                bindCallParameters(psCall, call);
                psCall.executeUpdate();
                try (ResultSet rs = psCall.getGeneratedKeys()) {
                    if (rs.next()) {
                        generatedCallId = rs.getInt(1);
                    } else {
                        throw new SQLException("Creating call record failed, no ID obtained.");
                    }
                }
            }

            try (PreparedStatement psInc = conn.prepareStatement(insertIncidentSql)) {
                psInc.setInt(1, generatedCallId);
                psInc.setString(2, incident.getIssueType());
                psInc.setString(3, incident.getPriority());
                psInc.setString(4, incident.getAssignedTeam());
                psInc.setInt(5, incident.getSlaHours());
                psInc.setString(6, incident.getStatus());
                psInc.executeUpdate();
            }

            // Step 2: Explicit COMMIT
            conn.commit();
            System.out.println("Transaction committed successfully for call ID: " + generatedCallId);

        } catch (SQLException e) {
            // Step 3: Explicit ROLLBACK on failure
            if (conn != null) {
                conn.rollback();
                System.err.println("Transaction rolled back due to error: " + e.getMessage());
            }
            throw e;
        } finally {
            if (conn != null) {
                conn.setAutoCommit(true);
                conn.close();
            }
        }
    }

    // -------------------------------------------------------------------------
    // AGENTS, CUSTOMERS, INCIDENTS Queries
    // -------------------------------------------------------------------------

    public List<Agent> findAllAgents() throws SQLException {
        String sql = "SELECT agent_id, agent_name, email, department, extension, shift, status, csat_avg FROM agents ORDER BY agent_id ASC";
        List<Agent> list = new ArrayList<>();
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                list.add(new Agent(
                    rs.getInt("agent_id"),
                    rs.getString("agent_name"),
                    rs.getString("email"),
                    rs.getString("department"),
                    rs.getInt("extension"),
                    rs.getString("shift"),
                    rs.getString("status"),
                    rs.getDouble("csat_avg")
                ));
            }
        }
        return list;
    }

    public List<Customer> findAllCustomers() throws SQLException {
        String sql = "SELECT cust_id, name, phone, tier, city, total_calls FROM customers ORDER BY cust_id ASC";
        List<Customer> list = new ArrayList<>();
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                list.add(new Customer(
                    rs.getInt("cust_id"),
                    rs.getString("name"),
                    rs.getString("phone"),
                    rs.getString("tier"),
                    rs.getString("city"),
                    rs.getInt("total_calls")
                ));
            }
        }
        return list;
    }

    public List<Incident> findAllIncidents() throws SQLException {
        String sql = "SELECT ticket_id, call_id, issue_type, priority, assigned_team, sla_hours, status FROM incidents ORDER BY ticket_id ASC";
        List<Incident> list = new ArrayList<>();
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                list.add(new Incident(
                    rs.getInt("ticket_id"),
                    rs.getInt("call_id"),
                    rs.getString("issue_type"),
                    rs.getString("priority"),
                    rs.getString("assigned_team"),
                    rs.getInt("sla_hours"),
                    rs.getString("status")
                ));
            }
        }
        return list;
    }

    // -------------------------------------------------------------------------
    // Helper Row Mappers & Binders
    // -------------------------------------------------------------------------

    private CallRecord mapRowToCallRecord(ResultSet rs) throws SQLException {
        return new CallRecord(
            rs.getInt("call_id"),
            rs.getString("customer_name"),
            rs.getString("phone_number"),
            rs.getInt("agent_id"),
            rs.getString("agent_name"),
            rs.getString("department"),
            rs.getString("call_type"),
            rs.getString("call_status"),
            rs.getInt("duration_secs"),
            rs.getInt("rating"),
            rs.getString("call_date"),
            rs.getString("issue_category"),
            rs.getString("notes")
        );
    }

    private void bindCallParameters(PreparedStatement ps, CallRecord call) throws SQLException {
        ps.setString(1, call.getCustomerName());
        ps.setString(2, call.getPhoneNumber());
        ps.setInt(3, call.getAgentId() != null ? call.getAgentId() : 1);
        ps.setString(4, call.getAgentName() != null ? call.getAgentName() : "Priya Raman");
        ps.setString(5, call.getDepartment() != null ? call.getDepartment() : "Technical Support");
        ps.setString(6, call.getCallType() != null ? call.getCallType() : "Inbound");
        ps.setString(7, call.getCallStatus() != null ? call.getCallStatus() : "Resolved");
        ps.setInt(8, call.getDurationSecs() != null ? call.getDurationSecs() : 180);
        if (call.getRating() != null) {
            ps.setInt(9, call.getRating());
        } else {
            ps.setNull(9, Types.INTEGER);
        }
        ps.setString(10, call.getCallDate() != null ? call.getCallDate() : "2026-10-12 12:00");
        ps.setString(11, call.getIssueCategory() != null ? call.getIssueCategory() : "General Inquiry");
        ps.setString(12, call.getNotes());
    }
}
