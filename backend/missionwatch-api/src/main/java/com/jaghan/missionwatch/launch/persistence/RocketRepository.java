package com.jaghan.missionwatch.launch.persistence;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RocketRepository extends JpaRepository<RocketEntity, Long> {

    Optional<RocketEntity> findByExternalId(String externalId);
}
