package com.nexuscall.controller;

import com.nexuscall.model.CallRecord;
import com.nexuscall.model.Agent;
import com.nexuscall.model.Customer;
import com.nexuscall.model.Incident;
import com.nexuscall.repository.CallCenterJdbcRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.sql.SQLException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class CallCenterController {

    private final CallCenterJdbcRepository repository;

    public CallCenterController(CallCenterJdbcRepository repository) {
        this.repository = repository;
    }

    @GetMapping("/tables/call_records")
    public ResponseEntity<List<CallRecord>> getCalls() throws SQLException {
        return ResponseEntity.ok(repository.findAllCalls());
    }

    @GetMapping("/tables/call_records/{id}")
    public ResponseEntity<?> getCallById(@PathVariable("id") int id) throws SQLException {
        CallRecord record = repository.findCallById(id);
        if (record != null) {
            return ResponseEntity.ok(record);
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping("/tables/call_records")
    public ResponseEntity<?> createCall(@RequestBody CallRecord call) {
        try {
            int affected = repository.insertCall(call);
            Map<String, Object> resp = new HashMap<>();
            resp.put("success", true);
            resp.put("affectedRows", affected);
            resp.put("insertedRecord", call);
            return ResponseEntity.ok(resp);
        } catch (SQLException e) {
            Map<String, Object> err = new HashMap<>();
            err.put("success", false);
            err.put("message", e.getMessage());
            err.put("sqlState", e.getSQLState());
            err.put("errorCode", e.getErrorCode());
            return ResponseEntity.badRequest().body(err);
        }
    }

    @PutMapping("/tables/call_records/{id}")
    public ResponseEntity<?> updateCall(@PathVariable("id") int id, @RequestBody CallRecord call) {
        try {
            int affected = repository.updateCall(id, call);
            Map<String, Object> resp = new HashMap<>();
            resp.put("success", true);
            resp.put("affectedRows", affected);
            resp.put("message", affected + " row(s) updated via JDBC PreparedStatement.");
            return ResponseEntity.ok(resp);
        } catch (SQLException e) {
            Map<String, Object> err = new HashMap<>();
            err.put("success", false);
            err.put("message", e.getMessage());
            err.put("sqlState", e.getSQLState());
            return ResponseEntity.badRequest().body(err);
        }
    }

    @DeleteMapping("/tables/call_records/{id}")
    public ResponseEntity<?> deleteCall(@PathVariable("id") int id) {
        try {
            int affected = repository.deleteCall(id);
            Map<String, Object> resp = new HashMap<>();
            resp.put("success", true);
            resp.put("affectedRows", affected);
            resp.put("message", affected + " row(s) deleted via JDBC PreparedStatement.");
            return ResponseEntity.ok(resp);
        } catch (SQLException e) {
            Map<String, Object> err = new HashMap<>();
            err.put("success", false);
            err.put("message", e.getMessage());
            err.put("sqlState", e.getSQLState());
            return ResponseEntity.badRequest().body(err);
        }
    }

    @GetMapping("/tables/agents")
    public ResponseEntity<List<Agent>> getAgents() throws SQLException {
        return ResponseEntity.ok(repository.findAllAgents());
    }

    @GetMapping("/tables/customers")
    public ResponseEntity<List<Customer>> getCustomers() throws SQLException {
        return ResponseEntity.ok(repository.findAllCustomers());
    }

    @GetMapping("/tables/incidents")
    public ResponseEntity<List<Incident>> getIncidents() throws SQLException {
        return ResponseEntity.ok(repository.findAllIncidents());
    }
}
