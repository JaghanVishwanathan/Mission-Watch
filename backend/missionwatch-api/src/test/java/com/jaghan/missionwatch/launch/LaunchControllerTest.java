package com.jaghan.missionwatch.launch;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jaghan.missionwatch.Fixtures;
import com.jaghan.missionwatch.common.ApiExceptions.NotFoundException;
import com.jaghan.missionwatch.common.ApiResponse;
import com.jaghan.missionwatch.common.DataMeta;
import com.jaghan.missionwatch.config.SecurityConfig;
import com.jaghan.missionwatch.ingest.ll2.Ll2Launch;
import com.jaghan.missionwatch.ingest.ll2.Ll2Mapper;
import com.jaghan.missionwatch.launch.model.LaunchView;
import com.jaghan.missionwatch.provider.ProviderController;
import com.jaghan.missionwatch.provider.ProviderService;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/** The HTTP contract: envelope, error shape, validation, security and CORS. */
@WebMvcTest(controllers = {LaunchController.class, ProviderController.class})
@Import({SecurityConfig.class, LaunchControllerTest.TestClock.class})
class LaunchControllerTest {

    @TestConfiguration(proxyBeanMethods = false)
    static class TestClock {
        @Bean
        Clock clock() {
            return Clock.systemUTC();
        }
    }

    private static final DataMeta META = new DataMeta(
            "Launch Library 2 (The Space Devs)",
            "https://thespacedevs.com/llapi",
            Instant.parse("2026-11-11T10:00:00Z"),
            List.of(),
            false,
            null);

    @Autowired
    MockMvc mvc;

    @MockitoBean
    LaunchService launches;

    @MockitoBean
    ProviderService providers;

    private static LaunchView launch() {
        Ll2Launch raw = Fixtures.JSON.treeToValue(Fixtures.ll2Launch(), Ll2Launch.class);
        return Ll2Mapper.map(raw, Ll2Mapper.FULL).orElseThrow();
    }

    @Test
    void servesLaunchesInTheDataMetaEnvelope() throws Exception {
        given(launches.upcoming(50)).willReturn(ApiResponse.of(List.of(launch()), META));

        mvc.perform(get("/api/launches/upcoming"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id").value(Fixtures.LAUNCH_ID))
                .andExpect(jsonPath("$.data[0].status").value("go"))
                .andExpect(jsonPath("$.data[0].provider.name").value("SpaceX"))
                .andExpect(jsonPath("$.data[0].scheduledTime").value("2026-10-13T00:11:47Z"))
                // Missing values are omitted, never sent as null.
                .andExpect(jsonPath("$.data[0].timePrecision").doesNotExist())
                .andExpect(jsonPath("$.meta.isMock").value(false))
                .andExpect(jsonPath("$.meta.lastRefresh").value("2026-11-11T10:00:00Z"))
                .andExpect(jsonPath("$.meta.stale").doesNotExist());
    }

    @Test
    void answersUnknownLaunchesWithTheDocumentedErrorShape() throws Exception {
        given(launches.get("nope")).willThrow(new NotFoundException("Launch nope not found."));

        mvc.perform(get("/api/launches/nope"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error").value("NOT_FOUND"))
                .andExpect(jsonPath("$.message").value("Launch nope not found."))
                .andExpect(jsonPath("$.path").value("/api/launches/nope"))
                .andExpect(jsonPath("$.timestamp").exists());
    }

    @Test
    void rejectsInvalidParameters() throws Exception {
        mvc.perform(get("/api/launches/search").param("status", "launched"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("BAD_REQUEST"))
                .andExpect(jsonPath("$.message").value("Unknown status 'launched'."));
        mvc.perform(get("/api/launches/upcoming").param("limit", "0")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/launches/upcoming").param("limit", "many")).andExpect(status().isBadRequest());
    }

    @Test
    void passesParsedSearchCriteriaToTheService() throws Exception {
        given(launches.search(any())).willReturn(ApiResponse.of(List.of(), META));
        mvc.perform(get("/api/launches/search").param("q", "starlink").param("status", "go", "hold"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    void allowsOnlyReadRequests() throws Exception {
        mvc.perform(post("/api/launches/upcoming")).andExpect(status().isForbidden());
    }

    @Test
    void allowsTheFrontendOrigins() throws Exception {
        mvc.perform(options("/api/launches/upcoming")
                        .header(HttpHeaders.ORIGIN, "https://missionwatch.jaghan.com")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "https://missionwatch.jaghan.com"));
        mvc.perform(options("/api/launches/upcoming")
                        .header(HttpHeaders.ORIGIN, "https://evil.example")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET"))
                .andExpect(status().isForbidden());
    }
}
