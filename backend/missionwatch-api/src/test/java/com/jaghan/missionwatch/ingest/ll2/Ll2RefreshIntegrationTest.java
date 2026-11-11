package com.jaghan.missionwatch.ingest.ll2;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jaghan.missionwatch.DatabaseIntegrationTest;
import com.jaghan.missionwatch.Fixtures;
import com.jaghan.missionwatch.freshness.RefreshOutcome;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.JsonNode;

/**
 * End to end against MySQL: LL2 records go through the refresh into the database (Flyway
 * schema, JSON documents, snapshots) and come back out of the HTTP API. Only the LL2 client is
 * stubbed.
 */
@AutoConfigureMockMvc
class Ll2RefreshIntegrationTest extends DatabaseIntegrationTest {

    private static final String ID_A = "aaaaaaaa-0000-0000-0000-000000000001";
    private static final String ID_B = "bbbbbbbb-0000-0000-0000-000000000002";

    @Autowired
    Ll2RefreshService refresh;

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcTemplate jdbc;

    @MockitoBean
    Ll2Client client;

    private void upcoming(JsonNode... records) {
        given(client.list(Ll2Client.ListKind.UPCOMING)).willReturn(List.of(records));
    }

    private int snapshotsOf(String externalId) {
        return jdbc.queryForObject(
                "select count(*) from launch_snapshot s join launch l on l.id = s.launch_id where l.external_id = ?",
                Integer.class,
                externalId);
    }

    @Test
    void storesLaunchesIdempotentlyAndTracksScheduleChanges() throws Exception {
        JsonNode invalid = Fixtures.ll2Launch("cccccccc-0000-0000-0000-000000000003", "not a date", 1, "Go");
        upcoming(
                Fixtures.ll2Launch(ID_A, "2026-12-01T10:00:00Z", 1, "Go"),
                Fixtures.ll2Launch(ID_B, "2026-12-05T10:00:00Z", 8, "TBC"),
                invalid);

        RefreshOutcome first = refresh.refresh(Ll2Client.ListKind.UPCOMING);
        assertThat(first.succeeded()).isTrue();
        assertThat(first.stored()).isEqualTo(2);
        assertThat(first.skipped()).isEqualTo(1);

        // The same data again changes nothing.
        refresh.refresh(Ll2Client.ListKind.UPCOMING);
        assertThat(jdbc.queryForObject(
                        "select count(*) from launch where external_id in (?, ?)", Integer.class, ID_A, ID_B))
                .isEqualTo(2);
        assertThat(snapshotsOf(ID_A)).isEqualTo(1);

        // A slip is recorded as a new snapshot.
        upcoming(
                Fixtures.ll2Launch(ID_A, "2026-12-02T10:00:00Z", 5, "Hold"),
                Fixtures.ll2Launch(ID_B, "2026-12-05T10:00:00Z", 8, "TBC"));
        refresh.refresh(Ll2Client.ListKind.UPCOMING);
        assertThat(snapshotsOf(ID_A)).isEqualTo(2);
        assertThat(snapshotsOf(ID_B)).isEqualTo(1);

        mvc.perform(get("/api/launches/upcoming"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.id == '" + ID_A + "')].status").value("hold"))
                .andExpect(jsonPath("$.meta.source").value("Launch Library 2 (The Space Devs)"));

        mvc.perform(get("/api/launches/" + ID_A))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.rocket.specs.reusable").value(true))
                .andExpect(jsonPath("$.data.scheduleHistory.length()").value(2))
                .andExpect(jsonPath("$.data.scheduleHistory[0].scheduledTime").value("2026-12-01T10:00:00Z"))
                .andExpect(jsonPath("$.data.scheduleHistory[1].status").value("hold"));

        mvc.perform(get("/api/launches/" + ID_A + "/history"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2));

        mvc.perform(get("/api/launches/search").param("status", "tbc").param("q", "starlink"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].id").value(ID_B));

        // LIKE wildcards in the query are matched literally, not as wildcards.
        mvc.perform(get("/api/launches/search").param("q", "%"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(0));
        mvc.perform(get("/api/launches/search").param("q", "Group_15"))
                .andExpect(jsonPath("$.data.length()").value(0));
        mvc.perform(get("/api/launches/search").param("q", "GROUP 15-25"))
                .andExpect(jsonPath("$.data.length()").value(org.hamcrest.Matchers.greaterThanOrEqualTo(2)));

        mvc.perform(get("/api/launches/search").param("from", "2026-12-03").param("to", "2026-12-31"))
                .andExpect(jsonPath("$.data[*].id").value(org.hamcrest.Matchers.hasItem(ID_B)))
                .andExpect(
                        jsonPath("$.data[*].id").value(org.hamcrest.Matchers.not(org.hamcrest.Matchers.hasItem(ID_A))));

        mvc.perform(get("/api/providers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.id == '121')].name").value("SpaceX"));
    }

    @Test
    void keepsServingStoredDataWhenARefreshFailsAndSaysSo() throws Exception {
        String id = "eeeeeeee-0000-0000-0000-000000000005";
        upcoming(Fixtures.ll2Launch(id, "2026-12-01T10:00:00Z", 1, "Go"));
        refresh.refresh(Ll2Client.ListKind.UPCOMING);
        mvc.perform(get("/api/launches/" + id))
                .andExpect(jsonPath("$.meta.stale").doesNotExist());

        given(client.list(Ll2Client.ListKind.UPCOMING))
                .willThrow(new Ll2Exception("Launch Library 2 could not be reached."));
        RefreshOutcome failed = refresh.refresh(Ll2Client.ListKind.UPCOMING);
        assertThat(failed.succeeded()).isFalse();

        mvc.perform(get("/api/launches/" + id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.meta.stale").value(true))
                .andExpect(jsonPath("$.meta.warnings[0]")
                        .value(org.hamcrest.Matchers.containsString("could not be reached")));
    }

    @Test
    void looksUpUnknownLaunchesAtTheSourceOnce() throws Exception {
        String id = "dddddddd-0000-0000-0000-000000000004";
        given(client.launch(id)).willReturn(Optional.of(Fixtures.ll2Launch(id, "2020-05-30T19:22:45Z", 3, "Success")));
        given(client.launch("unknown")).willReturn(Optional.empty());

        mvc.perform(get("/api/launches/" + id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("success"));
        assertThat(jdbc.queryForObject("select count(*) from launch where external_id = ?", Integer.class, id))
                .isEqualTo(1);

        mvc.perform(get("/api/launches/unknown")).andExpect(status().isNotFound());
    }
}
