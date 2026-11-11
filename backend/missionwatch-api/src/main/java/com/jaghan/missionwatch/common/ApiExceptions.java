package com.jaghan.missionwatch.common;

/** Exceptions that map to specific HTTP responses in {@link GlobalExceptionHandler}. */
public final class ApiExceptions {

    private ApiExceptions() {}

    /** 404: the requested resource does not exist. */
    public static class NotFoundException extends RuntimeException {
        public NotFoundException(String message) {
            super(message);
        }
    }

    /** 400: a request parameter is invalid. The message is shown to the client. */
    public static class BadRequestException extends RuntimeException {
        public BadRequestException(String message) {
            super(message);
        }
    }

    /** 503: an upstream source is needed for this request and cannot be reached right now. */
    public static class UpstreamUnavailableException extends RuntimeException {
        public UpstreamUnavailableException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
