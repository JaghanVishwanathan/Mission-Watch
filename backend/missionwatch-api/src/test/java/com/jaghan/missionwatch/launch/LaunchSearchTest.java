package com.jaghan.missionwatch.launch;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.jaghan.missionwatch.common.ApiExceptions.BadRequestException;
import com.jaghan.missionwatch.launch.model.LaunchStatus;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class LaunchSearchTest {

    @Test
    void parsesValidParameters() {
        LaunchSearch s = LaunchSearch.parse(
                "  starlink ",
                List.of("go", "in-flight", " "),
                List.of("121"),
                "2026-01-01",
                "2026-12-31",
                "provider",
                "DESC",
                20);
        assertThat(s.text()).isEqualTo("starlink");
        assertThat(s.statuses()).containsExactlyInAnyOrder(LaunchStatus.GO, LaunchStatus.IN_FLIGHT);
        assertThat(s.providerIds()).containsExactly("121");
        assertThat(s.from()).isEqualTo(LocalDate.of(2026, 1, 1));
        assertThat(s.sort()).isEqualTo(LaunchSearch.SortField.PROVIDER);
        assertThat(s.descending()).isTrue();
    }

    @Test
    void defaultsToTimeAscending() {
        LaunchSearch s = LaunchSearch.parse(null, null, null, null, null, null, null, 100);
        assertThat(s.text()).isNull();
        assertThat(s.statuses()).isEmpty();
        assertThat(s.sort()).isEqualTo(LaunchSearch.SortField.TIME);
        assertThat(s.descending()).isFalse();
    }

    @Test
    void rejectsInvalidParametersWithClearMessages() {
        assertThatThrownBy(() -> LaunchSearch.parse(null, List.of("launched"), null, null, null, null, null, 10))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("launched");
        assertThatThrownBy(() -> LaunchSearch.parse(null, null, null, "13/01/2026", null, null, null, 10))
                .hasMessageContaining("yyyy-mm-dd");
        assertThatThrownBy(() -> LaunchSearch.parse(null, null, null, "2026-02-01", "2026-01-01", null, null, 10))
                .hasMessageContaining("after");
        assertThatThrownBy(() -> LaunchSearch.parse(null, null, null, null, null, "rocket", null, 10))
                .hasMessageContaining("sort");
        assertThatThrownBy(() -> LaunchSearch.parse(null, null, null, null, null, null, "up", 10))
                .hasMessageContaining("direction");
        assertThatThrownBy(() -> LaunchSearch.parse(null, null, null, null, null, null, null, 0))
                .hasMessageContaining("limit");
    }
}
