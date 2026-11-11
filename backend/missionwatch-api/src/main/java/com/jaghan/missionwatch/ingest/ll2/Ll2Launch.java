package com.jaghan.missionwatch.ingest.ll2;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/**
 * The subset of a Launch Library 2 (v2.3.0) launch record that MissionWatch reads. Every field may
 * be missing in practice, so {@link Ll2Mapper} validates before use. Mirrors the frontend's
 * ll2-types.ts. Docs: https://ll.thespacedevs.com/docs/
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record Ll2Launch(
        String id,
        String name,
        Named status,
        @JsonProperty("last_updated") String lastUpdated,
        String net,
        @JsonProperty("net_precision") Named netPrecision,
        @JsonProperty("window_start") String windowStart,
        @JsonProperty("window_end") String windowEnd,
        Image image,
        @JsonProperty("launch_service_provider") Agency launchServiceProvider,
        Rocket rocket,
        Mission mission,
        Pad pad,
        @JsonProperty("info_urls") List<Link> infoUrls,
        @JsonProperty("vid_urls") List<Link> vidUrls,
        List<TimelineEvent> timeline,
        List<Update> updates,
        @JsonProperty("flightclub_url") String flightclubUrl) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Named(Integer id, String name, String abbrev, String description) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Country(
            String name, @JsonProperty("alpha_2_code") String alpha2Code) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record License(String name, String link) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Image(
            @JsonProperty("image_url") String imageUrl,
            @JsonProperty("thumbnail_url") String thumbnailUrl,
            String credit,
            License license) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record AgencyType(String name) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Agency(Integer id, String name, String abbrev, AgencyType type, List<Country> country) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Family(String name) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record LauncherConfig(
            Integer id,
            String name,
            @JsonProperty("full_name") String fullName,
            String variant,
            List<Family> families,
            Boolean reusable,
            Double length,
            Double diameter,
            @JsonProperty("leo_capacity") Double leoCapacity,
            @JsonProperty("max_stage") Double maxStage) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Rocket(LauncherConfig configuration) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record CelestialBody(String name) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Orbit(
            String name, @JsonProperty("celestial_body") CelestialBody celestialBody) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record NamedOnly(String name) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Mission(
            String name,
            String type,
            String description,
            Orbit orbit,
            List<NamedOnly> agencies,
            @JsonProperty("info_urls") List<Link> infoUrls,
            @JsonProperty("vid_urls") List<Link> vidUrls) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Location(String name, Country country) {}

    /** Coordinates arrive as numbers or numeric strings; Jackson coerces both. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Pad(Integer id, String name, Double latitude, Double longitude, Country country, Location location) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Link(String title, String url, String source, String publisher, Integer priority) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record TimelineEvent(
            Named type, @JsonProperty("relative_time") String relativeTime) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Update(
            Integer id,
            String comment,
            @JsonProperty("info_url") String infoUrl,
            @JsonProperty("created_by") String createdBy,
            @JsonProperty("created_on") String createdOn) {}
}
