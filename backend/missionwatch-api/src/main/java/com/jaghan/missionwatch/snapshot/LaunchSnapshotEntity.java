package com.jaghan.missionwatch.snapshot;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

/** One observed schedule or status of a launch (SRS §9.1 LaunchSnapshot, FR-07). */
@Entity
@Table(name = "launch_snapshot")
public class LaunchSnapshotEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Plain id, not a relation, so this package does not depend on the launch package. */
    @Column(name = "launch_id", nullable = false)
    private Long launchId;

    @Column(name = "observed_at", nullable = false)
    private Instant observedAt;

    @Column(name = "scheduled_time", nullable = false)
    private Instant scheduledTime;

    @Column(nullable = false)
    private String status;

    @Column(nullable = false)
    private String source;

    @Column(name = "source_updated_at")
    private Instant sourceUpdatedAt;

    protected LaunchSnapshotEntity() {}

    LaunchSnapshotEntity(Long launchId, Observation observation) {
        this.launchId = launchId;
        this.observedAt = observation.observedAt();
        this.scheduledTime = observation.scheduledTime();
        this.status = observation.status();
        this.source = observation.source();
        this.sourceUpdatedAt = observation.sourceUpdatedAt();
    }

    public Instant getObservedAt() {
        return observedAt;
    }

    public Instant getScheduledTime() {
        return scheduledTime;
    }

    public String getStatus() {
        return status;
    }

    public String getSource() {
        return source;
    }
}
