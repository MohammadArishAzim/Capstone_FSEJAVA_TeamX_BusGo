package com.busgo.service;

import com.busgo.dto.BusDtos.BusRequest;
import com.busgo.entity.Bus;
import com.busgo.entity.BusType;
import com.busgo.exception.ConflictException;
import com.busgo.exception.NotFoundException;
import com.busgo.repository.BusRepository;
import com.busgo.repository.ScheduleRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BusServiceTest {

    @Mock
    private BusRepository busRepository;

    @Mock
    private ScheduleRepository scheduleRepository;

    @InjectMocks
    private BusService busService;

    @Test
    void create_throwsConflict_whenBusNumberAlreadyExists() {
        when(busRepository.existsByBusNumber("KA-01-AB-1234")).thenReturn(true);

        BusRequest request = new BusRequest("KA-01-AB-1234", "VRL Travels", 40, BusType.SEATER);

        assertThatThrownBy(() -> busService.create(request))
                .isInstanceOf(ConflictException.class);

        verify(busRepository, never()).save(any());
    }

    @Test
    void create_succeeds_whenBusNumberIsUnique() {
        when(busRepository.existsByBusNumber("KA-01-AB-1234")).thenReturn(false);
        when(busRepository.save(any(Bus.class))).thenAnswer(inv -> inv.getArgument(0));

        BusRequest request = new BusRequest("KA-01-AB-1234", "VRL Travels", 40, BusType.SEATER);
        var response = busService.create(request);

        assertThat(response.busNumber()).isEqualTo("KA-01-AB-1234");
        assertThat(response.busType()).isEqualTo(BusType.SEATER);
    }

    @Test
    void findById_throwsNotFound_whenBusDoesNotExist() {
        when(busRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> busService.findById(99L))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void delete_removesBus_whenExistsAndHasNoSchedules() {
        Bus bus = Bus.builder().id(1L).busNumber("KA-01-AB-1234").operatorName("VRL")
                .totalSeats(40).busType(BusType.SEATER).build();
        when(busRepository.findById(1L)).thenReturn(Optional.of(bus));
        when(scheduleRepository.existsByBusId(1L)).thenReturn(false);

        busService.delete(1L);

        verify(busRepository).delete(bus);
    }

    @Test
    void delete_throwsConflict_whenBusHasSchedules() {
        Bus bus = Bus.builder().id(1L).busNumber("KA-01-AB-1234").operatorName("VRL")
                .totalSeats(40).busType(BusType.SEATER).build();
        when(busRepository.findById(1L)).thenReturn(Optional.of(bus));
        when(scheduleRepository.existsByBusId(1L)).thenReturn(true);

        assertThatThrownBy(() -> busService.delete(1L))
                .isInstanceOf(ConflictException.class);

        verify(busRepository, never()).delete(any());
    }
}
