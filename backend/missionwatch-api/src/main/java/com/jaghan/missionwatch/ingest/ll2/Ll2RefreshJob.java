package com.jaghan.missionwatch.ingest.ll2;

import org.springframework.boot.autoconfigure.condition.ConditionalOnBooleanProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduled refreshes. Fixed delays (not rates) mean a slow run never overlaps the next one.
 * Disable with {@code missionwatch.ll2.refresh-enabled=false}, e.g. in tests.
 */
@Component
@ConditionalOnBooleanProperty("missionwatch.ll2.refresh-enabled")
class Ll2RefreshJob {

    private final Ll2RefreshService refresh;

    Ll2RefreshJob(Ll2RefreshService refresh) {
        this.refresh = refresh;
    }

    @Scheduled(initialDelayString = "PT10S", fixedDelayString = "${missionwatch.ll2.upcoming-refresh}")
    void upcoming() {
        refresh.refresh(Ll2Client.ListKind.UPCOMING);
    }

    @Scheduled(initialDelayString = "PT40S", fixedDelayString = "${missionwatch.ll2.previous-refresh}")
    void previous() {
        refresh.refresh(Ll2Client.ListKind.PREVIOUS);
    }
}
