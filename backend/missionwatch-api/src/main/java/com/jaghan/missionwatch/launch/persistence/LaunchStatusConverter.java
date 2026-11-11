package com.jaghan.missionwatch.launch.persistence;

import com.jaghan.missionwatch.launch.model.LaunchStatus;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/** Stores statuses by their API code ("in-flight"), not the Java constant name. */
@Converter
public class LaunchStatusConverter implements AttributeConverter<LaunchStatus, String> {

    @Override
    public String convertToDatabaseColumn(LaunchStatus status) {
        return status == null ? null : status.code();
    }

    @Override
    public LaunchStatus convertToEntityAttribute(String code) {
        return code == null
                ? null
                : LaunchStatus.fromCode(code)
                        .orElseThrow(() -> new IllegalStateException("Unknown launch status in database: " + code));
    }
}
