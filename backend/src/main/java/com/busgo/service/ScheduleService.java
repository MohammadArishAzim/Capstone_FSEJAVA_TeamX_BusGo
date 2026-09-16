package com.busgo.service;

import com.busgo.dto.ScheduleDtos.ScheduleRequest;
import com.busgo.dto.ScheduleDtos.ScheduleResponse;
import com.busgo.dto.ScheduleDtos.ScheduleSearchResponse;
import com.busgo.dto.ScheduleDtos.SeatMapResponse;
import com.busgo.entity.Bus;
import com.busgo.entity.Schedule;
import com.busgo.exception.BadRequestException;
import com.busgo.exception.NotFoundException;
import com.busgo.repository.BookingSeatRepository;
import com.busgo.repository.BusRepository;
import com.busgo.repository.ScheduleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ScheduleService {

    private final ScheduleRepository scheduleRepository;
    private final BusRepository busRepository;
    private final BookingSeatRepository bookingSeatRepository;

    public List<ScheduleSearchResponse> search(String fromCity, String toCity, LocalDate date) {
        if (fromCity == null || fromCity.isBlank() || toCity == null || toCity.isBlank() || date == null) {
            throw new BadRequestException("from, to, and date are all required search parameters");
        }
        return scheduleRepository.search(fromCity.trim(), toCity.trim(), date).stream()
                .map(this::toSearchResponse)
                .toList();
    }

    public SeatMapResponse getSeatMap(Long scheduleId) {
        Schedule schedule = getOrThrow(scheduleId);
        List<String> bookedSeats = bookingSeatRepository.findBookedSeatNumbers(scheduleId);
        return new SeatMapResponse(schedule.getId(), schedule.getBus().getTotalSeats(), bookedSeats);
    }

    public List<ScheduleResponse> findAll() {
        return scheduleRepository.findAll().stream().map(this::toResponse).toList();
    }

    @Transactional
    public ScheduleResponse create(ScheduleRequest request) {
        validateTimes(request);
        Bus bus = busRepository.findById(request.busId())
                .orElseThrow(() -> new NotFoundException("Bus not found: " + request.busId()));
        Schedule schedule = Schedule.builder()
                .bus(bus)
                .fromCity(request.fromCity().trim())
                .toCity(request.toCity().trim())
                .departureTime(request.departureTime())
                .arrivalTime(request.arrivalTime())
                .fare(request.fare())
                .journeyDate(request.journeyDate())
                .build();
        scheduleRepository.save(schedule);
        return toResponse(schedule);
    }

    @Transactional
    public ScheduleResponse update(Long id, ScheduleRequest request) {
        validateTimes(request);
        Schedule schedule = getOrThrow(id);
        Bus bus = busRepository.findById(request.busId())
                .orElseThrow(() -> new NotFoundException("Bus not found: " + request.busId()));
        schedule.setBus(bus);
        schedule.setFromCity(request.fromCity().trim());
        schedule.setToCity(request.toCity().trim());
        schedule.setDepartureTime(request.departureTime());
        schedule.setArrivalTime(request.arrivalTime());
        schedule.setFare(request.fare());
        schedule.setJourneyDate(request.journeyDate());
        return toResponse(schedule);
    }

    @Transactional
    public void delete(Long id) {
        Schedule schedule = getOrThrow(id);
        scheduleRepository.delete(schedule);
    }

    private void validateTimes(ScheduleRequest request) {
        if (!request.arrivalTime().isAfter(request.departureTime())) {
            throw new BadRequestException("Arrival time must be after departure time");
        }
    }

    private Schedule getOrThrow(Long id) {
        return scheduleRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Schedule not found: " + id));
    }

    private ScheduleSearchResponse toSearchResponse(Schedule s) {
        int booked = bookingSeatRepository.findBookedSeatNumbers(s.getId()).size();
        int available = s.getBus().getTotalSeats() - booked;
        return new ScheduleSearchResponse(
                s.getId(), s.getBus().getBusNumber(), s.getBus().getOperatorName(), s.getBus().getBusType(),
                s.getFromCity(), s.getToCity(), s.getDepartureTime(), s.getArrivalTime(), s.getFare(),
                s.getJourneyDate(), s.getBus().getTotalSeats(), available
        );
    }

    private ScheduleResponse toResponse(Schedule s) {
        return new ScheduleResponse(
                s.getId(), s.getBus().getId(), s.getBus().getBusNumber(), s.getBus().getOperatorName(),
                s.getBus().getBusType(), s.getFromCity(), s.getToCity(), s.getDepartureTime(), s.getArrivalTime(),
                s.getFare(), s.getJourneyDate(), s.getBus().getTotalSeats()
        );
    }
}
