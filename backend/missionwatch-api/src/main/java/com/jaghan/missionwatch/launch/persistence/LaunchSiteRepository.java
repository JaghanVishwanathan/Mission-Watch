package com.jaghan.missionwatch.launch.persistence;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LaunchSiteRepository extends JpaRepository<LaunchSiteEntity, Long> {

    Optional<LaunchSiteEntity> findByExternalId(String externalId);
}
