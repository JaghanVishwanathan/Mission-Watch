package com.jaghan.missionwatch.launch;

import com.jaghan.missionwatch.launch.model.LaunchView;
import com.jaghan.missionwatch.launch.persistence.LaunchEntity;
import com.jaghan.missionwatch.launch.persistence.LaunchRepository;
import com.jaghan.missionwatch.launch.persistence.LaunchSiteEntity;
import com.jaghan.missionwatch.launch.persistence.LaunchSiteRepository;
import com.jaghan.missionwatch.launch.persistence.RocketEntity;
import com.jaghan.missionwatch.launch.persistence.RocketRepository;
import com.jaghan.missionwatch.provider.ProviderEntity;
import com.jaghan.missionwatch.provider.ProviderService;
import com.jaghan.missionwatch.snapshot.Observation;
import com.jaghan.missionwatch.snapshot.SnapshotService;
import java.time.Instant;
import java.time.OffsetDateTime;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The write side for launches: idempotent upserts keyed on the source identifier, plus a schedule
 * snapshot whenever the time or status changed (FR-07, NFR-02).
 */
@Service
public class LaunchStore {

    private final LaunchRepository launches;
    private final RocketRepository rockets;
    private final LaunchSiteRepository sites;
    private final ProviderService providers;
    private final SnapshotService snapshots;
    private final LaunchDocuments documents;
    private final CacheManager caches;

    public LaunchStore(
            LaunchRepository launches,
            RocketRepository rockets,
            LaunchSiteRepository sites,
            ProviderService providers,
            SnapshotService snapshots,
            LaunchDocuments documents,
            CacheManager caches) {
        this.launches = launches;
        this.rockets = rockets;
        this.sites = sites;
        this.providers = providers;
        this.snapshots = snapshots;
        this.documents = documents;
        this.caches = caches;
    }

    public record StoreResult(boolean created, boolean scheduleChanged) {}

    /**
     * Inserts or updates one launch with everything it references.
     *
     * @param sourcePayload the raw source record (JSON), kept for traceability
     * @param observedAt when the source was read
     */
    @Transactional
    public StoreResult upsert(LaunchView view, String sourcePayload, String source, Instant observedAt) {
        ProviderEntity provider = providers.upsert(view.provider());

        RocketEntity rocket = rockets.findByExternalId(view.rocket().id())
                .orElseGet(() -> new RocketEntity(view.rocket().id()));
        rocket.update(
                view.rocket().name(), view.rocket().family(), view.rocket().variant(), provider);
        rocket = rockets.save(rocket);

        LaunchView.Site s = view.site();
        LaunchSiteEntity site = sites.findByExternalId(s.id()).orElseGet(() -> new LaunchSiteEntity(s.id()));
        site.update(s.name(), s.location(), s.countryCode(), s.latitude(), s.longitude());
        site = sites.save(site);

        LaunchEntity launch = launches.findByExternalId(view.externalId()).orElse(null);
        boolean created = launch == null;
        if (created) launch = new LaunchEntity(view.externalId());

        Instant scheduledTime = parseTime(view.scheduledTime());
        Instant sourceUpdatedAt = view.lastUpdated() == null ? null : parseTime(view.lastUpdated());
        launch.setName(view.name());
        launch.setMissionName(view.missionName());
        launch.setScheduledTime(scheduledTime);
        launch.setStatus(view.status());
        launch.setProvider(provider);
        launch.setRocket(rocket);
        launch.setSite(site);
        launch.setDetailLevel(view.detailLevel());
        launch.setSourceUpdatedAt(sourceUpdatedAt);
        launch.setRefreshedAt(observedAt);
        // History is served from launch_snapshot, never frozen into the document.
        launch.setDocument(documents.write(view.withScheduleHistory(java.util.List.of())));
        launch.setSourcePayload(sourcePayload);
        launch = launches.save(launch);

        boolean changed = snapshots.recordIfChanged(
                launch.getId(),
                new Observation(observedAt, scheduledTime, view.status().code(), source, sourceUpdatedAt));
        return new StoreResult(created, changed);
    }

    /** Called after a batch of writes so readers see the new data at once. */
    public void evictCaches() {
        caches.getCacheNames().forEach(name -> {
            var cache = caches.getCache(name);
            if (cache != null) cache.clear();
        });
    }

    static Instant parseTime(String iso) {
        return OffsetDateTime.parse(iso).toInstant();
    }
}
