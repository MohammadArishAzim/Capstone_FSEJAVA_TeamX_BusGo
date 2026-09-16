package com.busgo.repository;

import com.busgo.entity.Schedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface ScheduleRepository extends JpaRepository<Schedule, Long> {

    @Query("SELECT s FROM Schedule s WHERE LOWER(s.fromCity) = LOWER(:fromCity) " +
           "AND LOWER(s.toCity) = LOWER(:toCity) AND s.journeyDate = :journeyDate " +
           "ORDER BY s.departureTime ASC")
    List<Schedule> search(@Param("fromCity") String fromCity,
                           @Param("toCity") String toCity,
                           @Param("journeyDate") LocalDate journeyDate);

    boolean existsByBusId(Long busId);
}
