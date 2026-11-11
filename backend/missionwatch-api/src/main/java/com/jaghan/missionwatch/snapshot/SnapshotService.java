package com.jaghan.missionwatch.snapshot;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Keeps the schedule history of each launch (FR-07). Sources overwrite their current schedule, so
 * every change is stored here as it is observed. A row is written only when the scheduled time or
 * status differs from the latest one, which makes repeated refreshes idempotent.
 */
@Service
public class SnapshotService {

    private final LaunchSnapshotRepository snapshots;

    public SnapshotService(LaunchSnapshotRepository snapshots) {
        this.snapshots = snapshots;
    }

    /** Returns true when the observation was stored as a new snapshot. */
    @Transactional
    public boolean recordIfChanged(Long launchId, Observation observation) {
        Optional<LaunchSnapshotEntity> latest = snapshots.findFirstByLaunchIdOrderByObservedAtDescIdDesc(launchId);
        if (!changed(latest, observation.scheduledTime(), observation.status())) return false;
        snapshots.save(new LaunchSnapshotEntity(launchId, observation));
        return true;
    }

    @Transactional(readOnly = true)
    public List<LaunchSnapshotView> history(Long launchId) {
        return snapshots.findByLaunchIdOrderByObservedAtAscIdAsc(launchId).stream()
                .map(LaunchSnapshotView::of)
                .toList();
    }

    static boolean changed(Optional<LaunchSnapshotEntity> latest, Instant scheduledTime, String status) {
        return latest.map(s -> !s.getScheduledTime().equals(scheduledTime)
                        || !s.getStatus().equals(status))
                .orElse(true);
    }
}
