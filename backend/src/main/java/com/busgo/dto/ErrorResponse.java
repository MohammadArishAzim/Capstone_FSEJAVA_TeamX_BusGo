package com.busgo.dto;

import java.time.Instant;

public record ErrorResponse(
        Instant timestamp,
        String path,
        String error,
        String message
) {}
