package com.nexuscall.model;

public class Agent {
    private Integer agentId;
    private String agentName;
    private String email;
    private String department;
    private Integer extension;
    private String shift;
    private String status;
    private Double csatAvg;

    public Agent() {}

    public Agent(Integer agentId, String agentName, String email, String department, Integer extension, String shift, String status, Double csatAvg) {
        this.agentId = agentId;
        this.agentName = agentName;
        this.email = email;
        this.department = department;
        this.extension = extension;
        this.shift = shift;
        this.status = status;
        this.csatAvg = csatAvg;
    }

    public Integer getAgentId() { return agentId; }
    public void setAgentId(Integer agentId) { this.agentId = agentId; }
    public String getAgentName() { return agentName; }
    public void setAgentName(String agentName) { this.agentName = agentName; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }
    public Integer getExtension() { return extension; }
    public void setExtension(Integer extension) { this.extension = extension; }
    public String getShift() { return shift; }
    public void setShift(String shift) { this.shift = shift; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Double getCsatAvg() { return csatAvg; }
    public void setCsatAvg(Double csatAvg) { this.csatAvg = csatAvg; }
}
