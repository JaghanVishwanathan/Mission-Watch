package com.jaghan.missionwatch.common;

/** The envelope for every data response (docs/api.md, SRS §8.2): the payload and its provenance. */
public record ApiResponse<T>(T data, DataMeta meta) {

    public static <T> ApiResponse<T> of(T data, DataMeta meta) {
        return new ApiResponse<>(data, meta);
    }
}
