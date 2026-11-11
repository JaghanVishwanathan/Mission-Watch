package com.jaghan.missionwatch.provider;

import com.jaghan.missionwatch.common.ApiResponse;
import com.jaghan.missionwatch.common.DataSources;
import com.jaghan.missionwatch.freshness.FreshnessService;
import java.util.List;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProviderService {

    private final ProviderRepository providers;
    private final FreshnessService freshness;

    public ProviderService(ProviderRepository providers, FreshnessService freshness) {
        this.providers = providers;
        this.freshness = freshness;
    }

    /** Inserts or updates a provider by its source identifier. Safe to repeat. */
    @Transactional
    public ProviderEntity upsert(ProviderView view) {
        ProviderEntity entity =
                providers.findByExternalId(view.externalId()).orElseGet(() -> new ProviderEntity(view.externalId()));
        entity.update(view);
        return providers.save(entity);
    }

    @Cacheable("providers")
    @Transactional(readOnly = true)
    public ApiResponse<List<ProviderView>> list() {
        List<ProviderView> all = providers.findAllByOrderByNameAsc().stream()
                .map(ProviderEntity::toView)
                .toList();
        return ApiResponse.of(all, freshness.meta(DataSources.LL2, DataSources.LL2_DISPLAY_NAME, DataSources.LL2_URL));
    }
}
