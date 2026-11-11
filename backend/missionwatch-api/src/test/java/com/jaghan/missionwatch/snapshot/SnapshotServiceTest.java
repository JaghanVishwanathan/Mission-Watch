package com.jaghan.missionwatch.snapshot;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class SnapshotServiceTest {

    private static final Instant T0 = Instant.parse("2026-11-14T12:00:00Z");

    private static Optional<LaunchSnapshotEntity> latest(Instant time, String status) {
        return Optional.of(new LaunchSnapshotEntity(1L, new Observation(T0, time, status, "test", null)));
    }

    @Test
    void recordsTheFirstObservation() {
        assertThat(SnapshotService.changed(Optional.empty(), T0, "go")).isTrue();
    }

    @Test
    void ignoresRepeatedIdenticalObservations() {
        assertThat(SnapshotService.changed(latest(T0, "go"), T0, "go")).isFalse();
    }

    @Test
    void recordsScheduleAndStatusChanges() {
        assertThat(SnapshotService.changed(latest(T0, "go"), T0.plusSeconds(3600), "go"))
                .isTrue();
        assertThat(SnapshotService.changed(latest(T0, "go"), T0, "hold")).isTrue();
    }
}
