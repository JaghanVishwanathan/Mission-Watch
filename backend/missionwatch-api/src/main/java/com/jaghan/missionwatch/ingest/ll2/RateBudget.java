package com.jaghan.missionwatch.ingest.ll2;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;

/**
 * A sliding one-hour request budget. LL2 allows about 15 anonymous requests per hour; every call,
 * scheduled or on demand, spends from this budget so MissionWatch never gets itself blocked.
 */
public class RateBudget {

    private static final Duration WINDOW = Duration.ofHours(1);

    private final int maxPerHour;
    private final Clock clock;
    private final Deque<Instant> spent = new ArrayDeque<>();

    public RateBudget(int maxPerHour, Clock clock) {
        this.maxPerHour = maxPerHour;
        this.clock = clock;
    }

    /** Spends one request if the budget allows it. */
    public synchronized boolean tryAcquire() {
        Instant now = clock.instant();
        while (!spent.isEmpty() && !spent.peekFirst().isAfter(now.minus(WINDOW))) spent.pollFirst();
        if (spent.size() >= maxPerHour) return false;
        spent.addLast(now);
        return true;
    }
}
