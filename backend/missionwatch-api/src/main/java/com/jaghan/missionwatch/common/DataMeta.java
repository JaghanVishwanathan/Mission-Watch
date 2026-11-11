package com.jaghan.missionwatch.common;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;
import java.util.List;

/**
 * Provenance that travels with every payload (SRS §5.7, §8.2). Field names match the frontend's
 * {@code DataMeta} model so the Angular adapter can pass it through unchanged.
 *
 * @param lastRefresh when the data was last fetched successfully from its source
 * @param stale true when the latest refresh failed or the data is older than the freshness limit
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record DataMeta(
        String source,
        String sourceUrl,
        Instant lastRefresh,
        List<String> warnings,
        @JsonProperty("isMock") boolean isMock,
        Boolean stale) {

    public DataMeta {
        warnings = List.copyOf(warnings);
    }
}
