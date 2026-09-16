package com.busgo.service;

import com.busgo.dto.BookingDtos.BookingRequest;
import com.busgo.dto.BookingDtos.BookingResponse;
import com.busgo.entity.Booking;
import com.busgo.entity.BookingSeat;
import com.busgo.entity.BookingStatus;
import com.busgo.entity.Schedule;
import com.busgo.entity.User;
import com.busgo.exception.ConflictException;
import com.busgo.exception.ForbiddenException;
import com.busgo.exception.NotFoundException;
import com.busgo.repository.BookingRepository;
import com.busgo.repository.BookingSeatRepository;
import com.busgo.repository.ScheduleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingRepository bookingRepository;
    private final ScheduleRepository scheduleRepository;
    private final BookingSeatRepository bookingSeatRepository;

    /**
     * Creates a booking after checking that none of the requested seats are already held by a
     * non-cancelled booking on the same schedule. Loads the schedule with a pessimistic write
     * lock (findByIdForUpdate) so that two concurrent requests for the same schedule serialize:
     * the second request blocks until the first transaction commits or rolls back, at which
     * point its own "is this seat free" check sees accurate data. Without this lock, the
     * check-then-insert sequence is a classic TOCTOU race under READ_COMMITTED -- two
     * transactions could both read "seat free" before either had inserted, and both commit,
     * silently double-booking the seat.
     */
    @Transactional
    public BookingResponse createBooking(User user, BookingRequest request) {
        Schedule schedule = scheduleRepository.findByIdForUpdate(request.scheduleId())
                .orElseThrow(() -> new NotFoundException("Schedule not found: " + request.scheduleId()));

        // De-duplicate requested seat numbers defensively.
        Set<String> requestedSeats = new HashSet<>(request.seatNumbers());
        if (requestedSeats.size() != request.seatNumbers().size()) {
            throw new ConflictException("Duplicate seat numbers in request");
        }

        validateSeatNumbers(requestedSeats, schedule.getBus().getTotalSeats());

        List<String> alreadyBooked = bookingSeatRepository.findBookedSeatNumbers(schedule.getId());
        Set<String> conflict = requestedSeats.stream()
                .filter(alreadyBooked::contains)
                .collect(Collectors.toSet());
        if (!conflict.isEmpty()) {
            throw new ConflictException("Seat(s) already booked: " + String.join(", ", conflict));
        }

        BigDecimal totalFare = schedule.getFare().multiply(BigDecimal.valueOf(requestedSeats.size()));

        Booking booking = Booking.builder()
                .user(user)
                .schedule(schedule)
                .status(BookingStatus.BOOKED)
                .totalFare(totalFare)
                .build();

        for (String seatNumber : requestedSeats) {
            booking.addSeat(BookingSeat.builder().seatNumber(seatNumber).build());
        }

        bookingRepository.save(booking);
        return toResponse(booking);
    }

    public List<BookingResponse> findMine(User user) {
        return bookingRepository.findByUserOrderByBookedAtDesc(user).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public BookingResponse cancel(User requester, Long bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new NotFoundException("Booking not found: " + bookingId));

        boolean isOwner = booking.getUser().getId().equals(requester.getId());
        if (!isOwner && !requester.isAdmin()) {
            throw new ForbiddenException("You can only cancel your own bookings");
        }

        if (booking.getStatus() == BookingStatus.CANCELLED) {
            throw new ConflictException("Booking is already cancelled");
        }

        booking.setStatus(BookingStatus.CANCELLED);
        booking.setCancelledAt(java.time.Instant.now());
        // Seats free up automatically: findBookedSeatNumbers only counts BOOKED-status bookings.
        return toResponse(booking);
    }

    private void validateSeatNumbers(Set<String> seatNumbers, int totalSeats) {
        int maxRow = (totalSeats + 3) / 4; // 4 seats per row
        for (String seat : seatNumbers) {
            if (seat == null || seat.length() < 2) {
                throw new ConflictException("Invalid seat number: " + seat);
            }
            char col = Character.toUpperCase(seat.charAt(seat.length() - 1));
            String rowPart = seat.substring(0, seat.length() - 1);
            int row;
            try {
                row = Integer.parseInt(rowPart);
            } catch (NumberFormatException e) {
                throw new ConflictException("Invalid seat number: " + seat);
            }
            if (row < 1 || row > maxRow || col < 'A' || col > 'D') {
                throw new ConflictException("Seat number out of range for this bus: " + seat);
            }
        }
    }

    private BookingResponse toResponse(Booking b) {
        Schedule s = b.getSchedule();
        List<String> seatNumbers = b.getSeats().stream().map(BookingSeat::getSeatNumber).sorted().toList();
        return new BookingResponse(
                b.getId(), s.getId(), s.getFromCity(), s.getToCity(), s.getJourneyDate(),
                s.getDepartureTime(), s.getArrivalTime(), s.getBus().getBusNumber(), s.getBus().getOperatorName(),
                seatNumbers, b.getStatus(), b.getTotalFare(), b.getBookedAt(), b.getCancelledAt()
        );
    }
}
