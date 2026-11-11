package com.jaghan.missionwatch.provider;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface ProviderRepository extends JpaRepository<ProviderEntity, Long> {

    Optional<ProviderEntity> findByExternalId(String externalId);

    List<ProviderEntity> findAllByOrderByNameAsc();
}
