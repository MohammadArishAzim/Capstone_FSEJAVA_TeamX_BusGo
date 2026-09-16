package com.busgo.service;

import com.busgo.dto.BookingDtos.BookingRequest;
import com.busgo.dto.BookingDtos.BookingResponse;
import com.busgo.entity.*;
import com.busgo.exception.ConflictException;
import com.busgo.exception.ForbiddenException;
import com.busgo.exception.NotFoundException;
import com.busgo.repository.BookingRepository;
import com.busgo.repository.BookingSeatRepository;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookingServiceTest {

    @Mock
    private BookingRepository bookingRepository;
    @Mock
    private ScheduleRepository scheduleRepository;
    @Mock
    private BookingSeatRepository bookingSeatRepository;

    @InjectMocks
    private BookingService bookingService;

    private User user;
    private Bus bus;
    private Schedule schedule;

    @BeforeEach
    void setUp() {
        user = User.builder().id(1L).email("passenger@example.com").name("Passenger").isAdmin(false).build();
        bus = Bus.builder().id(1L).busNumber("KA-01-AB-1234").operatorName("VRL Travels")
                .totalSeats(40).busType(BusType.SEATER).build();
        schedule = Schedule.builder().id(10L).bus(bus).fromCity("Hyderabad").toCity("Bangalore")
                .departureTime(LocalTime.of(21, 0)).arrivalTime(LocalTime.of(6, 30))
                .fare(new BigDecimal("900.00")).journeyDate(LocalDate.now().plusDays(3)).build();
    }

    @Test
    void createBooking_succeeds_whenSeatsAreFree() {
        when(scheduleRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(schedule));
        when(bookingSeatRepository.findBookedSeatNumbers(10L)).thenReturn(List.of("3A"));
        when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> {
            Booking b = inv.getArgument(0);
            b.setId(100L);
            return b;
        });

        BookingRequest request = new BookingRequest(10L, List.of("1A", "1B"));
        BookingResponse response = bookingService.createBooking(user, request);

        assertThat(response.status()).isEqualTo(BookingStatus.BOOKED);
        assertThat(response.seatNumbers()).containsExactlyInAnyOrder("1A", "1B");
        assertThat(response.totalFare()).isEqualByComparingTo(new BigDecimal("1800.00"));
        verify(bookingRepository).save(any(Booking.class));
    }

    @Test
    void createBooking_throwsConflict_whenAnyRequestedSeatIsAlreadyBooked() {
        when(scheduleRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(schedule));
        when(bookingSeatRepository.findBookedSeatNumbers(10L)).thenReturn(List.of("1A", "2C"));

        BookingRequest request = new BookingRequest(10L, List.of("1A", "1B"));

        assertThatThrownBy(() -> bookingService.createBooking(user, request))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("1A");

        verify(bookingRepository, never()).save(any());
    }

    @Test
    void createBooking_throwsConflict_whenDuplicateSeatNumbersRequested() {
        when(scheduleRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(schedule));

        BookingRequest request = new BookingRequest(10L, List.of("1A", "1A"));

        assertThatThrownBy(() -> bookingService.createBooking(user, request))
                .isInstanceOf(ConflictException.class);

        verify(bookingRepository, never()).save(any());
    }

    @Test
    void createBooking_throwsConflict_whenSeatNumberOutOfRangeForBus() {
        when(scheduleRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(schedule));

        // Bus has 40 seats = 10 rows x 4 (A-D); row 11 doesn't exist.
        BookingRequest request = new BookingRequest(10L, List.of("11A"));

        assertThatThrownBy(() -> bookingService.createBooking(user, request))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("out of range");
    }

    @Test
    void createBooking_throwsNotFound_whenScheduleDoesNotExist() {
        when(scheduleRepository.findByIdForUpdate(999L)).thenReturn(Optional.empty());

        BookingRequest request = new BookingRequest(999L, List.of("1A"));

        assertThatThrownBy(() -> bookingService.createBooking(user, request))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void cancel_marksCancelled_whenRequesterIsOwner() {
        Booking booking = Booking.builder().id(50L).user(user).schedule(schedule)
                .status(BookingStatus.BOOKED).totalFare(new BigDecimal("900.00")).build();
        booking.addSeat(BookingSeat.builder().seatNumber("1A").build());
        when(bookingRepository.findById(50L)).thenReturn(Optional.of(booking));

        BookingResponse response = bookingService.cancel(user, 50L);

        assertThat(response.status()).isEqualTo(BookingStatus.CANCELLED);
        assertThat(booking.getCancelledAt()).isNotNull();
    }

    @Test
    void cancel_succeeds_whenRequesterIsAdminButNotOwner() {
        User otherUser = User.builder().id(2L).email("other@example.com").name("Other").isAdmin(false).build();
        User admin = User.builder().id(99L).email("admin@busgo.com").name("Admin").isAdmin(true).build();

        Booking booking = Booking.builder().id(51L).user(otherUser).schedule(schedule)
                .status(BookingStatus.BOOKED).totalFare(new BigDecimal("900.00")).build();
        when(bookingRepository.findById(51L)).thenReturn(Optional.of(booking));

        BookingResponse response = bookingService.cancel(admin, 51L);

        assertThat(response.status()).isEqualTo(BookingStatus.CANCELLED);
    }

    @Test
    void cancel_throwsForbidden_whenRequesterIsNeitherOwnerNorAdmin() {
        User otherUser = User.builder().id(2L).email("other@example.com").name("Other").isAdmin(false).build();
        Booking booking = Booking.builder().id(52L).user(otherUser).schedule(schedule)
                .status(BookingStatus.BOOKED).totalFare(new BigDecimal("900.00")).build();
        when(bookingRepository.findById(52L)).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> bookingService.cancel(user, 52L))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void cancel_throwsConflict_whenAlreadyCancelled() {
        Booking booking = Booking.builder().id(53L).user(user).schedule(schedule)
                .status(BookingStatus.CANCELLED).totalFare(new BigDecimal("900.00")).build();
        when(bookingRepository.findById(53L)).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> bookingService.cancel(user, 53L))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void findMine_returnsBookingsOrderedByRepository() {
        Booking booking = Booking.builder().id(1L).user(user).schedule(schedule)
                .status(BookingStatus.BOOKED).totalFare(new BigDecimal("900.00")).build();
        when(bookingRepository.findByUserOrderByBookedAtDesc(user)).thenReturn(List.of(booking));

        List<BookingResponse> result = bookingService.findMine(user);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).id()).isEqualTo(1L);
    }
}
