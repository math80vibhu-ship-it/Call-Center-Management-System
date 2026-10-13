-- ============================================================================
-- NexusCall DBMS - PostgreSQL Relational Database Schema (DDL)
-- ============================================================================

DROP TABLE IF EXISTS incidents CASCADE;
DROP TABLE IF EXISTS call_records CASCADE;
DROP TABLE IF EXISTS agents CASCADE;
DROP TABLE IF EXISTS customers CASCADE;

CREATE TABLE customers (
    cust_id         SERIAL PRIMARY KEY,
    name            VARCHAR(60) NOT NULL,
    phone           VARCHAR(20) NOT NULL UNIQUE,
    tier            VARCHAR(20) NOT NULL DEFAULT 'Standard',
    city            VARCHAR(40) NOT NULL,
    total_calls     INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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
);

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
    CONSTRAINT fk_call_agent FOREIGN KEY (agent_id) REFERENCES agents (agent_id) ON DELETE RESTRICT
);

CREATE TABLE incidents (
    ticket_id       SERIAL PRIMARY KEY,
    call_id         INT NOT NULL,
    issue_type      VARCHAR(50) NOT NULL,
    priority        VARCHAR(20) NOT NULL CHECK (priority IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
    assigned_team   VARCHAR(40) NOT NULL,
    sla_hours       INT NOT NULL DEFAULT 24,
    status          VARCHAR(25) NOT NULL DEFAULT 'OPEN',
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_incident_call FOREIGN KEY (call_id) REFERENCES call_records (call_id) ON DELETE CASCADE
);
