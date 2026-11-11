package com.jaghan.missionwatch.provider;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** A launch service provider (SRS §9.1 Provider). */
@Entity
@Table(name = "provider")
public class ProviderEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "external_id", nullable = false, unique = true)
    private String externalId;

    @Column(nullable = false)
    private String name;

    private String abbrev;

    @Column(name = "country_code")
    private String countryCode;

    private String type;

    protected ProviderEntity() {}

    ProviderEntity(String externalId) {
        this.externalId = externalId;
    }

    void update(ProviderView view) {
        this.name = view.name();
        this.abbrev = view.abbrev();
        this.countryCode = view.countryCode();
        this.type = view.type();
    }

    ProviderView toView() {
        return new ProviderView(externalId, externalId, name, abbrev, countryCode, type);
    }

    public Long getId() {
        return id;
    }

    public String getExternalId() {
        return externalId;
    }
}
