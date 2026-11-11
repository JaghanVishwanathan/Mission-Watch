package com.jaghan.missionwatch.ingest.ll2;

import com.jaghan.missionwatch.launch.model.LaunchStatus;
import com.jaghan.missionwatch.launch.model.LaunchView;
import com.jaghan.missionwatch.provider.ProviderView;
import java.net.URI;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import java.util.stream.Stream;

/**
 * Validates and normalises Launch Library 2 records into {@link LaunchView}. A Java port of the
 * frontend's ll2-mapper.ts; keep the two in step. Records missing required fields are rejected so
 * one bad record never breaks a page (SRS §5.7).
 */
public final class Ll2Mapper {

    public static final String SUMMARY = "summary";
    public static final String FULL = "full";

    private Ll2Mapper() {}

    /** LL2 status abbreviations, then ids, to internal statuses (SRS §5.7). */
    private static final Map<String, LaunchStatus> STATUS_BY_ABBREV = Map.of(
            "go", LaunchStatus.GO,
            "tbd", LaunchStatus.TBD,
            "tbc", LaunchStatus.TBC,
            "hold", LaunchStatus.HOLD,
            "in flight", LaunchStatus.IN_FLIGHT,
            "deployed", LaunchStatus.DEPLOYED,
            "success", LaunchStatus.SUCCESS,
            "failure", LaunchStatus.FAILURE,
            "partial failure", LaunchStatus.PARTIAL_FAILURE);

    private static final Map<Integer, LaunchStatus> STATUS_BY_ID = Map.of(
            1, LaunchStatus.GO,
            2, LaunchStatus.TBD,
            3, LaunchStatus.SUCCESS,
            4, LaunchStatus.FAILURE,
            5, LaunchStatus.HOLD,
            6, LaunchStatus.IN_FLIGHT,
            7, LaunchStatus.PARTIAL_FAILURE,
            8, LaunchStatus.TBC,
            9, LaunchStatus.DEPLOYED);

    /** First match wins. */
    private static final Map<Pattern, String> CATEGORY_RULES = categoryRules();

    private static Map<Pattern, String> categoryRules() {
        Map<Pattern, String> rules = new LinkedHashMap<>();
        rules.put(ci("human|crew|tourism"), "human-spaceflight");
        rules.put(ci("resupply|cargo"), "resupply");
        rules.put(ci("communication"), "communications");
        rules.put(ci("earth science|earth observation|meteorolog"), "earth-observation");
        rules.put(ci("navigation"), "navigation");
        rules.put(ci("planetary|astrophysics|heliophysics|science|lunar|robotic exploration"), "science");
        rules.put(ci("government|military|top secret"), "government");
        rules.put(ci("test|technology|demonstrat"), "technology");
        return rules;
    }

    private static final Set<String> EXACT_PRECISIONS = Set.of("second", "minute");

    private static final Pattern DURATION = Pattern.compile(
            "^(-)?P(?:(\\d+(?:\\.\\d+)?)D)?(?:T(?:(\\d+(?:\\.\\d+)?)H)?(?:(\\d+(?:\\.\\d+)?)M)?(?:(\\d+(?:\\.\\d+)?)S)?)?$");

    public static Optional<LaunchStatus> mapStatus(Ll2Launch.Named status) {
        if (status == null) return Optional.empty();
        String abbrev = status.abbrev() == null ? "" : status.abbrev().trim().toLowerCase(Locale.ROOT);
        LaunchStatus byAbbrev = STATUS_BY_ABBREV.get(abbrev);
        if (byAbbrev != null) return Optional.of(byAbbrev);
        return Optional.ofNullable(status.id() == null ? null : STATUS_BY_ID.get(status.id()));
    }

    public static String mapCategory(String missionType) {
        if (missionType == null) return null;
        return CATEGORY_RULES.entrySet().stream()
                .filter(rule -> rule.getKey().matcher(missionType).find())
                .map(Map.Entry::getValue)
                .findFirst()
                .orElse(null);
    }

    public static boolean isExactTime(String precision) {
        return precision == null || EXACT_PRECISIONS.contains(precision.toLowerCase(Locale.ROOT));
    }

    /** ISO-8601 duration with optional sign ("-PT38M", "PT2M30S", "P1DT2H") to seconds. */
    public static Integer parseDuration(String value) {
        if (value == null) return null;
        String v = value.trim();
        if (v.equals("P") || v.equals("-P")) return null;
        Matcher m = DURATION.matcher(v);
        if (!m.matches()) return null;
        double total =
                number(m.group(2)) * 86_400 + number(m.group(3)) * 3600 + number(m.group(4)) * 60 + number(m.group(5));
        return (int) Math.round(m.group(1) != null ? -total : total);
    }

