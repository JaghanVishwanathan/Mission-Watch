package com.jaghan.missionwatch.launch.persistence;

import com.jaghan.missionwatch.provider.ProviderEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/** A rocket configuration (SRS §9.1 Rocket). Detailed specifications live in the launch document. */
@Entity
@Table(name = "rocket")
public class RocketEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "external_id", nullable = false, unique = true)
    private String externalId;

    @Column(nullable = false)
    private String name;

    private String family;

    private String variant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "provider_id")
    private ProviderEntity provider;

    protected RocketEntity() {}

    public RocketEntity(String externalId) {
        this.externalId = externalId;
    }

    public void update(String name, String family, String variant, ProviderEntity provider) {
        this.name = name;
        this.family = family;
        this.variant = variant;
        this.provider = provider;
    }
}
