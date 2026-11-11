package com.jaghan.missionwatch.provider;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * A provider as served by the API, matching the frontend {@code Provider} model. {@code id} is the
 * source identifier, so links and filters stay stable across database rebuilds.
 *
 * @param type 'commercial', 'government' or 'multinational'
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ProviderView(String id, String externalId, String name, String abbrev, String countryCode, String type) {}
