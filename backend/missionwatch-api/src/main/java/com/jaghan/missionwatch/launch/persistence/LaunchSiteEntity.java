package com.jaghan.missionwatch.launch.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** A launch pad and its location. Coordinates feed the Phase 3 globe. */
@Entity
@Table(name = "launch_site")
public class LaunchSiteEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "external_id", nullable = false, unique = true)
    private String externalId;

    @Column(nullable = false)
    private String name;

    private String location;

    @Column(name = "country_code")
    private String countryCode;

    private Double latitude;

    private Double longitude;

    protected LaunchSiteEntity() {}

    public LaunchSiteEntity(String externalId) {
        this.externalId = externalId;
    }

    public void update(String name, String location, String countryCode, Double latitude, Double longitude) {
        this.name = name;
        this.location = location;
        this.countryCode = countryCode;
        this.latitude = latitude;
        this.longitude = longitude;
    }
}
