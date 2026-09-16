package com.busgo.dto;

import com.busgo.entity.BookingStatus;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public class BookingDtos {

    public record BookingRequest(
            @NotNull Long scheduleId,
            @NotEmpty @Size(min = 1, max = 4, message = "You can book between 1 and 4 seats") List<String> seatNumbers
    ) {}

    public record BookingResponse(
            Long id,
            Long scheduleId,
            String fromCity,
            String toCity,
            LocalDate journeyDate,
            LocalTime departureTime,
            LocalTime arrivalTime,
            String busNumber,
            String operatorName,
            List<String> seatNumbers,
            BookingStatus status,
            BigDecimal totalFare,
            Instant bookedAt,
            Instant cancelledAt
    ) {}
}
