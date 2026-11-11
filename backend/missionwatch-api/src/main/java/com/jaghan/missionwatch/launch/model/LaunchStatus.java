package com.jaghan.missionwatch.launch.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import java.util.Arrays;
import java.util.EnumSet;
import java.util.Optional;
import java.util.Set;

/**
 * Internal launch statuses (SRS §5.7). The codes match the frontend {@code LaunchStatus} type and
 * are what the API and the database store. "Deployed" means the payload separated but no final
 * outcome is recorded yet, so it is kept apart from "success".
 */
public enum LaunchStatus {
    GO("go"),
    TBC("tbc"),
    TBD("tbd"),
    HOLD("hold"),
    IN_FLIGHT("in-flight"),
    DEPLOYED("deployed"),
    SUCCESS("success"),
    PARTIAL_FAILURE("partial-failure"),
    FAILURE("failure");

    public static final Set<LaunchStatus> UPCOMING = EnumSet.of(GO, TBC, TBD, HOLD, IN_FLIGHT);
    public static final Set<LaunchStatus> PAST = EnumSet.of(DEPLOYED, SUCCESS, PARTIAL_FAILURE, FAILURE);

    private final String code;

    LaunchStatus(String code) {
        this.code = code;
    }

    @JsonValue
    public String code() {
        return code;
    }

    public static Optional<LaunchStatus> fromCode(String code) {
        return Arrays.stream(values()).filter(s -> s.code.equals(code)).findFirst();
    }

    @JsonCreator
    static LaunchStatus parse(String code) {
        return fromCode(code).orElseThrow(() -> new IllegalArgumentException("Unknown launch status: " + code));
    }
}
