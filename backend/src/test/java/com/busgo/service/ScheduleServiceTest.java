package com.busgo.service;

import com.busgo.dto.ScheduleDtos.ScheduleRequest;
import com.busgo.dto.ScheduleDtos.ScheduleSearchResponse;
import com.busgo.dto.ScheduleDtos.SeatMapResponse;
import com.busgo.entity.Bus;
import com.busgo.entity.BusType;
import com.busgo.entity.Schedule;
import com.busgo.exception.BadRequestException;
import com.busgo.exception.NotFoundException;
import com.busgo.repository.BookingSeatRepository;
import com.busgo.repository.BusRepository;
import com.busgo.repository.ScheduleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ScheduleServiceTest {

    @Mock
    private ScheduleRepository scheduleRepository;
    @Mock
    private BusRepository busRepository;
    @Mock
    private BookingSeatRepository bookingSeatRepository;

    @InjectMocks
    private ScheduleService scheduleService;

    private Bus bus;
    private Schedule schedule;

    @BeforeEach
    void setUp() {
        bus = Bus.builder().id(1L).busNumber("KA-01-AB-1234").operatorName("VRL Travels")
                .totalSeats(40).busType(BusType.SEATER).build();
        schedule = Schedule.builder().id(10L).bus(bus).fromCity("Hyderabad").toCity("Bangalore")
                .departureTime(LocalTime.of(21, 0)).arrivalTime(LocalTime.of(6, 30))
                .fare(new BigDecimal("900.00")).journeyDate(LocalDate.now().plusDays(3)).build();
    }

    @Test
    void search_returnsSeatsAvailable_derivedFromBookedSeatCount() {
        LocalDate date = schedule.getJourneyDate();
        when(scheduleRepository.search("Hyderabad", "Bangalore", date)).thenReturn(List.of(schedule));
        when(bookingSeatRepository.findBookedSeatNumbers(10L)).thenReturn(List.of("1A", "1B", "1C"));

        List<ScheduleSearchResponse> results = scheduleService.search("Hyderabad", "Bangalore", date);

        assertThat(results).hasSize(1);
        assertThat(results.get(0).seatsAvailable()).isEqualTo(37);
        assertThat(results.get(0).totalSeats()).isEqualTo(40);
    }

    @Test
    void search_throwsBadRequest_whenFromCityMissing() {
        assertThatThrownBy(() -> scheduleService.search("", "Bangalore", LocalDate.now()))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void search_throwsBadRequest_whenDateMissing() {
        assertThatThrownBy(() -> scheduleService.search("Hyderabad", "Bangalore", null))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void getSeatMap_returnsBookedSeatsForSchedule() {
        when(scheduleRepository.findById(10L)).thenReturn(Optional.of(schedule));
        when(bookingSeatRepository.findBookedSeatNumbers(10L)).thenReturn(List.of("2A", "2B"));

        SeatMapResponse response = scheduleService.getSeatMap(10L);

        assertThat(response.totalSeats()).isEqualTo(40);
        assertThat(response.bookedSeats()).containsExactlyInAnyOrder("2A", "2B");
    }

    @Test
    void getSeatMap_throwsNotFound_whenScheduleMissing() {
        when(scheduleRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> scheduleService.getSeatMap(999L))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void create_throwsBadRequest_whenArrivalNotAfterDeparture() {
        ScheduleRequest request = new ScheduleRequest(1L, "Hyderabad", "Bangalore",
                LocalTime.of(21, 0), LocalTime.of(21, 0), new BigDecimal("900.00"), LocalDate.now().plusDays(1));

        assertThatThrownBy(() -> scheduleService.create(request))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void create_throwsNotFound_whenBusDoesNotExist() {
        when(busRepository.findById(2L)).thenReturn(Optional.empty());
        ScheduleRequest request = new ScheduleRequest(2L, "Hyderabad", "Bangalore",
                LocalTime.of(21, 0), LocalTime.of(23, 0), new BigDecimal("900.00"), LocalDate.now().plusDays(1));

        assertThatThrownBy(() -> scheduleService.create(request))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void create_succeeds_whenValid() {
        when(busRepository.findById(1L)).thenReturn(Optional.of(bus));
        when(scheduleRepository.save(any(Schedule.class))).thenAnswer(inv -> inv.getArgument(0));

        ScheduleRequest request = new ScheduleRequest(1L, "Hyderabad", "Bangalore",
                LocalTime.of(21, 0), LocalTime.of(23, 0), new BigDecimal("900.00"), LocalDate.now().plusDays(1));

        var response = scheduleService.create(request);

        assertThat(response.fromCity()).isEqualTo("Hyderabad");
        assertThat(response.busNumber()).isEqualTo("KA-01-AB-1234");
    }
}
