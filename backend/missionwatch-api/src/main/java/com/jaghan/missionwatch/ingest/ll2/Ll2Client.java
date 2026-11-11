package com.jaghan.missionwatch.ingest.ll2;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import tools.jackson.databind.JsonNode;

/**
 * HTTP access to Launch Library 2. Returns raw JSON so callers can store the source record as well
 * as map it. Every call spends from the shared {@link RateBudget}.
 */
public class Ll2Client {

    public enum ListKind {
        UPCOMING("upcoming"),
        PREVIOUS("previous");

        private final String path;

        ListKind(String path) {
            this.path = path;
        }

        public String path() {
            return path;
        }
    }

    private final RestClient http;
    private final RateBudget budget;
    private final int listLimit;

    public Ll2Client(RestClient http, RateBudget budget, int listLimit) {
        this.http = http;
        this.budget = budget;
        this.listLimit = listLimit;
    }

    /** One page of launches in detailed mode, nearest first (upcoming) or most recent first. */
    public List<JsonNode> list(ListKind kind) {
        JsonNode page = call(() -> http.get()
                .uri(b -> {
                    b.path("/launches/{kind}/").queryParam("mode", "detailed").queryParam("limit", listLimit);
                    if (kind == ListKind.UPCOMING) b.queryParam("hide_recent_previous", "true");
                    return b.build(kind.path());
                })
                .retrieve()
                .body(JsonNode.class));
        JsonNode results = page == null ? null : page.get("results");
        if (results == null || !results.isArray()) {
            throw new Ll2Exception("Launch Library 2 returned an unexpected list response.");
        }
        List<JsonNode> launches = new ArrayList<>();
        results.forEach(launches::add);
        return launches;
    }

    /** One launch in detailed mode; empty when LL2 does not know the id. */
    public Optional<JsonNode> launch(String id) {
        try {
            return Optional.ofNullable(call(() -> http.get()
                    .uri("/launches/{id}/?mode=detailed", id)
                    .retrieve()
                    .body(JsonNode.class)));
        } catch (Ll2Exception e) {
            if (e.getCause() instanceof RestClientResponseException r
                    && r.getStatusCode().value() == HttpStatus.NOT_FOUND.value()) {
                return Optional.empty();
            }
            throw e;
        }
    }

    private <T> T call(java.util.function.Supplier<T> request) {
        if (!budget.tryAcquire()) {
            throw new Ll2Exception("The hourly request budget for Launch Library 2 is used up. Try again later.");
        }
        try {
            return request.get();
        } catch (RestClientResponseException e) {
            String reason = e.getStatusCode().value() == HttpStatus.TOO_MANY_REQUESTS.value()
                    ? "Launch Library 2 is rate limiting requests."
                    : "Launch Library 2 answered with HTTP " + e.getStatusCode().value() + ".";
            throw new Ll2Exception(reason, e);
        } catch (ResourceAccessException e) {
            throw new Ll2Exception("Launch Library 2 could not be reached.", e);
        }
    }
}
