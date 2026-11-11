package com.jaghan.missionwatch.ingest.ll2;

/** Launch Library 2 could not be read. The message is safe to show in response warnings. */
public class Ll2Exception extends RuntimeException {

    public Ll2Exception(String message) {
        super(message);
    }

    public Ll2Exception(String message, Throwable cause) {
        super(message, cause);
    }
}
