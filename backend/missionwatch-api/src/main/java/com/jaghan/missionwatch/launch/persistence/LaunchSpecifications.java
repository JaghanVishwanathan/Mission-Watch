package com.jaghan.missionwatch.launch.persistence;

import com.jaghan.missionwatch.launch.model.LaunchStatus;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Collection;
import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

/** Composable query parts for launch search (FR-02). Each returns null when it does not apply. */
public final class LaunchSpecifications {

    private LaunchSpecifications() {}

    /**
     * Case-insensitive match on launch and mission name, provider name and abbreviation, rocket
     * name and family: the same fields as the frontend's matchesText().
     */
    public static Specification<LaunchEntity> matchesText(String text) {
        if (text == null) return null;
        String pattern = "%" + escapeLike(text.toLowerCase(Locale.ROOT)) + "%";
        return (root, query, cb) -> {
            var provider = root.join("provider");
            var rocket = root.join("rocket");
            return cb.or(
                    cb.like(cb.lower(root.get("name")), pattern, ESCAPE),
                    cb.like(cb.lower(root.get("missionName")), pattern, ESCAPE),
                    cb.like(cb.lower(provider.get("name")), pattern, ESCAPE),
                    cb.like(cb.lower(provider.get("abbrev")), pattern, ESCAPE),
                    cb.like(cb.lower(rocket.get("name")), pattern, ESCAPE),
                    cb.like(cb.lower(rocket.get("family")), pattern, ESCAPE));
        };
    }

    public static Specification<LaunchEntity> hasStatusIn(Collection<LaunchStatus> statuses) {
        if (statuses == null || statuses.isEmpty()) return null;
        return (root, query, cb) -> root.get("status").in(statuses);
    }

    public static Specification<LaunchEntity> hasProviderIn(Collection<String> providerExternalIds) {
        if (providerExternalIds == null || providerExternalIds.isEmpty()) return null;
        return (root, query, cb) -> root.join("provider").get("externalId").in(providerExternalIds);
    }

    /** Inclusive UTC date range on the scheduled time. */
    public static Specification<LaunchEntity> scheduledBetween(LocalDate from, LocalDate to) {
        if (from == null && to == null) return null;
        Instant start = from == null ? null : from.atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant end = to == null ? null : to.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC);
        return (root, query, cb) -> {
            var time = root.<Instant>get("scheduledTime");
            if (start == null) return cb.lessThan(time, end);
            if (end == null) return cb.greaterThanOrEqualTo(time, start);
            return cb.and(cb.greaterThanOrEqualTo(time, start), cb.lessThan(time, end));
        };
    }

    /**
     * LIKE escape character. Not a backslash: MySQL also treats backslashes as escapes inside
     * string literals, which makes them unreliable here.
     */
    private static final char ESCAPE = '!';

    private static String escapeLike(String value) {
        return value.replace("!", "!!").replace("%", "!%").replace("_", "!_");
    }
}
