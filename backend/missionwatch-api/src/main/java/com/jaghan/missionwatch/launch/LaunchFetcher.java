package com.jaghan.missionwatch.launch;

import com.jaghan.missionwatch.launch.model.LaunchView;
import java.util.Optional;

/**
 * Loads a launch that is not stored yet (e.g. an older mission opened by a deep link), stores it,
 * and returns it. Implemented by the source adapter (ingest.ll2), so this package stays free of
 * source-specific types.
 */
public interface LaunchFetcher {

    /**
     * @return empty when the source does not know the launch
     * @throws com.jaghan.missionwatch.common.ApiExceptions.UpstreamUnavailableException when the
     *     source cannot be reached
     */
    Optional<LaunchView> fetchAndStore(String externalId);
}
