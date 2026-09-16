package com.busgo.dto;

import com.busgo.entity.BusType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class BusDtos {

    public record BusRequest(
            @NotBlank String busNumber,
            @NotBlank String operatorName,
            @NotNull @Min(1) Integer totalSeats,
            @NotNull BusType busType
    ) {}

    public record BusResponse(
            Long id,
            String busNumber,
            String operatorName,
            Integer totalSeats,
            BusType busType
    ) {}
}
