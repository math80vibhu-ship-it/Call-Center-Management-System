package com.nexuscall.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import javax.sql.DataSource;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.Statement;
import java.util.stream.Collectors;

@Configuration
public class DatabaseConfig {

    @Value("${spring.datasource.url}")
    private String jdbcUrl;

    @Value("${spring.datasource.driver-class-name}")
    private String driverClassName;

    @Value("${spring.datasource.username}")
    private String username;

    @Value("${spring.datasource.password}")
    private String password;

    @Bean
    public DataSource dataSource() {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(jdbcUrl);
        config.setDriverClassName(driverClassName);
        config.setUsername(username);
        config.setPassword(password);
        config.setMaximumPoolSize(10);
        config.setMinimumIdle(2);
        config.setPoolName("NexusCallHikariPool");

        HikariDataSource ds = new HikariDataSource(config);

        // Initialize schema and data via native JDBC
        initializeDatabase(ds);
        return ds;
    }

    private void initializeDatabase(DataSource ds) {
        System.out.println("--- Initializing Relational PostgreSQL Database via Core JDBC ---");
        try (Connection conn = ds.getConnection()) {
            executeSqlScript(conn, "schema.sql");
            executeSqlScript(conn, "data.sql");
            System.out.println("--- Database Schema & Seed Data Initialized Successfully ---");
        } catch (Exception e) {
            System.err.println("Warning during DB initialization: " + e.getMessage());
        }
    }

    private void executeSqlScript(Connection conn, String scriptPath) {
        try {
            ClassPathResource resource = new ClassPathResource(scriptPath);
            if (!resource.exists()) return;

            try (BufferedReader reader = new BufferedReader(new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8));
                 Statement stmt = conn.createStatement()) {

                String fullSql = reader.lines().collect(Collectors.joining("\n"));
                String[] commands = fullSql.split(";");

                for (String cmd : commands) {
                    String trimmed = cmd.trim();
                    if (!trimmed.isEmpty() && !trimmed.startsWith("--")) {
                        stmt.execute(trimmed);
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Error executing " + scriptPath + ": " + e.getMessage());
        }
    }
}
