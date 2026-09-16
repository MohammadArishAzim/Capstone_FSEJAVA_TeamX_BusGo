package com.busgo.controller;

import com.busgo.dto.BusDtos.BusRequest;
import com.busgo.dto.BusDtos.BusResponse;
import com.busgo.service.BusService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/buses")
@RequiredArgsConstructor
@Tag(name = "Buses", description = "Bus fleet management (read is public, write is admin-only)")
public class BusController {

    private final BusService busService;

    @GetMapping
    public List<BusResponse> findAll() {
        return busService.findAll();
    }

    @GetMapping("/{id}")
    public BusResponse findById(@PathVariable Long id) {
        return busService.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BusResponse create(@Valid @RequestBody BusRequest request) {
        return busService.create(request);
    }

    @PutMapping("/{id}")
    public BusResponse update(@PathVariable Long id, @Valid @RequestBody BusRequest request) {
        return busService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        busService.delete(id);
    }
}
