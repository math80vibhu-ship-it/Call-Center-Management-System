package com.nexuscall.model;

public class Incident {
    private Integer ticketId;
    private Integer callId;
    private String issueType;
    private String priority;
    private String assignedTeam;
    private Integer slaHours;
    private String status;

    public Incident() {}

    public Incident(Integer ticketId, Integer callId, String issueType, String priority, String assignedTeam, Integer slaHours, String status) {
        this.ticketId = ticketId;
        this.callId = callId;
        this.issueType = issueType;
        this.priority = priority;
        this.assignedTeam = assignedTeam;
        this.slaHours = slaHours;
        this.status = status;
    }

    public Integer getTicketId() { return ticketId; }
    public void setTicketId(Integer ticketId) { this.ticketId = ticketId; }
    public Integer getCallId() { return callId; }
    public void setCallId(Integer callId) { this.callId = callId; }
    public String getIssueType() { return issueType; }
    public void setIssueType(String issueType) { this.issueType = issueType; }
    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }
    public String getAssignedTeam() { return assignedTeam; }
    public void setAssignedTeam(String assignedTeam) { this.assignedTeam = assignedTeam; }
    public Integer getSlaHours() { return slaHours; }
    public void setSlaHours(Integer slaHours) { this.slaHours = slaHours; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
