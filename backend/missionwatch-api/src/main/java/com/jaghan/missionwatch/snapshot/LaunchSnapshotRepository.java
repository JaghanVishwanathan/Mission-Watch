package com.jaghan.missionwatch.snapshot;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface LaunchSnapshotRepository extends JpaRepository<LaunchSnapshotEntity, Long> {

    Optional<LaunchSnapshotEntity> findFirstByLaunchIdOrderByObservedAtDescIdDesc(Long launchId);

    List<LaunchSnapshotEntity> findByLaunchIdOrderByObservedAtAscIdAsc(Long launchId);
}
