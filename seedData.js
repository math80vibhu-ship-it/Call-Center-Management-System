/**
 * Seed Data for Call Center Management System (NexusCall DBMS)
 * Reference: BACSE202 Database Systems Lab (ODBC & JDBC)
 */

const SEED_DATA = {
    tables: {
        CALL_RECORDS: {
            columns: [
                { name: 'CALL_ID', type: 'NUMBER', isPk: true, isNullable: false },
                { name: 'CUSTOMER_NAME', type: 'VARCHAR2(50)', isPk: false, isNullable: false },
                { name: 'PHONE_NUMBER', type: 'VARCHAR2(15)', isPk: false, isNullable: false },
                { name: 'AGENT_ID', type: 'NUMBER', isPk: false, isNullable: false },
                { name: 'AGENT_NAME', type: 'VARCHAR2(50)', isPk: false, isNullable: false },
                { name: 'DEPARTMENT', type: 'VARCHAR2(30)', isPk: false, isNullable: false },
                { name: 'CALL_TYPE', type: 'VARCHAR2(20)', isPk: false, isNullable: false },
                { name: 'CALL_STATUS', type: 'VARCHAR2(20)', isPk: false, isNullable: false },
                { name: 'DURATION_SECS', type: 'NUMBER', isPk: false, isNullable: false },
                { name: 'RATING', type: 'NUMBER', isPk: false, isNullable: true },
                { name: 'CALL_DATE', type: 'VARCHAR2(20)', isPk: false, isNullable: false },
                { name: 'ISSUE_CATEGORY', type: 'VARCHAR2(40)', isPk: false, isNullable: false },
                { name: 'NOTES', type: 'VARCHAR2(120)', isPk: false, isNullable: true }
            ],
            rows: [
                {
                    CALL_ID: 1001,
                    CUSTOMER_NAME: 'Aditya Sharma',
                    PHONE_NUMBER: '+91 98765 43210',
                    AGENT_ID: 1,
                    AGENT_NAME: 'Priya Raman',
                    DEPARTMENT: 'Technical Support',
                    CALL_TYPE: 'Inbound',
                    CALL_STATUS: 'Resolved',
                    DURATION_SECS: 340,
                    RATING: 5,
                    CALL_DATE: '2026-10-12 09:15',
                    ISSUE_CATEGORY: 'Fiber Broadband Outage',
                    NOTES: 'Router rebooted, DNS flushed. Signal levels normalized.'
                },
                {
                    CALL_ID: 1002,
                    CUSTOMER_NAME: 'Meera Nambiar',
                    PHONE_NUMBER: '+91 98112 34567',
                    AGENT_ID: 2,
                    AGENT_NAME: 'Rahul Verma',
                    DEPARTMENT: 'Billing & Accounts',
                    CALL_TYPE: 'Inbound',
                    CALL_STATUS: 'Resolved',
                    DURATION_SECS: 215,
                    RATING: 4,
                    CALL_DATE: '2026-10-12 09:40',
                    ISSUE_CATEGORY: 'Duplicate Charge',
                    NOTES: 'Refund credit of INR 499 initiated to payment source.'
                },
                {
                    CALL_ID: 1003,
                    CUSTOMER_NAME: 'Rajesh Subramanian',
                    PHONE_NUMBER: '+91 99400 88219',
                    AGENT_ID: 3,
                    AGENT_NAME: 'Ananya Sen',
                    DEPARTMENT: 'Complaints',
                    CALL_TYPE: 'Escalated',
                    CALL_STATUS: 'In Progress',
                    DURATION_SECS: 680,
                    RATING: 2,
                    CALL_DATE: '2026-10-12 10:05',
                    ISSUE_CATEGORY: 'Frequent Disconnection',
                    NOTES: 'Escalated to L2 Field Engineer for physical line check.'
                },
                {
                    CALL_ID: 1004,
                    CUSTOMER_NAME: 'Deepak Chawla',
                    PHONE_NUMBER: '+91 98200 11984',
                    AGENT_ID: 1,
                    AGENT_NAME: 'Priya Raman',
                    DEPARTMENT: 'Technical Support',
                    CALL_TYPE: 'Inbound',
                    CALL_STATUS: 'Resolved',
                    DURATION_SECS: 190,
                    RATING: 5,
                    CALL_DATE: '2026-10-12 10:30',
                    ISSUE_CATEGORY: 'Modem Configuration',
                    NOTES: 'Wi-Fi 5GHz band channel reconfigured to avoid interference.'
                },
                {
                    CALL_ID: 1005,
                    CUSTOMER_NAME: 'Kavita Menon',
                    PHONE_NUMBER: '+91 94440 23156',
                    AGENT_ID: 4,
                    AGENT_NAME: 'Arjun Das',
                    DEPARTMENT: 'Sales & Inquiries',
                    CALL_TYPE: 'Inbound',
                    CALL_STATUS: 'Resolved',
                    DURATION_SECS: 420,
                    RATING: 5,
                    CALL_DATE: '2026-10-12 11:10',
                    ISSUE_CATEGORY: 'Plan Upgrade',
                    NOTES: 'Upgraded customer to Gigabit Ultra Plan with free OTT pack.'
                },
                {
                    CALL_ID: 1006,
                    CUSTOMER_NAME: 'Suresh Kumar',
                    PHONE_NUMBER: '+91 97890 65432',
                    AGENT_ID: 2,
                    AGENT_NAME: 'Rahul Verma',
                    DEPARTMENT: 'Billing & Accounts',
                    CALL_TYPE: 'Outbound',
                    CALL_STATUS: 'Resolved',
                    DURATION_SECS: 160,
                    RATING: 4,
                    CALL_DATE: '2026-10-12 11:45',
                    ISSUE_CATEGORY: 'Payment Reminder',
                    NOTES: 'Customer confirmed online UPI payment completion.'
                },
                {
                    CALL_ID: 1007,
                    CUSTOMER_NAME: 'Sneha Patel',
                    PHONE_NUMBER: '+91 96543 21098',
                    AGENT_ID: 5,
                    AGENT_NAME: 'Kavita Nair',
                    DEPARTMENT: 'General Helpdesk',
                    CALL_TYPE: 'Inbound',
                    CALL_STATUS: 'Resolved',
                    DURATION_SECS: 140,
                    RATING: 4,
                    CALL_DATE: '2026-10-12 12:20',
                    ISSUE_CATEGORY: 'Self-Care Portal Login',
                    NOTES: 'Password reset link sent to registered email.'
                },
                {
                    CALL_ID: 1008,
                    CUSTOMER_NAME: 'Harish Sundaram',
                    PHONE_NUMBER: '+91 93800 77123',
                    AGENT_ID: 3,
                    AGENT_NAME: 'Ananya Sen',
                    DEPARTMENT: 'Technical Support',
                    CALL_TYPE: 'Inbound',
                    CALL_STATUS: 'Pending Customer',
                    DURATION_SECS: 510,
                    RATING: 3,
                    CALL_DATE: '2026-10-12 12:50',
                    ISSUE_CATEGORY: 'Static IP Allocation',
                    NOTES: 'Awaiting customer MAC address submission for binding.'
                },
                {
                    CALL_ID: 1009,
                    CUSTOMER_NAME: 'Rohan Mehra',
                    PHONE_NUMBER: '+91 98450 99882',
                    AGENT_ID: 4,
                    AGENT_NAME: 'Arjun Das',
                    DEPARTMENT: 'Sales & Inquiries',
                    CALL_TYPE: 'Follow-up',
                    CALL_STATUS: 'Resolved',
                    DURATION_SECS: 280,
                    RATING: 5,
                    CALL_DATE: '2026-10-12 13:30',
                    ISSUE_CATEGORY: 'Enterprise Leased Line',
                    NOTES: 'Corporate brochure and SLA documentation shared via email.'
                },
                {
                    CALL_ID: 1010,
                    CUSTOMER_NAME: 'Sunita Rao',
                    PHONE_NUMBER: '+91 97123 44556',
                    AGENT_ID: 5,
                    AGENT_NAME: 'Kavita Nair',
                    DEPARTMENT: 'Complaints',
                    CALL_TYPE: 'Escalated',
                    CALL_STATUS: 'In Progress',
                    DURATION_SECS: 620,
                    RATING: 2,
                    CALL_DATE: '2026-10-12 14:00',
                    ISSUE_CATEGORY: 'Unscheduled Downtime',
                    NOTES: 'Issue tracked under Ticket #TK-9024; Priority High.'
                },
                {
                    CALL_ID: 1011,
                    CUSTOMER_NAME: 'Amitabh Joshi',
                    PHONE_NUMBER: '+91 98330 12345',
                    AGENT_ID: 1,
                    AGENT_NAME: 'Priya Raman',
                    DEPARTMENT: 'Technical Support',
                    CALL_TYPE: 'Inbound',
                    CALL_STATUS: 'Resolved',
                    DURATION_SECS: 295,
                    RATING: 5,
                    CALL_DATE: '2026-10-12 14:35',
                    ISSUE_CATEGORY: 'VoIP Latency',
                    NOTES: 'QoS priority tagged for SIP traffic on gateway.'
                },
                {
                    CALL_ID: 1012,
                    CUSTOMER_NAME: 'Divya Krishnan',
                    PHONE_NUMBER: '+91 94880 66778',
                    AGENT_ID: 2,
                    AGENT_NAME: 'Rahul Verma',
                    DEPARTMENT: 'Billing & Accounts',
                    CALL_TYPE: 'Inbound',
                    CALL_STATUS: 'Resolved',
                    DURATION_SECS: 180,
                    RATING: 5,
                    CALL_DATE: '2026-10-12 15:10',
                    ISSUE_CATEGORY: 'GST Invoice Update',
                    NOTES: 'Updated Company GSTIN and re-issued tax invoice for Sept.'
                },
                {
                    CALL_ID: 1013,
                    CUSTOMER_NAME: 'Vikram Seth',
                    PHONE_NUMBER: '+91 99000 55443',
                    AGENT_ID: 3,
                    AGENT_NAME: 'Ananya Sen',
                    DEPARTMENT: 'Technical Support',
                    CALL_TYPE: 'Inbound',
                    CALL_STATUS: 'Dropped',
                    DURATION_SECS: 45,
                    RATING: 1,
                    CALL_DATE: '2026-10-12 15:35',
                    ISSUE_CATEGORY: 'Network Packet Loss',
                    NOTES: 'Call disconnected abruptly by customer network. Scheduled callback.'
                },
                {
                    CALL_ID: 1014,
                    CUSTOMER_NAME: 'Pooja Hegde',
                    PHONE_NUMBER: '+91 91760 33221',
                    AGENT_ID: 4,
                    AGENT_NAME: 'Arjun Das',
                    DEPARTMENT: 'Sales & Inquiries',
                    CALL_TYPE: 'Inbound',
                    CALL_STATUS: 'Resolved',
                    DURATION_SECS: 330,
                    RATING: 4,
                    CALL_DATE: '2026-10-12 16:05',
                    ISSUE_CATEGORY: 'Add-on OTT Activation',
                    NOTES: 'Activated Netflix & Prime bundling onto primary subscriber ID.'
                },
                {
                    CALL_ID: 1015,
                    CUSTOMER_NAME: 'Girish Pillai',
                    PHONE_NUMBER: '+91 98840 77991',
                    AGENT_ID: 5,
                    AGENT_NAME: 'Kavita Nair',
                    DEPARTMENT: 'General Helpdesk',
                    CALL_TYPE: 'Inbound',
                    CALL_STATUS: 'Resolved',
                    DURATION_SECS: 195,
                    RATING: 4,
                    CALL_DATE: '2026-10-12 16:40',
                    ISSUE_CATEGORY: 'Relocation Request',
                    NOTES: 'Feasibility check scheduled for new residential address.'
                }
            ]
        },

        AGENTS: {
            columns: [
                { name: 'AGENT_ID', type: 'NUMBER', isPk: true, isNullable: false },
                { name: 'AGENT_NAME', type: 'VARCHAR2(50)', isPk: false, isNullable: false },
                { name: 'EMAIL', type: 'VARCHAR2(50)', isPk: false, isNullable: false },
                { name: 'DEPARTMENT', type: 'VARCHAR2(30)', isPk: false, isNullable: false },
                { name: 'EXTENSION', type: 'NUMBER', isPk: false, isNullable: false },
                { name: 'SHIFT', type: 'VARCHAR2(20)', isPk: false, isNullable: false },
                { name: 'STATUS', type: 'VARCHAR2(20)', isPk: false, isNullable: false },
                { name: 'CSAT_AVG', type: 'NUMBER', isPk: false, isNullable: false }
            ],
            rows: [
                { AGENT_ID: 1, AGENT_NAME: 'Priya Raman', EMAIL: 'priya.raman@nexuscall.com', DEPARTMENT: 'Technical Support', EXTENSION: 401, SHIFT: 'Morning (08:00 - 16:00)', STATUS: 'Active', CSAT_AVG: 4.9 },
                { AGENT_ID: 2, AGENT_NAME: 'Rahul Verma', EMAIL: 'rahul.verma@nexuscall.com', DEPARTMENT: 'Billing & Accounts', EXTENSION: 402, SHIFT: 'Morning (08:00 - 16:00)', STATUS: 'Active', CSAT_AVG: 4.6 },
                { AGENT_ID: 3, AGENT_NAME: 'Ananya Sen', EMAIL: 'ananya.sen@nexuscall.com', DEPARTMENT: 'Complaints', EXTENSION: 403, SHIFT: 'General (10:00 - 18:00)', STATUS: 'On Call', CSAT_AVG: 4.1 },
                { AGENT_ID: 4, AGENT_NAME: 'Arjun Das', EMAIL: 'arjun.das@nexuscall.com', DEPARTMENT: 'Sales & Inquiries', EXTENSION: 404, SHIFT: 'Evening (14:00 - 22:00)', STATUS: 'Active', CSAT_AVG: 4.8 },
                { AGENT_ID: 5, AGENT_NAME: 'Kavita Nair', EMAIL: 'kavita.nair@nexuscall.com', DEPARTMENT: 'General Helpdesk', EXTENSION: 405, SHIFT: 'Evening (14:00 - 22:00)', STATUS: 'Break', CSAT_AVG: 4.4 }
            ]
        },

        CUSTOMERS: {
            columns: [
                { name: 'CUST_ID', type: 'NUMBER', isPk: true, isNullable: false },
                { name: 'NAME', type: 'VARCHAR2(50)', isPk: false, isNullable: false },
                { name: 'PHONE', type: 'VARCHAR2(15)', isPk: false, isNullable: false },
                { name: 'TIER', type: 'VARCHAR2(20)', isPk: false, isNullable: false },
                { name: 'CITY', type: 'VARCHAR2(30)', isPk: false, isNullable: false },
                { name: 'TOTAL_CALLS', type: 'NUMBER', isPk: false, isNullable: false }
            ],
            rows: [
                { CUST_ID: 501, NAME: 'Aditya Sharma', PHONE: '+91 98765 43210', TIER: 'Platinum VIP', CITY: 'Chennai', TOTAL_CALLS: 4 },
                { CUST_ID: 502, NAME: 'Meera Nambiar', PHONE: '+91 98112 34567', TIER: 'Gold', CITY: 'Bengaluru', TOTAL_CALLS: 2 },
                { CUST_ID: 503, NAME: 'Rajesh Subramanian', PHONE: '+91 99400 88219', TIER: 'Gold', CITY: 'Chennai', TOTAL_CALLS: 7 },
                { CUST_ID: 504, NAME: 'Deepak Chawla', PHONE: '+91 98200 11984', TIER: 'Platinum VIP', CITY: 'Mumbai', TOTAL_CALLS: 3 },
                { CUST_ID: 505, NAME: 'Kavita Menon', PHONE: '+91 94440 23156', TIER: 'Silver', CITY: 'Hyderabad', TOTAL_CALLS: 1 },
                { CUST_ID: 506, NAME: 'Suresh Kumar', PHONE: '+91 97890 65432', TIER: 'Standard', CITY: 'Coimbatore', TOTAL_CALLS: 2 },
                { CUST_ID: 507, NAME: 'Sneha Patel', PHONE: '+91 96543 21098', TIER: 'Gold', CITY: 'Ahmedabad', TOTAL_CALLS: 3 }
            ]
        },

        INCIDENTS: {
            columns: [
                { name: 'TICKET_ID', type: 'NUMBER', isPk: true, isNullable: false },
                { name: 'CALL_ID', type: 'NUMBER', isPk: false, isNullable: false },
                { name: 'ISSUE_TYPE', type: 'VARCHAR2(40)', isPk: false, isNullable: false },
                { name: 'PRIORITY', type: 'VARCHAR2(20)', isPk: false, isNullable: false },
                { name: 'ASSIGNED_TEAM', type: 'VARCHAR2(30)', isPk: false, isNullable: false },
                { name: 'SLA_HOURS', type: 'NUMBER', isPk: false, isNullable: false },
                { name: 'STATUS', type: 'VARCHAR2(20)', isPk: false, isNullable: false }
            ],
            rows: [
                { TICKET_ID: 9021, CALL_ID: 1003, ISSUE_TYPE: 'Physical Fiber Cut', PRIORITY: 'CRITICAL', ASSIGNED_TEAM: 'L2 Field Ops', SLA_HOURS: 4, STATUS: 'IN_PROGRESS' },
                { TICKET_ID: 9022, CALL_ID: 1008, ISSUE_TYPE: 'Static IP Provisioning', PRIORITY: 'MEDIUM', ASSIGNED_TEAM: 'NOC Routing', SLA_HOURS: 24, STATUS: 'OPEN' },
                { TICKET_ID: 9023, CALL_ID: 1010, ISSUE_TYPE: 'Core Switch Latency', PRIORITY: 'HIGH', ASSIGNED_TEAM: 'Network Infra', SLA_HOURS: 8, STATUS: 'IN_PROGRESS' },
                { TICKET_ID: 9024, CALL_ID: 1013, ISSUE_TYPE: 'Downstream Packet Drop', PRIORITY: 'HIGH', ASSIGNED_TEAM: 'Broadband Core', SLA_HOURS: 12, STATUS: 'OPEN' }
            ]
        }
    }
};

// Export to window if in browser
if (typeof window !== 'undefined') {
    window.SEED_DATA = SEED_DATA;
}
