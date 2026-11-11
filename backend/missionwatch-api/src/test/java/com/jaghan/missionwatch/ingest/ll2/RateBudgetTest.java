package com.jaghan.missionwatch.ingest.ll2;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class RateBudgetTest {

    private static final class MutableClock extends Clock {
        Instant now = Instant.parse("2026-11-11T00:00:00Z");

        @Override
        public Instant instant() {
            return now;
        }

        @Override
        public java.time.ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(java.time.ZoneId zone) {
            return this;
        }
    }

    @Test
    void allowsUpToTheHourlyLimitThenRecoversAsTheWindowSlides() {
        MutableClock clock = new MutableClock();
        RateBudget budget = new RateBudget(2, clock);

        assertThat(budget.tryAcquire()).isTrue();
        clock.now = clock.now.plus(Duration.ofMinutes(30));
        assertThat(budget.tryAcquire()).isTrue();
        assertThat(budget.tryAcquire()).isFalse();

        // The first request leaves the one-hour window.
        clock.now = clock.now.plus(Duration.ofMinutes(31));
        assertThat(budget.tryAcquire()).isTrue();
        assertThat(budget.tryAcquire()).isFalse();
    }
}
