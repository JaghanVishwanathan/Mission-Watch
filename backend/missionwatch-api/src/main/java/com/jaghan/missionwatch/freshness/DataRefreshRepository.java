package com.jaghan.missionwatch.freshness;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface DataRefreshRepository extends JpaRepository<DataRefreshEntity, Long> {

    Optional<DataRefreshEntity> findFirstBySourceOrderByFinishedAtDesc(String source);

    Optional<DataRefreshEntity> findFirstBySourceAndSucceededTrueOrderByFinishedAtDesc(String source);
}
