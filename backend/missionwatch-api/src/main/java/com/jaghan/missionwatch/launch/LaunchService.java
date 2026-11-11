package com.jaghan.missionwatch.launch;

import static com.jaghan.missionwatch.launch.persistence.LaunchSpecifications.hasProviderIn;
import static com.jaghan.missionwatch.launch.persistence.LaunchSpecifications.hasStatusIn;
import static com.jaghan.missionwatch.launch.persistence.LaunchSpecifications.matchesText;
import static com.jaghan.missionwatch.launch.persistence.LaunchSpecifications.scheduledBetween;

import com.jaghan.missionwatch.common.ApiExceptions.NotFoundException;
import com.jaghan.missionwatch.common.ApiResponse;
import com.jaghan.missionwatch.common.DataMeta;
import com.jaghan.missionwatch.common.DataSources;
import com.jaghan.missionwatch.freshness.FreshnessService;
import com.jaghan.missionwatch.launch.model.LaunchStatus;
import com.jaghan.missionwatch.launch.model.LaunchView;
import com.jaghan.missionwatch.launch.persistence.LaunchEntity;
import com.jaghan.missionwatch.launch.persistence.LaunchRepository;
import com.jaghan.missionwatch.snapshot.LaunchSnapshotView;
import com.jaghan.missionwatch.snapshot.SnapshotService;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Limit;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

/** The read side for launches. Responses are cached and cleared after every refresh. */
@Service
public class LaunchService {

    private static final String SCHEDULED_TIME = "scheduledTime";

    private final LaunchRepository launches;
    private final LaunchDocuments documents;
    private final SnapshotService snapshots;
    private final FreshnessService freshness;
    private final ObjectProvider<LaunchFetcher> fetcher;

    public LaunchService(
            LaunchRepository launches,
            LaunchDocuments documents,
            SnapshotService snapshots,
            FreshnessService freshness,
            ObjectProvider<LaunchFetcher> fetcher) {
        this.launches = launches;
        this.documents = documents;
        this.snapshots = snapshots;
        this.freshness = freshness;
        this.fetcher = fetcher;
    }

    @Cacheable(cacheNames = "launch-lists", key = "'upcoming:' + #limit")
    public ApiResponse<List<LaunchView>> upcoming(int limit) {
        return respond(launches.findByStatusInOrderByScheduledTimeAsc(LaunchStatus.UPCOMING, Limit.of(limit)));
    }

    @Cacheable(cacheNames = "launch-lists", key = "'previous:' + #limit")
    public ApiResponse<List<LaunchView>> previous(int limit) {
        return respond(launches.findByStatusInOrderByScheduledTimeDesc(LaunchStatus.PAST, Limit.of(limit)));
    }

    @Cacheable("launch-search")
    public ApiResponse<List<LaunchView>> search(LaunchSearch search) {
        List<Specification<LaunchEntity>> parts = new ArrayList<>();
        parts.add(matchesText(search.text()));
        parts.add(hasStatusIn(search.statuses()));
        parts.add(hasProviderIn(search.providerIds()));
        parts.add(scheduledBetween(search.from(), search.to()));
        Specification<LaunchEntity> where =
                Specification.allOf(parts.stream().filter(Objects::nonNull).toList());

        Sort.Direction direction = search.descending() ? Sort.Direction.DESC : Sort.Direction.ASC;
        // Same orderings as the frontend's sortLaunches(); ties fall back to launch time.
        Sort byTime = Sort.by(direction, SCHEDULED_TIME);
        Sort sort = switch (search.sort()) {
            case TIME -> byTime;
            case NAME -> Sort.by(direction, "name").and(Sort.by(SCHEDULED_TIME));
            case PROVIDER -> Sort.by(direction, "provider.name").and(Sort.by(SCHEDULED_TIME));
        };
        return respond(
                launches.findBy(where, q -> q.sortBy(sort).limit(search.limit()).all()));
    }

    /** The full record with its schedule history. Unknown launches are looked up at the source. */
    @Cacheable("launch-detail")
    public ApiResponse<LaunchView> get(String externalId) {
        Optional<LaunchEntity> stored = launches.findByExternalId(externalId);
        LaunchView view;
        if (stored.isPresent()) {
            view = documents
                    .read(stored.get().getDocument())
                    .withScheduleHistory(snapshots.history(stored.get().getId()));
        } else {
            LaunchFetcher source = fetcher.getIfAvailable();
            view = (source == null ? Optional.<LaunchView>empty() : source.fetchAndStore(externalId))
                    .orElseThrow(() -> notFound(externalId));
            view = launches.findByExternalId(externalId)
                    .map(e -> documents.read(e.getDocument()).withScheduleHistory(snapshots.history(e.getId())))
                    .orElse(view);
        }
        return ApiResponse.of(view, meta());
    }

    /** Every observed schedule of the launch, oldest first (FR-07). */
    public ApiResponse<List<LaunchSnapshotView>> history(String externalId) {
        LaunchEntity launch = launches.findByExternalId(externalId).orElseThrow(() -> notFound(externalId));
        return ApiResponse.of(snapshots.history(launch.getId()), meta());
    }

    private ApiResponse<List<LaunchView>> respond(List<LaunchEntity> entities) {
        return ApiResponse.of(
                entities.stream().map(e -> documents.read(e.getDocument())).toList(), meta());
    }

    private DataMeta meta() {
        return freshness.meta(DataSources.LL2, DataSources.LL2_DISPLAY_NAME, DataSources.LL2_URL);
    }

    private static NotFoundException notFound(String externalId) {
        return new NotFoundException("Launch " + externalId + " not found.");
    }
}
