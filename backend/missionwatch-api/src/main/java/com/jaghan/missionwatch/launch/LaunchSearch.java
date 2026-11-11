package com.jaghan.missionwatch.launch;

import com.jaghan.missionwatch.common.ApiExceptions.BadRequestException;
import com.jaghan.missionwatch.launch.model.LaunchStatus;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;

/**
 * Validated search criteria (FR-02). Mirrors the frontend {@code LaunchQuery}. Being a value
 * record, it also serves as the cache key.
 *
 * @param from inclusive UTC date
 * @param to inclusive UTC date
 */
public record LaunchSearch(
        String text,
        Set<LaunchStatus> statuses,
        Set<String> providerIds,
        LocalDate from,
        LocalDate to,
        SortField sort,
        boolean descending,
        int limit) {

    public static final int MAX_LIMIT = 200;

    public enum SortField {
        TIME,
        NAME,
        PROVIDER
    }

    /** Parses raw request parameters, rejecting anything invalid with a clear message. */
    public static LaunchSearch parse(
            String text,
            Collection<String> statuses,
            Collection<String> providerIds,
            String from,
            String to,
            String sort,
            String direction,
            int limit) {
        if (limit < 1 || limit > MAX_LIMIT) {
            throw new BadRequestException("limit must be between 1 and " + MAX_LIMIT + ".");
        }
        Set<LaunchStatus> parsedStatuses = nonBlank(statuses).stream()
                .map(code -> LaunchStatus.fromCode(code)
                        .orElseThrow(() -> new BadRequestException("Unknown status '" + code + "'.")))
                .collect(Collectors.toCollection(TreeSet::new));
        LocalDate fromDate = date("from", from);
        LocalDate toDate = date("to", to);
        if (fromDate != null && toDate != null && fromDate.isAfter(toDate)) {
            throw new BadRequestException("from must not be after to.");
        }
        SortField sortField = sortField(sort);
        boolean descending = switch (direction == null ? "asc" : direction.toLowerCase(Locale.ROOT)) {
            case "asc" -> false;
            case "desc" -> true;
            default -> throw new BadRequestException("direction must be 'asc' or 'desc'.");
        };
        String trimmed = text == null || text.isBlank() ? null : text.trim();
        return new LaunchSearch(
                trimmed,
                parsedStatuses,
                new TreeSet<>(nonBlank(providerIds)),
                fromDate,
                toDate,
                sortField,
                descending,
                limit);
    }

    private static List<String> nonBlank(Collection<String> values) {
        return values == null
                ? List.of()
                : values.stream()
                        .filter(v -> v != null && !v.isBlank())
                        .map(String::trim)
                        .toList();
    }

    private static LocalDate date(String name, String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return LocalDate.parse(value.trim());
        } catch (DateTimeParseException e) {
            throw new BadRequestException(name + " must be a date in the form yyyy-mm-dd.");
        }
    }

    private static SortField sortField(String sort) {
        if (sort == null || sort.isBlank()) return SortField.TIME;
        try {
            return SortField.valueOf(sort.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("sort must be 'time', 'name' or 'provider'.");
        }
    }
}
