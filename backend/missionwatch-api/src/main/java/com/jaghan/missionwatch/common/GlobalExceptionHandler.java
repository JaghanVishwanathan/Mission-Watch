package com.jaghan.missionwatch.common;

import com.jaghan.missionwatch.common.ApiExceptions.BadRequestException;
import com.jaghan.missionwatch.common.ApiExceptions.NotFoundException;
import com.jaghan.missionwatch.common.ApiExceptions.UpstreamUnavailableException;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Clock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/** Turns every failure into the {@link ApiError} shape documented in docs/api.md. */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    private final Clock clock;

    public GlobalExceptionHandler(Clock clock) {
        this.clock = clock;
    }

    @ExceptionHandler(NotFoundException.class)
    ResponseEntity<ApiError> notFound(NotFoundException e, HttpServletRequest request) {
        return error(HttpStatus.NOT_FOUND, e.getMessage(), request);
    }

    @ExceptionHandler(BadRequestException.class)
    ResponseEntity<ApiError> badRequest(BadRequestException e, HttpServletRequest request) {
        return error(HttpStatus.BAD_REQUEST, e.getMessage(), request);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    ResponseEntity<ApiError> typeMismatch(MethodArgumentTypeMismatchException e, HttpServletRequest request) {
        return error(HttpStatus.BAD_REQUEST, "Invalid value for parameter '" + e.getName() + "'.", request);
    }

    @ExceptionHandler(UpstreamUnavailableException.class)
    ResponseEntity<ApiError> upstream(UpstreamUnavailableException e, HttpServletRequest request) {
        log.warn("Upstream unavailable for {}: {}", request.getRequestURI(), e.getMessage());
        return error(HttpStatus.SERVICE_UNAVAILABLE, e.getMessage(), request);
    }

    /** Spring's own errors (validation, unknown path, wrong method) keep their status and detail. */
    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiError> other(Exception e, HttpServletRequest request) {
        if (e instanceof ErrorResponse response) {
            HttpStatusCode status = response.getStatusCode();
            if (status.is5xxServerError()) log.error("Request {} failed", request.getRequestURI(), e);
            return error(status, response.getBody().getDetail(), request);
        }
        log.error("Request {} failed", request.getRequestURI(), e);
        return error(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred.", request);
    }

    private ResponseEntity<ApiError> error(HttpStatusCode status, String message, HttpServletRequest request) {
        HttpStatus known = HttpStatus.resolve(status.value());
        String code = known != null ? known.name() : "ERROR";
        return ResponseEntity.status(status)
                .body(new ApiError(status.value(), code, message, request.getRequestURI(), clock.instant()));
    }
}
