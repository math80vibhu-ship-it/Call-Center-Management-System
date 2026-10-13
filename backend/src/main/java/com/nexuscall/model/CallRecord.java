package com.nexuscall.model;

public class CallRecord {
    private Integer callId;
    private String customerName;
    private String phoneNumber;
    private Integer agentId;
    private String agentName;
    private String department;
    private String callType;
    private String callStatus;
    private Integer durationSecs;
    private Integer rating;
    private String callDate;
    private String issueCategory;
    private String notes;

    public CallRecord() {}

    public CallRecord(Integer callId, String customerName, String phoneNumber, Integer agentId,
                      String agentName, String department, String callType, String callStatus,
                      Integer durationSecs, Integer rating, String callDate, String issueCategory, String notes) {
        this.callId = callId;
        this.customerName = customerName;
        this.phoneNumber = phoneNumber;
        this.agentId = agentId;
        this.agentName = agentName;
        this.department = department;
        this.callType = callType;
        this.callStatus = callStatus;
        this.durationSecs = durationSecs;
        this.rating = rating;
        this.callDate = callDate;
        this.issueCategory = issueCategory;
        this.notes = notes;
    }

    public Integer getCallId() { return callId; }
    public void setCallId(Integer callId) { this.callId = callId; }
    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }
    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }
    public Integer getAgentId() { return agentId; }
    public void setAgentId(Integer agentId) { this.agentId = agentId; }
    public String getAgentName() { return agentName; }
    public void setAgentName(String agentName) { this.agentName = agentName; }
    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }
    public String getCallType() { return callType; }
    public void setCallType(String callType) { this.callType = callType; }
    public String getCallStatus() { return callStatus; }
    public void setCallStatus(String callStatus) { this.callStatus = callStatus; }
    public Integer getDurationSecs() { return durationSecs; }
    public void setDurationSecs(Integer durationSecs) { this.durationSecs = durationSecs; }
    public Integer getRating() { return rating; }
    public void setRating(Integer rating) { this.rating = rating; }
    public String getCallDate() { return callDate; }
    public void setCallDate(String callDate) { this.callDate = callDate; }
    public String getIssueCategory() { return issueCategory; }
    public void setIssueCategory(String issueCategory) { this.issueCategory = issueCategory; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
