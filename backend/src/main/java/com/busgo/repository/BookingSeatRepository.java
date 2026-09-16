package com.busgo.repository;

import com.busgo.entity.BookingSeat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface BookingSeatRepository extends JpaRepository<BookingSeat, Long> {

    /**
     * Seat numbers currently held (non-cancelled bookings) for a given schedule.
     * This is the source of truth for "which seats are booked" — derived, not a separate Seat table.
     */
    @Query("SELECT bs.seatNumber FROM BookingSeat bs " +
           "WHERE bs.booking.schedule.id = :scheduleId " +
           "AND bs.booking.status = com.busgo.entity.BookingStatus.BOOKED")
    List<String> findBookedSeatNumbers(@Param("scheduleId") Long scheduleId);
}
