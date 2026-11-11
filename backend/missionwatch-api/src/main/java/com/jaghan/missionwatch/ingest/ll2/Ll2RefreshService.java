package com.jaghan.missionwatch.ingest.ll2;

import com.jaghan.missionwatch.common.ApiExceptions.UpstreamUnavailableException;
import com.jaghan.missionwatch.common.DataSources;
import com.jaghan.missionwatch.freshness.FreshnessService;
import com.jaghan.missionwatch.freshness.RefreshOutcome;
import com.jaghan.missionwatch.launch.LaunchFetcher;
import com.jaghan.missionwatch.launch.LaunchStore;
import com.jaghan.missionwatch.launch.model.LaunchView;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Pulls launches from Launch Library 2 into the database: fetch, validate and map, upsert, then
 * record the outcome. A failed refresh never removes stored data; responses are flagged stale
 * instead (NFR-02).
 */
@Service
public class Ll2RefreshService implements LaunchFetcher {

    private static final Logger log = LoggerFactory.getLogger(Ll2RefreshService.class);

    private final Ll2Client client;
    private final LaunchStore store;
    private final FreshnessService freshness;
    private final JsonMapper json;
    private final Clock clock;

    public Ll2RefreshService(
            Ll2Client client, LaunchStore store, FreshnessService freshness, JsonMapper json, Clock clock) {
        this.client = client;
        this.store = store;
        this.freshness = freshness;
        this.json = json;
        this.clock = clock;
    }

    public RefreshOutcome refresh(Ll2Client.ListKind kind) {
        String job = "ll2-" + kind.path();
        Instant started = clock.instant();
        RefreshOutcome outcome;
        try {
            List<JsonNode> records = client.list(kind);
            int stored = 0;
            int skipped = 0;
            for (JsonNode record : records) {
                if (store(record, started).isPresent()) stored++;
                else skipped++;
            }
            outcome = RefreshOutcome.success(DataSources.LL2, job, started, clock.instant(), stored, skipped);
            log.info("{}: stored {} launches, skipped {}", job, stored, skipped);
        } catch (Ll2Exception e) {
            outcome = RefreshOutcome.failure(DataSources.LL2, job, started, clock.instant(), e.getMessage());
            log.warn("{} failed: {}", job, e.getMessage());
        }
        freshness.record(outcome);
        // After recording: cached responses carry data and freshness metadata, so clear them
        // after failures too.
        store.evictCaches();
        return outcome;
    }

    /** On-demand lookup for a launch that is not stored yet (e.g. an old mission's deep link). */
    @Override
    public Optional<LaunchView> fetchAndStore(String externalId) {
        try {
            Optional<LaunchView> view = client.launch(externalId).flatMap(r -> store(r, clock.instant()));
            view.ifPresent(v -> store.evictCaches());
            return view;
        } catch (Ll2Exception e) {
            throw new UpstreamUnavailableException(e.getMessage(), e);
        }
    }

    /** Maps and stores one record. Empty when it is invalid; one bad record never stops a batch. */
    private Optional<LaunchView> store(JsonNode record, Instant observedAt) {
        try {
            Ll2Launch raw = json.treeToValue(record, Ll2Launch.class);
            Optional<LaunchView> view = Ll2Mapper.map(raw, Ll2Mapper.FULL);
            view.ifPresent(v -> store.upsert(v, record.toString(), DataSources.LL2, observedAt));
            return view;
        } catch (JacksonException e) {
            log.warn("Skipping unreadable LL2 record: {}", e.getOriginalMessage());
            return Optional.empty();
        } catch (RuntimeException e) {
            log.warn("Skipping LL2 record that could not be stored", e);
            return Optional.empty();
        }
    }
}
