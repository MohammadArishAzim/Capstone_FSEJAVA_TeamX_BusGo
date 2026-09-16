package com.busgo.repository;

import com.busgo.entity.Schedule;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ScheduleRepository extends JpaRepository<Schedule, Long> {

    @Query("SELECT s FROM Schedule s WHERE LOWER(s.fromCity) = LOWER(:fromCity) " +
           "AND LOWER(s.toCity) = LOWER(:toCity) AND s.journeyDate = :journeyDate " +
           "ORDER BY s.departureTime ASC")
    List<Schedule> search(@Param("fromCity") String fromCity,
                           @Param("toCity") String toCity,
                           @Param("journeyDate") LocalDate journeyDate);

    boolean existsByBusId(Long busId);

    /**
     * Locks the schedule row (SELECT ... FOR UPDATE) for the duration of the caller's
     * transaction. Used by booking creation so that two concurrent requests for the same
     * schedule's seats serialize instead of both passing the "is this seat free" check before
     * either has committed its insert -- see BookingService.createBooking.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM Schedule s WHERE s.id = :id")
    Optional<Schedule> findByIdForUpdate(@Param("id") Long id);
}
