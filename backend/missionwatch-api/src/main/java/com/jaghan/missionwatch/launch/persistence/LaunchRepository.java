package com.jaghan.missionwatch.launch.persistence;

import com.jaghan.missionwatch.launch.model.LaunchStatus;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface LaunchRepository extends JpaRepository<LaunchEntity, Long>, JpaSpecificationExecutor<LaunchEntity> {

    Optional<LaunchEntity> findByExternalId(String externalId);

    List<LaunchEntity> findByStatusInOrderByScheduledTimeAsc(Collection<LaunchStatus> statuses, Limit limit);

    List<LaunchEntity> findByStatusInOrderByScheduledTimeDesc(Collection<LaunchStatus> statuses, Limit limit);
}
