package com.jaghan.missionwatch.snapshot;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;

/**
 * A schedule observation as served by the API, matching the frontend {@code LaunchSnapshot} model.
 *
 * @param sourcedReason only set when a reliable source states why the schedule changed; never
 *     inferred (FR-07)
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record LaunchSnapshotView(
        Instant observedAt, Instant scheduledTime, String status, String source, String sourcedReason) {

    static LaunchSnapshotView of(LaunchSnapshotEntity e) {
        return new LaunchSnapshotView(e.getObservedAt(), e.getScheduledTime(), e.getStatus(), e.getSource(), null);
    }
}
