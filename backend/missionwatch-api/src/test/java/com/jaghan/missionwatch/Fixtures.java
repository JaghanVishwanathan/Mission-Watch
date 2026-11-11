package com.jaghan.missionwatch;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

/** Shared test data: a real (trimmed) LL2 2.3.0 detailed launch record. */
public final class Fixtures {

    public static final JsonMapper JSON = JsonMapper.builder().build();
    public static final String LAUNCH_ID = "97c6f5e1-299e-4652-b72d-9618ac047076";

    private Fixtures() {}

    public static String resource(String path) {
        try (InputStream in = Fixtures.class.getResourceAsStream(path)) {
            if (in == null) throw new IllegalArgumentException("Missing test resource " + path);
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    /** A fresh, mutable copy of the detailed launch record. */
    public static ObjectNode ll2Launch() {
        return (ObjectNode) JSON.readTree(resource("/ll2/launch-detailed.json"));
    }

    /** A copy with a different id, net and status, for multi-launch tests. */
    public static ObjectNode ll2Launch(String id, String net, int statusId, String statusAbbrev) {
        ObjectNode launch = ll2Launch();
        launch.put("id", id);
        launch.put("net", net);
        ObjectNode status = launch.putObject("status");
        status.put("id", statusId);
        status.put("name", statusAbbrev);
        status.put("abbrev", statusAbbrev);
        return launch;
    }

    /** An LL2 list response wrapping the given records. */
    public static String ll2Page(JsonNode... launches) {
        ObjectNode page = JSON.createObjectNode();
        page.put("count", launches.length);
        page.putNull("next");
        page.putArray("results").addAll(java.util.List.of(launches));
        return page.toString();
    }
}
