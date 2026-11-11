package com.jaghan.missionwatch.ingest.ll2;

import static org.assertj.core.api.Assertions.assertThat;

import com.jaghan.missionwatch.Fixtures;
import com.jaghan.missionwatch.launch.model.LaunchStatus;
import com.jaghan.missionwatch.launch.model.LaunchView;
import java.util.List;
import java.util.function.Consumer;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.node.ObjectNode;

/** Same cases as the frontend's ll2-mapper.spec.ts, so both mappers agree. */
class Ll2MapperTest {

    private static Ll2Launch raw(Consumer<ObjectNode> change) {
        ObjectNode node = Fixtures.ll2Launch();
        change.accept(node);
        return Fixtures.JSON.treeToValue(node, Ll2Launch.class);
    }

    private static LaunchView full(Consumer<ObjectNode> change) {
        return Ll2Mapper.map(raw(change), Ll2Mapper.FULL).orElseThrow();
    }

    @Test
    void mapsADetailedRecordIntoTheNormalisedModel() {
        LaunchView l = full(n -> {});
        assertThat(l.missionName()).isEqualTo("Starlink Group 15-25");
        assertThat(l.status()).isEqualTo(LaunchStatus.GO);
        assertThat(l.category()).isEqualTo("communications");
        assertThat(l.timePrecision()).isNull();
        assertThat(l.provider().id()).isEqualTo("121");
        assertThat(l.provider().abbrev()).isEqualTo("SpX");
        assertThat(l.provider().countryCode()).isEqualTo("US");
        assertThat(l.provider().type()).isEqualTo("commercial");
        assertThat(l.rocket().name()).isEqualTo("Falcon 9 Block 5");
        assertThat(l.rocket().family()).isEqualTo("Falcon");
        assertThat(l.rocket().specs().heightM()).isEqualTo(70.0);
        assertThat(l.rocket().specs().leoCapacityKg()).isEqualTo(22800.0);
        assertThat(l.rocket().specs().stages()).isEqualTo(2);
        assertThat(l.rocket().specs().reusable()).isTrue();
        assertThat(l.site().latitude()).isEqualTo(34.632);
        assertThat(l.site().longitude()).isEqualTo(-120.611);
        assertThat(l.site().countryCode()).isEqualTo("US");
        assertThat(l.payload().orbit()).isEqualTo("Low Earth Orbit");
        assertThat(l.payload().destination()).isEqualTo("Earth");
        assertThat(l.imageCredit().credit()).isEqualTo("SpaceX");
        assertThat(l.imageCredit().license()).isEqualTo("CC BY-NC 2.0");
        assertThat(l.thumbnailUrl()).isEqualTo("https://example.org/thumb.jpg");
        assertThat(l.detailLevel()).isEqualTo("full");
    }

    @Test
    void ordersTheTimelineByOffsetAndMarksItSourced() {
        List<LaunchView.Milestone> m = full(n -> {}).milestones();
        assertThat(m).extracting(LaunchView.Milestone::offsetSeconds).containsExactly(-2280, 0, 519);
        assertThat(m).noneMatch(LaunchView.Milestone::estimated);
    }

    @Test
    void ordersUpdatesNewestFirstAndKeepsTheirSources() {
        List<LaunchView.Update> u = full(n -> {}).updates();
        assertThat(u.getFirst().comment()).contains("Oct 13");
        assertThat(u.getFirst().infoUrl()).isEqualTo("https://www.spacex.com/launches/sl-15-25");
    }

    @Test
    void ordersLinksByPriorityWithinEachKind() {
        List<LaunchView.SourceLink> links = full(n -> {}).links();
        assertThat(links)
                .extracting(LaunchView.SourceLink::kind)
                .containsExactly("official", "webcast", "webcast", "data");
        assertThat(links.get(1).label()).isEqualTo("Official webcast");
    }

