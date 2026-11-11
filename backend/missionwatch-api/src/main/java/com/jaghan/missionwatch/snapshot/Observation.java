package com.jaghan.missionwatch.snapshot;

import java.time.Instant;

/**
 * What a refresh saw for one launch.
 *
 * @param status the internal status code, e.g. "go" or "hold"
 * @param sourceUpdatedAt when the source last changed its record, if it says
 */
public record Observation(
        Instant observedAt, Instant scheduledTime, String status, String source, Instant sourceUpdatedAt) {}
