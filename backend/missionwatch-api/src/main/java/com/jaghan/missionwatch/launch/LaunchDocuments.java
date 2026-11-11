package com.jaghan.missionwatch.launch;

import com.jaghan.missionwatch.launch.model.LaunchView;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

/** Converts between {@link LaunchView} and the JSON stored in the launch document column. */
@Component
public class LaunchDocuments {

    private final JsonMapper json;

    public LaunchDocuments(JsonMapper json) {
        this.json = json;
    }

    public String write(LaunchView view) {
        return json.writeValueAsString(view);
    }

    public LaunchView read(String document) {
        return json.readValue(document, LaunchView.class);
    }
}
