package com.jaghan.missionwatch.freshness;

import java.time.Instant;

/** What a refresh job reports when it finishes. */
public record RefreshOutcome(
        String source,
        String job,
        Instant startedAt,
        Instant finishedAt,
        boolean succeeded,
        int stored,
        int skipped,
        String message) {

    public static RefreshOutcome success(
            String source, String job, Instant startedAt, Instant finishedAt, int stored, int skipped) {
        return new RefreshOutcome(source, job, startedAt, finishedAt, true, stored, skipped, null);
    }

    public static RefreshOutcome failure(
            String source, String job, Instant startedAt, Instant finishedAt, String message) {
        return new RefreshOutcome(source, job, startedAt, finishedAt, false, 0, 0, message);
    }
}