    @Test
    void omitsRocketSpecsForSummaryRecords() {
        assertThat(Ll2Mapper.map(raw(n -> {}), Ll2Mapper.SUMMARY)
                        .orElseThrow()
                        .rocket()
                        .specs())
                .isNull();
    }

    @Test
    void keepsCoarseDatePrecision() {
        LaunchView l = full(n -> n.putObject("net_precision").put("id", 7).put("name", "Month"));
        assertThat(l.timePrecision()).isEqualTo("Month");
    }

    @Test
    void rejectsRecordsMissingRequiredFields() {
        assertThat(Ll2Mapper.map(raw(n -> n.put("net", "not a date")), Ll2Mapper.FULL))
                .isEmpty();
        assertThat(Ll2Mapper.map(raw(n -> n.putNull("status")), Ll2Mapper.FULL)).isEmpty();
        assertThat(Ll2Mapper.map(raw(n -> n.putNull("pad")), Ll2Mapper.FULL)).isEmpty();
        Ll2Mapper.MappedPage page = Ll2Mapper.mapPage(
                List.of(raw(n -> {}), raw(n -> n.put("id", "")), raw(n -> n.putNull("rocket"))), Ll2Mapper.FULL);
        assertThat(page.launches()).hasSize(1);
        assertThat(page.skipped()).isEqualTo(2);
    }

    @Test
    void toleratesMissingOptionalSections() {
        LaunchView l = full(n -> {
            for (String field :
                    List.of("mission", "image", "timeline", "updates", "info_urls", "vid_urls", "flightclub_url")) {
                n.putNull(field);
            }
        });
        assertThat(l.missionName()).isEqualTo("Starlink Group 15-25");
        assertThat(l.description()).isNull();
        assertThat(l.links()).isNull();
        assertThat(l.milestones()).isNull();
        assertThat(l.payload()).isNull();
    }

    @Test
    void mapsStatusesByAbbreviationThenById() {
        assertThat(Ll2Mapper.mapStatus(new Ll2Launch.Named(7, "x", "Partial Failure", null)))
                .contains(LaunchStatus.PARTIAL_FAILURE);
        assertThat(Ll2Mapper.mapStatus(new Ll2Launch.Named(9, "x", "Deployed", null)))
                .contains(LaunchStatus.DEPLOYED);
        assertThat(Ll2Mapper.mapStatus(new Ll2Launch.Named(6, "x", "Something new", null)))
                .contains(LaunchStatus.IN_FLIGHT);
        assertThat(Ll2Mapper.mapStatus(new Ll2Launch.Named(99, "x", "Unknown", null)))
                .isEmpty();
    }

    @Test
    void derivesCategoriesFromMissionTypes() {
        assertThat(Ll2Mapper.mapCategory("Human Exploration")).isEqualTo("human-spaceflight");
        assertThat(Ll2Mapper.mapCategory("Planetary Science")).isEqualTo("science");
        assertThat(Ll2Mapper.mapCategory("Government/Top Secret")).isEqualTo("government");
        assertThat(Ll2Mapper.mapCategory("Dedicated Rideshare")).isNull();
    }

    @Test
    void parsesSignedIsoDurations() {
        assertThat(Ll2Mapper.parseDuration("-PT38M")).isEqualTo(-2280);
        assertThat(Ll2Mapper.parseDuration("PT2M30S")).isEqualTo(150);
        assertThat(Ll2Mapper.parseDuration("P1DT2H")).isEqualTo(93600);
        assertThat(Ll2Mapper.parseDuration("PT0S")).isZero();
        assertThat(Ll2Mapper.parseDuration("nonsense")).isNull();
        assertThat(Ll2Mapper.parseDuration(null)).isNull();
    }

    @Test
    void treatsOnlySecondAndMinutePrecisionAsExact() {
        assertThat(Ll2Mapper.isExactTime(null)).isTrue();
        assertThat(Ll2Mapper.isExactTime("Minute")).isTrue();
        assertThat(Ll2Mapper.isExactTime("Hour")).isFalse();
    }
}
