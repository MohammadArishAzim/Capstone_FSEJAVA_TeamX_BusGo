package com.busgo.controller;

import com.busgo.dto.ScheduleDtos.ScheduleRequest;
import com.busgo.dto.ScheduleDtos.ScheduleResponse;
import com.busgo.dto.ScheduleDtos.ScheduleSearchResponse;
import com.busgo.dto.ScheduleDtos.SeatMapResponse;
import com.busgo.service.ScheduleService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/schedules")
@RequiredArgsConstructor
@Tag(name = "Schedules", description = "Search schedules (public) and manage them (admin-only)")
public class ScheduleController {

    private final ScheduleService scheduleService;

    @GetMapping
    public List<ScheduleSearchResponse> search(@RequestParam String from,
                                                @RequestParam String to,
                                                @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return scheduleService.search(from, to, date);
    }

    @GetMapping("/{id}/seats")
    public SeatMapResponse getSeats(@PathVariable Long id) {
        return scheduleService.getSeatMap(id);
    }

    @GetMapping("/cities")
    public List<String> cities() {
        return scheduleService.findDistinctCities();
    }

    @GetMapping("/all")
    public List<ScheduleResponse> findAll() {
        return scheduleService.findAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ScheduleResponse create(@Valid @RequestBody ScheduleRequest request) {
        return scheduleService.create(request);
    }

    @PutMapping("/{id}")
    public ScheduleResponse update(@PathVariable Long id, @Valid @RequestBody ScheduleRequest request) {
        return scheduleService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        scheduleService.delete(id);
    }
}
