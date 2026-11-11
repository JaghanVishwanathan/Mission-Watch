package com.jaghan.missionwatch.launch.persistence;

import com.jaghan.missionwatch.launch.model.LaunchStatus;
import com.jaghan.missionwatch.provider.ProviderEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * A stored launch (SRS §9.1 Launch). Relational columns support filtering, sorting and joins; the
 * {@code document} column holds the full normalised view the API serves, and {@code
 * sourcePayload} keeps the latest source record for traceability.
 */
@Entity
@Table(name = "launch")
public class LaunchEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "external_id", nullable = false, unique = true)
    private String externalId;

    @Column(nullable = false)
    private String name;

    @Column(name = "mission_name", nullable = false)
    private String missionName;

    @Column(name = "scheduled_time", nullable = false)
    private Instant scheduledTime;

    @Convert(converter = LaunchStatusConverter.class)
    @Column(nullable = false)
    private LaunchStatus status;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "provider_id")
    private ProviderEntity provider;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "rocket_id")
    private RocketEntity rocket;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "site_id")
    private LaunchSiteEntity site;

    @Column(name = "detail_level", nullable = false)
    private String detailLevel;

    @Column(name = "source_updated_at")
    private Instant sourceUpdatedAt;

    @Column(name = "refreshed_at", nullable = false)
    private Instant refreshedAt;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "json")
    private String document;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "source_payload", nullable = false, columnDefinition = "json")
    private String sourcePayload;

    protected LaunchEntity() {}

    public LaunchEntity(String externalId) {
        this.externalId = externalId;
    }

    public Long getId() {
        return id;
    }

    public String getExternalId() {
        return externalId;
    }

    public String getDocument() {
        return document;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setMissionName(String missionName) {
        this.missionName = missionName;
    }

    public void setScheduledTime(Instant scheduledTime) {
        this.scheduledTime = scheduledTime;
    }

    public void setStatus(LaunchStatus status) {
        this.status = status;
    }

    public void setProvider(ProviderEntity provider) {
        this.provider = provider;
    }

    public void setRocket(RocketEntity rocket) {
        this.rocket = rocket;
    }

    public void setSite(LaunchSiteEntity site) {
        this.site = site;
    }

    public void setDetailLevel(String detailLevel) {
        this.detailLevel = detailLevel;
    }

    public void setSourceUpdatedAt(Instant sourceUpdatedAt) {
        this.sourceUpdatedAt = sourceUpdatedAt;
    }

    public void setRefreshedAt(Instant refreshedAt) {
        this.refreshedAt = refreshedAt;
    }

    public void setDocument(String document) {
        this.document = document;
    }

    public void setSourcePayload(String sourcePayload) {
        this.sourcePayload = sourcePayload;
    }
}
