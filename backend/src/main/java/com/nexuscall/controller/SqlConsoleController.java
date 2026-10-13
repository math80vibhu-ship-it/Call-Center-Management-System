package com.nexuscall.controller;

import com.nexuscall.model.SqlRequest;
import com.nexuscall.model.SqlResponse;
import com.nexuscall.repository.SqlExecutionRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/sql")
@CrossOrigin(origins = "*")
public class SqlConsoleController {

    private final SqlExecutionRepository sqlRepository;

    public SqlConsoleController(SqlExecutionRepository sqlRepository) {
        this.sqlRepository = sqlRepository;
    }

    @PostMapping("/execute")
    public ResponseEntity<SqlResponse> executeSql(@RequestBody SqlRequest request) {
        SqlResponse response = sqlRepository.executeRawSql(request.getSql());
        return ResponseEntity.ok(response);
    }
}
