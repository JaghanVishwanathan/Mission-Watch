package com.jaghan.missionwatch.freshness;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

/** One refresh attempt against an external source, successful or not. */
@Entity
@Table(name = "data_refresh")
public class DataRefreshEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String source;

    @Column(nullable = false)
    private String job;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "finished_at", nullable = false)
    private Instant finishedAt;

    @Column(nullable = false)
    private boolean succeeded;

    @Column(name = "records_stored", nullable = false)
    private int recordsStored;

    @Column(name = "records_skipped", nullable = false)
    private int recordsSkipped;

    private String message;

    protected DataRefreshEntity() {}

    DataRefreshEntity(RefreshOutcome outcome) {
        this.source = outcome.source();
        this.job = outcome.job();
        this.startedAt = outcome.startedAt();
        this.finishedAt = outcome.finishedAt();
        this.succeeded = outcome.succeeded();
        this.recordsStored = outcome.stored();
        this.recordsSkipped = outcome.skipped();
        this.message = outcome.message();
    }

    public Instant getFinishedAt() {
        return finishedAt;
    }

    public boolean isSucceeded() {
        return succeeded;
    }

    public int getRecordsSkipped() {
        return recordsSkipped;
    }

    public String getMessage() {
        return message;
    }
}
