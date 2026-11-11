package com.jaghan.missionwatch.freshness;

import com.jaghan.missionwatch.common.DataMeta;
import com.jaghan.missionwatch.config.MissionWatchProperties;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Records refresh attempts and turns them into response metadata, so every response says when
 * its data was last refreshed and whether it may be out of date (SRS §5.7, NFR-02).
 */
@Service
public class FreshnessService {

    private final DataRefreshRepository refreshes;
    private final Clock clock;
    private final Duration staleAfter;

    public FreshnessService(DataRefreshRepository refreshes, Clock clock, MissionWatchProperties properties) {
        this.refreshes = refreshes;
        this.clock = clock;
        this.staleAfter = properties.freshness().staleAfter();
    }

    @Transactional
    public void record(RefreshOutcome outcome) {
        refreshes.save(new DataRefreshEntity(outcome));
    }

    @Transactional(readOnly = true)
    public DataMeta meta(String source, String displayName, String sourceUrl) {
        Optional<DataRefreshEntity> lastSuccess =
                refreshes.findFirstBySourceAndSucceededTrueOrderByFinishedAtDesc(source);
        Optional<DataRefreshEntity> lastAttempt = refreshes.findFirstBySourceOrderByFinishedAtDesc(source);
        List<String> warnings = new ArrayList<>();
        Instant now = clock.instant();

        if (lastSuccess.isEmpty()) {
            warnings.add("No data has been loaded from " + displayName + " yet.");
            return new DataMeta(displayName, sourceUrl, now, warnings, false, true);
        }

        DataRefreshEntity success = lastSuccess.get();
        boolean stale = false;
        if (lastAttempt.filter(a -> !a.isSucceeded()).isPresent()) {
            stale = true;
            warnings.add("Showing saved data because the latest refresh failed. "
                    + lastAttempt.get().getMessage());
        } else if (success.getFinishedAt().plus(staleAfter).isBefore(now)) {
            stale = true;
            warnings.add("This data has not been refreshed recently.");
        }
        int skipped = success.getRecordsSkipped();
        if (skipped > 0) {
            warnings.add(skipped + (skipped == 1 ? " launch record was" : " launch records were")
                    + " incomplete and skipped.");
        }
        return new DataMeta(displayName, sourceUrl, success.getFinishedAt(), warnings, false, stale ? true : null);
    }
}
