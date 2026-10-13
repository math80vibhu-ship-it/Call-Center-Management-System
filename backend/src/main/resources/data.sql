-- ============================================================================
-- NexusCall DBMS - PostgreSQL Relational Seed Data (DML)
-- ============================================================================

INSERT INTO customers (cust_id, name, phone, tier, city, total_calls) VALUES
(501, 'Aditya Sharma', '+91 98765 43210', 'Platinum VIP', 'Chennai', 4),
(502, 'Meera Nambiar', '+91 98112 34567', 'Gold', 'Bengaluru', 2),
(503, 'Rajesh Subramanian', '+91 99400 88219', 'Gold', 'Chennai', 7),
(504, 'Deepak Chawla', '+91 98200 11984', 'Platinum VIP', 'Mumbai', 3),
(505, 'Kavita Menon', '+91 94440 23156', 'Silver', 'Hyderabad', 1),
(506, 'Suresh Kumar', '+91 97890 65432', 'Standard', 'Coimbatore', 2),
(507, 'Sneha Patel', '+91 96543 21098', 'Gold', 'Ahmedabad', 3);

INSERT INTO agents (agent_id, agent_name, email, department, extension, shift, status, csat_avg) VALUES
(1, 'Priya Raman', 'priya.raman@nexuscall.com', 'Technical Support', 401, 'Morning (08:00 - 16:00)', 'Active', 4.90),
(2, 'Rahul Verma', 'rahul.verma@nexuscall.com', 'Billing & Accounts', 402, 'Morning (08:00 - 16:00)', 'Active', 4.60),
(3, 'Ananya Sen', 'ananya.sen@nexuscall.com', 'Complaints', 403, 'General (10:00 - 18:00)', 'On Call', 4.10),
(4, 'Arjun Das', 'arjun.das@nexuscall.com', 'Sales & Inquiries', 404, 'Evening (14:00 - 22:00)', 'Active', 4.80),
(5, 'Kavita Nair', 'kavita.nair@nexuscall.com', 'General Helpdesk', 405, 'Evening (14:00 - 22:00)', 'Break', 4.40);

INSERT INTO call_records (call_id, customer_name, phone_number, agent_id, agent_name, department, call_type, call_status, duration_secs, rating, call_date, issue_category, notes) VALUES
(1001, 'Aditya Sharma', '+91 98765 43210', 1, 'Priya Raman', 'Technical Support', 'Inbound', 'Resolved', 340, 5, '2026-10-12 09:15', 'Fiber Broadband Outage', 'Router rebooted, DNS flushed. Signal levels normalized.'),
(1002, 'Meera Nambiar', '+91 98112 34567', 2, 'Rahul Verma', 'Billing & Accounts', 'Inbound', 'Resolved', 215, 4, '2026-10-12 09:40', 'Duplicate Charge', 'Refund credit of INR 499 initiated to payment source.'),
(1003, 'Rajesh Subramanian', '+91 99400 88219', 3, 'Ananya Sen', 'Complaints', 'Escalated', 'In Progress', 680, 2, '2026-10-12 10:05', 'Frequent Disconnection', 'Escalated to L2 Field Engineer for physical line check.'),
(1004, 'Deepak Chawla', '+91 98200 11984', 1, 'Priya Raman', 'Technical Support', 'Inbound', 'Resolved', 190, 5, '2026-10-12 10:30', 'Modem Configuration', 'Wi-Fi 5GHz band channel reconfigured to avoid interference.'),
(1005, 'Kavita Menon', '+91 94440 23156', 4, 'Arjun Das', 'Sales & Inquiries', 'Inbound', 'Resolved', 420, 5, '2026-10-12 11:10', 'Plan Upgrade', 'Upgraded customer to Gigabit Ultra Plan with free OTT pack.'),
(1006, 'Suresh Kumar', '+91 97890 65432', 2, 'Rahul Verma', 'Billing & Accounts', 'Outbound', 'Resolved', 160, 4, '2026-10-12 11:45', 'Payment Reminder', 'Customer confirmed online UPI payment completion.'),
(1007, 'Sneha Patel', '+91 96543 21098', 5, 'Kavita Nair', 'General Helpdesk', 'Inbound', 'Resolved', 140, 4, '2026-10-12 12:20', 'Self-Care Portal Login', 'Password reset link sent to registered email.'),
(1008, 'Harish Sundaram', '+91 93800 77123', 3, 'Ananya Sen', 'Technical Support', 'Inbound', 'Pending Customer', 510, 3, '2026-10-12 12:50', 'Static IP Allocation', 'Awaiting customer MAC address submission for binding.'),
(1009, 'Rohan Mehra', '+91 98450 99882', 4, 'Arjun Das', 'Sales & Inquiries', 'Follow-up', 'Resolved', 280, 5, '2026-10-12 13:30', 'Enterprise Leased Line', 'Corporate brochure and SLA documentation shared via email.'),
(1010, 'Sunita Rao', '+91 97123 44556', 5, 'Kavita Nair', 'Complaints', 'Escalated', 'In Progress', 620, 2, '2026-10-12 14:00', 'Unscheduled Downtime', 'Issue tracked under Ticket #TK-9024; Priority High.'),
(1011, 'Amitabh Joshi', '+91 98330 12345', 1, 'Priya Raman', 'Technical Support', 'Inbound', 'Resolved', 295, 5, '2026-10-12 14:35', 'VoIP Latency', 'QoS priority tagged for SIP traffic on gateway.'),
(1012, 'Divya Krishnan', '+91 94880 66778', 2, 'Rahul Verma', 'Billing & Accounts', 'Inbound', 'Resolved', 180, 5, '2026-10-12 15:10', 'GST Invoice Update', 'Updated Company GSTIN and re-issued tax invoice for Sept.'),
(1013, 'Vikram Seth', '+91 99000 55443', 3, 'Ananya Sen', 'Technical Support', 'Inbound', 'Dropped', 45, 1, '2026-10-12 15:35', 'Network Packet Loss', 'Call disconnected abruptly by customer network. Scheduled callback.'),
(1014, 'Pooja Hegde', '+91 91760 33221', 4, 'Arjun Das', 'Sales & Inquiries', 'Inbound', 'Resolved', 330, 4, '2026-10-12 16:05', 'Add-on OTT Activation', 'Activated Netflix & Prime bundling onto primary subscriber ID.'),
(1015, 'Girish Pillai', '+91 98840 77991', 5, 'Kavita Nair', 'General Helpdesk', 'Inbound', 'Resolved', 195, 4, '2026-10-12 16:40', 'Relocation Request', 'Feasibility check scheduled for new residential address.');

INSERT INTO incidents (ticket_id, call_id, issue_type, priority, assigned_team, sla_hours, status) VALUES
(9021, 1003, 'Physical Fiber Cut', 'CRITICAL', 'L2 Field Ops', 4, 'IN_PROGRESS'),
(9022, 1008, 'Static IP Provisioning', 'MEDIUM', 'NOC Routing', 24, 'OPEN'),
(9023, 1010, 'Core Switch Latency', 'HIGH', 'Network Infra', 8, 'IN_PROGRESS'),
(9024, 1013, 'Downstream Packet Drop', 'HIGH', 'Broadband Core', 12, 'OPEN');
