package com.nexuscall.model;

public class Customer {
    private Integer texId;
    private String name;
    private String phone;
    private String tier;
    private String city;
    private Integer totalCalls;

    public Customer() {}

    public Customer(Integer texId, String name, String phone, String tier, String city, Integer totalCalls) {
        this.texId = texId;
        this.name = name;
        this.phone = phone;
        this.tier = tier;
        this.city = city;
        this.totalCalls = totalCalls;
    }

    public Integer getCustId() { return texId; }
    public void setCustId(Integer texId) { this.texId = texId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getTier() { return tier; }
    public void setTier(String tier) { this.tier = tier; }
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    public Integer getTotalCalls() { return totalCalls; }
    public void setTotalCalls(Integer totalCalls) { this.totalCalls = totalCalls; }
}
