package com.jaghan.missionwatch.common;

import java.time.Instant;

/** The error body for every failed request (docs/api.md). */
public record ApiError(int status, String error, String message, String path, Instant timestamp) {}