    /** Maps one record. Empty when a required field is missing or invalid. */
    public static Optional<LaunchView> map(Ll2Launch raw, String detailLevel) {
        if (raw == null) return Optional.empty();
        Optional<LaunchStatus> status = mapStatus(raw.status());
        String net = validDate(raw.net());
        Ll2Launch.Agency provider = raw.launchServiceProvider();
        Ll2Launch.LauncherConfig config =
                raw.rocket() == null ? null : raw.rocket().configuration();
        Ll2Launch.Pad pad = raw.pad();
        if (str(raw.id()) == null
                || str(raw.name()) == null
                || status.isEmpty()
                || net == null
                || provider == null
                || provider.id() == null
                || str(provider.name()) == null
                || config == null
                || config.id() == null
                || str(config.name()) == null
                || pad == null
                || pad.id() == null
                || str(pad.name()) == null) {
            return Optional.empty();
        }

        Ll2Launch.Mission mission = raw.mission();
        String[] nameParts = raw.name().split("\\|");
        String missionName = Optional.ofNullable(mission == null ? null : str(mission.name()))
                .orElse(nameParts[nameParts.length - 1].trim());
        String precision =
                raw.netPrecision() == null ? null : str(raw.netPrecision().name());
        String providerId = String.valueOf(provider.id());

        return Optional.of(new LaunchView(
                raw.id(),
                raw.id(),
                raw.name(),
                missionName,
                mission == null ? null : str(mission.description()),
                mapCategory(mission == null ? null : mission.type()),
                mission == null ? null : str(mission.type()),
                net,
                precision != null && !isExactTime(precision) ? precision : null,
                validDate(raw.windowStart()),
                validDate(raw.windowEnd()),
                status.get(),
                provider(provider),
                new LaunchView.Rocket(
                        String.valueOf(config.id()),
                        Optional.ofNullable(str(config.fullName())).orElse(config.name()),
                        config.families() == null || config.families().isEmpty()
                                ? null
                                : config.families().getFirst().name(),
                        str(config.variant()),
                        providerId,
                        FULL.equals(detailLevel)
                                ? new LaunchView.RocketSpecs(
                                        config.length(),
                                        config.diameter(),
                                        config.leoCapacity(),
                                        config.maxStage() == null ? null : (int) Math.round(config.maxStage()),
                                        config.reusable())
                                : null),
                site(pad),
                payload(mission),
                raw.image() == null ? null : str(raw.image().imageUrl()),
                raw.image() == null
                        ? null
                        : Optional.ofNullable(str(raw.image().thumbnailUrl()))
                                .orElse(str(raw.image().imageUrl())),
                imageCredit(raw.image()),
                links(raw, mission),
                milestones(raw),
                null,
                updates(raw.updates()),
                Optional.ofNullable(validDate(raw.lastUpdated())).orElse(net),
                detailLevel));
    }

    /** Maps a page; the count of rejected records is reported as a data-quality warning. */
    public record MappedPage(List<LaunchView> launches, int skipped) {}

    public static MappedPage mapPage(List<Ll2Launch> results, String detailLevel) {
        List<LaunchView> launches = new ArrayList<>();
        int skipped = 0;
        for (Ll2Launch raw : results == null ? List.<Ll2Launch>of() : results) {
            Optional<LaunchView> mapped = map(raw, detailLevel);
            if (mapped.isPresent()) launches.add(mapped.get());
            else skipped++;
        }
        return new MappedPage(launches, skipped);
    }

    // ── Sections ────────────────────────────────────────────────────────────

    private static ProviderView provider(Ll2Launch.Agency a) {
        String typeName = a.type() == null ? null : a.type().name();
        String type = typeName == null
                ? null
                : ci("government").matcher(typeName).find()
                        ? "government"
                        : ci("multinational").matcher(typeName).find() ? "multinational" : "commercial";
        String country = a.country() == null || a.country().isEmpty()
                ? null
                : a.country().getFirst().alpha2Code();
        String id = String.valueOf(a.id());
        return new ProviderView(id, id, a.name(), str(a.abbrev()), country, type);
    }

    private static LaunchView.Site site(Ll2Launch.Pad pad) {
        String country = pad.country() != null && pad.country().alpha2Code() != null
                ? pad.country().alpha2Code()
                : pad.location() != null && pad.location().country() != null
                        ? pad.location().country().alpha2Code()
                        : null;
        String location = pad.location() == null ? null : str(pad.location().name());
        return new LaunchView.Site(
                String.valueOf(pad.id()),
                pad.name(),
                location == null ? "Unknown location" : location,
                country,
                pad.latitude(),
                pad.longitude());
    }

