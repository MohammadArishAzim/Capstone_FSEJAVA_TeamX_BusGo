package com.busgo.service;

import com.busgo.dto.BusDtos.BusRequest;
import com.busgo.dto.BusDtos.BusResponse;
import com.busgo.entity.Bus;
import com.busgo.exception.ConflictException;
import com.busgo.exception.NotFoundException;
import com.busgo.repository.BusRepository;
import com.busgo.repository.ScheduleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BusService {

    private final BusRepository busRepository;
    private final ScheduleRepository scheduleRepository;

    public List<BusResponse> findAll() {
        return busRepository.findAll().stream().map(this::toResponse).toList();
    }

    public BusResponse findById(Long id) {
        return toResponse(getOrThrow(id));
    }

    @Transactional
    public BusResponse create(BusRequest request) {
        if (busRepository.existsByBusNumber(request.busNumber())) {
            throw new ConflictException("A bus with number " + request.busNumber() + " already exists");
        }
        Bus bus = Bus.builder()
                .busNumber(request.busNumber())
                .operatorName(request.operatorName())
                .totalSeats(request.totalSeats())
                .busType(request.busType())
                .build();
        busRepository.save(bus);
        return toResponse(bus);
    }

    @Transactional
    public BusResponse update(Long id, BusRequest request) {
        Bus bus = getOrThrow(id);
        bus.setBusNumber(request.busNumber());
        bus.setOperatorName(request.operatorName());
        bus.setTotalSeats(request.totalSeats());
        bus.setBusType(request.busType());
        return toResponse(bus);
    }

    @Transactional
    public void delete(Long id) {
        Bus bus = getOrThrow(id);
        if (scheduleRepository.existsByBusId(id)) {
            throw new ConflictException(
                    "Cannot delete bus " + bus.getBusNumber() + ": it has schedules referencing it. " +
                    "Delete those schedules first.");
        }
        busRepository.delete(bus);
    }

    private Bus getOrThrow(Long id) {
        return busRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Bus not found: " + id));
    }

    private BusResponse toResponse(Bus bus) {
        return new BusResponse(bus.getId(), bus.getBusNumber(), bus.getOperatorName(),
                bus.getTotalSeats(), bus.getBusType());
    }
}
