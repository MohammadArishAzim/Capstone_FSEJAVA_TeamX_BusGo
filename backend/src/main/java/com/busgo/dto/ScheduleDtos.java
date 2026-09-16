package com.busgo.dto;

import com.busgo.entity.BusType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

public class ScheduleDtos {

    public record ScheduleRequest(
            @NotNull Long busId,
            @NotBlank String fromCity,
            @NotBlank String toCity,
            @NotNull LocalTime departureTime,
            @NotNull LocalTime arrivalTime,
            @NotNull @Positive BigDecimal fare,
            @NotNull LocalDate journeyDate
    ) {}

    /** Search result row — combines schedule + bus info, with derived seats-available count. */
    public record ScheduleSearchResponse(
            Long id,
            String busNumber,
            String operatorName,
            BusType busType,
            String fromCity,
            String toCity,
            LocalTime departureTime,
            LocalTime arrivalTime,
            BigDecimal fare,
            LocalDate journeyDate,
            Integer totalSeats,
            Integer seatsAvailable
    ) {}

    public record ScheduleResponse(
            Long id,
            Long busId,
            String busNumber,
            String operatorName,
            BusType busType,
            String fromCity,
            String toCity,
            LocalTime departureTime,
            LocalTime arrivalTime,
            BigDecimal fare,
            LocalDate journeyDate,
            Integer totalSeats
    ) {}

    public record SeatMapResponse(
            Long scheduleId,
            Integer totalSeats,
            java.util.List<String> bookedSeats
    ) {}
}