    private static LaunchView.Payload payload(Ll2Launch.Mission mission) {
        if (mission == null) return null;
        String orbit = mission.orbit() == null ? null : str(mission.orbit().name());
        boolean hasAgencies = mission.agencies() != null && !mission.agencies().isEmpty();
        if (orbit == null && !hasAgencies) return null;
        String customer = hasAgencies
                ? mission.agencies().stream()
                        .map(Ll2Launch.NamedOnly::name)
                        .filter(Objects::nonNull)
                        .collect(Collectors.joining(", "))
                : null;
        return new LaunchView.Payload(
                str(mission.type()),
                customer == null || customer.isEmpty() ? null : customer,
                orbit,
                mission.orbit() == null || mission.orbit().celestialBody() == null
                        ? null
                        : str(mission.orbit().celestialBody().name()));
    }

    private static LaunchView.MediaCredit imageCredit(Ll2Launch.Image image) {
        if (image == null) return null;
        return new LaunchView.MediaCredit(
                str(image.credit()),
                image.license() == null ? null : str(image.license().name()),
                image.license() == null ? null : str(image.license().link()));
    }

    private static List<LaunchView.SourceLink> links(Ll2Launch raw, Ll2Launch.Mission mission) {
        List<Ll2Launch.Link> info =
                raw.infoUrls() != null ? raw.infoUrls() : mission == null ? null : mission.infoUrls();
        List<Ll2Launch.Link> video = raw.vidUrls() != null ? raw.vidUrls() : mission == null ? null : mission.vidUrls();
        Stream<LaunchView.SourceLink> flightClub = str(raw.flightclubUrl()) == null
                ? Stream.empty()
                : Stream.of(
                        new LaunchView.SourceLink("Flight Club trajectory simulation", raw.flightclubUrl(), "data"));
        Map<String, LaunchView.SourceLink> byUrl = new LinkedHashMap<>();
        Stream.of(links(info, "official", 4).stream(), links(video, "webcast", 3).stream(), flightClub)
                .flatMap(s -> s)
                .forEach(link -> byUrl.putIfAbsent(link.url(), link));
        return byUrl.isEmpty() ? null : List.copyOf(byUrl.values());
    }

    private static List<LaunchView.SourceLink> links(List<Ll2Launch.Link> list, String kind, int max) {
        if (list == null) return List.of();
        return list.stream()
                .filter(l -> l != null && l.url() != null && l.url().matches("^https?://.*"))
                .sorted(Comparator.comparingInt((Ll2Launch.Link l) -> l.priority() == null ? 0 : l.priority())
                        .reversed())
                .limit(max)
                .map(l -> new LaunchView.SourceLink(label(l), l.url(), kind))
                .toList();
    }

    private static String label(Ll2Launch.Link link) {
        return Stream.of(link.title(), link.publisher(), link.source())
                .map(Ll2Mapper::str)
                .filter(Objects::nonNull)
                .findFirst()
                .orElseGet(() -> URI.create(link.url()).getHost());
    }

    private static List<LaunchView.Milestone> milestones(Ll2Launch raw) {
        List<Ll2Launch.TimelineEvent> timeline = raw.timeline();
        if (timeline == null || timeline.isEmpty()) return null;
        return IntStream.range(0, timeline.size())
                .mapToObj(i -> {
                    Ll2Launch.TimelineEvent event = timeline.get(i);
                    Ll2Launch.Named type = event.type();
                    String name = type == null ? null : str(type.abbrev());
                    return new LaunchView.Milestone(
                            raw.id() + "-t" + i,
                            name == null ? "Event" : name,
                            type == null ? null : str(type.description()),
                            parseDuration(event.relativeTime()),
                            false,
                            "Launch Library 2 timeline");
                })
                .sorted(Comparator.comparingInt(m -> m.offsetSeconds() == null ? 0 : m.offsetSeconds()))
                .toList();
    }

    private static List<LaunchView.Update> updates(List<Ll2Launch.Update> updates) {
        if (updates == null || updates.isEmpty()) return null;
        List<LaunchView.Update> mapped = updates.stream()
                .filter(u -> str(u.comment()) != null && validDate(u.createdOn()) != null)
                .map(u -> new LaunchView.Update(
                        String.valueOf(u.id()),
                        u.comment().trim(),
                        u.createdOn(),
                        str(u.infoUrl()),
                        str(u.createdBy())))
                .sorted(Comparator.comparing(LaunchView.Update::createdOn).reversed())
                .toList();
        return mapped.isEmpty() ? null : mapped;
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private static Pattern ci(String regex) {
        return Pattern.compile(regex, Pattern.CASE_INSENSITIVE);
    }

    private static double number(String group) {
        return group == null ? 0 : Double.parseDouble(group);
    }

    private static String str(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    /** The value when it is a valid ISO-8601 timestamp with offset, otherwise null. */
    private static String validDate(String value) {
        if (value == null) return null;
        try {
            OffsetDateTime.parse(value);
            return value;
        } catch (DateTimeParseException e) {
            return null;
        }
    }
}
