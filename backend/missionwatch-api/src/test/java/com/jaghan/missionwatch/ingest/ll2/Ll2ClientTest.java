package com.jaghan.missionwatch.ingest.ll2;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withResourceNotFound;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.jaghan.missionwatch.Fixtures;
import java.time.Clock;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class Ll2ClientTest {

    private static final String BASE = "https://ll2.test/2.3.0";

    private MockRestServiceServer server;
    private RestClient.Builder builder;

    @BeforeEach
    void setUp() {
        builder = RestClient.builder().baseUrl(BASE).defaultHeader("User-Agent", "MissionWatch-test");
        server = MockRestServiceServer.bindTo(builder).build();
    }

    private Ll2Client client(int budget) {
        return new Ll2Client(builder.build(), new RateBudget(budget, Clock.systemUTC()), 40);
    }

    @Test
    void requestsDetailedListsAndReturnsTheRawRecords() {
        server.expect(requestTo(BASE + "/launches/upcoming/?mode=detailed&limit=40&hide_recent_previous=true"))
                .andExpect(header("User-Agent", "MissionWatch-test"))
                .andRespond(withSuccess(Fixtures.ll2Page(Fixtures.ll2Launch()), MediaType.APPLICATION_JSON));

        var records = client(5).list(Ll2Client.ListKind.UPCOMING);

        assertThat(records).hasSize(1);
        assertThat(records.getFirst().get("id").asString()).isEqualTo(Fixtures.LAUNCH_ID);
        server.verify();
    }

    @Test
    void reportsUnknownLaunchesAsEmpty() {
        server.expect(requestTo(BASE + "/launches/nope/?mode=detailed")).andRespond(withResourceNotFound());
        assertThat(client(5).launch("nope")).isEmpty();
    }

    @Test
    void turnsRateLimitingIntoAReadableError() {
        server.expect(requestTo(BASE + "/launches/previous/?mode=detailed&limit=40"))
                .andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS));
        assertThatThrownBy(() -> client(5).list(Ll2Client.ListKind.PREVIOUS))
                .isInstanceOf(Ll2Exception.class)
                .hasMessageContaining("rate limiting");
    }

    @Test
    void rejectsResponsesWithoutAResultsList() {
        server.expect(requestTo(BASE + "/launches/previous/?mode=detailed&limit=40"))
                .andRespond(withSuccess("{\"detail\":\"odd\"}", MediaType.APPLICATION_JSON));
        assertThatThrownBy(() -> client(5).list(Ll2Client.ListKind.PREVIOUS))
                .isInstanceOf(Ll2Exception.class)
                .hasMessageContaining("unexpected");
    }

    @Test
    void stopsCallingOnceTheBudgetIsSpent() {
        server.expect(requestTo(BASE + "/launches/previous/?mode=detailed&limit=40"))
                .andRespond(withSuccess(Fixtures.ll2Page(), MediaType.APPLICATION_JSON));
        Ll2Client client = client(1);
        client.list(Ll2Client.ListKind.PREVIOUS);

        assertThatThrownBy(() -> client.list(Ll2Client.ListKind.PREVIOUS))
                .isInstanceOf(Ll2Exception.class)
                .hasMessageContaining("budget");
        server.verify();
    }
}
