package com.jaghan.missionwatch.provider;

import com.jaghan.missionwatch.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/providers")
@Tag(name = "Providers")
public class ProviderController {

    private final ProviderService providers;

    public ProviderController(ProviderService providers) {
        this.providers = providers;
    }

    @GetMapping
    @Operation(summary = "Launch providers seen in the stored launches, by name")
    public ApiResponse<List<ProviderView>> list() {
        return providers.list();
    }
}
