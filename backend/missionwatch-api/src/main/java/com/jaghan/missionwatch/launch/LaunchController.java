package com.jaghan.missionwatch.launch;

import com.jaghan.missionwatch.common.ApiResponse;
import com.jaghan.missionwatch.launch.model.LaunchView;
import com.jaghan.missionwatch.snapshot.LaunchSnapshotView;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Launch endpoints (SRS §8.1, docs/api.md). */
@RestController
@RequestMapping("/api/launches")
@Tag(name = "Launches")
public class LaunchController {

    private final LaunchService launches;

    public LaunchController(LaunchService launches) {
        this.launches = launches;
    }

    @GetMapping("/upcoming")
    @Operation(summary = "Upcoming launches, soonest first")
    public ApiResponse<List<LaunchView>> upcoming(
            @RequestParam(defaultValue = "50") @Min(1) @Max(LaunchSearch.MAX_LIMIT) int limit) {
        return launches.upcoming(limit);
    }

    @GetMapping("/previous")
    @Operation(summary = "Past launches, most recent first")
    public ApiResponse<List<LaunchView>> previous(
            @RequestParam(defaultValue = "50") @Min(1) @Max(LaunchSearch.MAX_LIMIT) int limit) {
        return launches.previous(limit);
    }

    @GetMapping("/search")
    @Operation(summary = "Search and filter stored launches (FR-02)")
    public ApiResponse<List<LaunchView>> search(
            @Parameter(description = "Matches launch, mission, provider or rocket name") @RequestParam(required = false)
                    String q,
            @Parameter(description = "Status codes, e.g. go, hold, success") @RequestParam(required = false)
                    List<String> status,
            @Parameter(description = "Provider ids") @RequestParam(required = false) List<String> provider,
            @Parameter(description = "Inclusive UTC date, yyyy-mm-dd") @RequestParam(required = false) String from,
            @Parameter(description = "Inclusive UTC date, yyyy-mm-dd") @RequestParam(required = false) String to,
            @Parameter(description = "time, name or provider") @RequestParam(required = false) String sort,
            @Parameter(description = "asc or desc") @RequestParam(required = false) String direction,
            @RequestParam(defaultValue = "100") int limit) {
        return launches.search(LaunchSearch.parse(q, status, provider, from, to, sort, direction, limit));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Mission details with schedule history (FR-03)")
    public ApiResponse<LaunchView> get(@PathVariable String id) {
        return launches.get(id);
    }

    @GetMapping("/{id}/history")
    @Operation(summary = "Observed schedule snapshots, oldest first (FR-07)")
    public ApiResponse<List<LaunchSnapshotView>> history(@PathVariable String id) {
        return launches.history(id);
    }
}
