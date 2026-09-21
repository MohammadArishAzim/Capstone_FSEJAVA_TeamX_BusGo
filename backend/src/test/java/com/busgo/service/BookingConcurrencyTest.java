package com.busgo.service;

import com.busgo.dto.BookingDtos.BookingRequest;
import com.busgo.entity.Bus;
import com.busgo.entity.BusType;
import com.busgo.entity.Schedule;
import com.busgo.entity.User;
import com.busgo.exception.ConflictException;
import com.busgo.repository.BookingSeatRepository;
import com.busgo.repository.BusRepository;
import com.busgo.repository.ScheduleRepository;
import com.busgo.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Real-database integration tests for the booking invariant "a seat is never double-booked".
 * Mockito unit tests (BookingServiceTest) can only show the service *calls* the locking query;
 * only real concurrent transactions against a real database can show the lock actually
 * serializes them. Deliberately not @Transactional: each createBooking call must own and commit
 * its own transaction so the threads genuinely contend.
 */
@SpringBootTest
class BookingConcurrencyTest {

    @Autowired private BookingService bookingService;
    @Autowired private UserRepository userRepository;
    @Autowired private BusRepository busRepository;
    @Autowired private ScheduleRepository scheduleRepository;
    @Autowired private BookingSeatRepository bookingSeatRepository;

    private Schedule newSchedule() {
        Bus bus = busRepository.save(Bus.builder()
                .busNumber("CC-" + System.nanoTime()).operatorName("Concurrency Travels")
                .totalSeats(40).busType(BusType.SEATER).build());
        return scheduleRepository.save(Schedule.builder()
                .bus(bus).fromCity("Testville").toCity("Checkburg")
                .departureTime(LocalTime.of(9, 0)).arrivalTime(LocalTime.of(17, 0))
                .fare(new BigDecimal("500.00")).journeyDate(LocalDate.now().plusDays(5)).build());
    }

    private User newUser(String tag) {
        return userRepository.save(User.builder()
                .email(tag + "." + System.nanoTime() + "@example.com").password("x").name(tag).build());
    }

    @Test
    void manyConcurrentRequestsForTheSameSeat_exactlyOneWins() throws Exception {
        Schedule schedule = newSchedule();
        int threads = 8;
        List<User> users = new ArrayList<>();
        for (int i = 0; i < threads; i++) users.add(newUser("racer" + i));

        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch ready = new CountDownLatch(threads);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<String>> results = new ArrayList<>();
        for (User user : users) {
            results.add(pool.submit(() -> {
                ready.countDown();
                start.await();
                try {
                    bookingService.createBooking(user, new BookingRequest(schedule.getId(), List.of("3B")));
                    return "BOOKED";
                } catch (ConflictException e) {
                    return "CONFLICT";
                }
            }));
        }
        assertThat(ready.await(10, TimeUnit.SECONDS)).isTrue();
        start.countDown(); // release every thread at once
        List<String> outcomes = new ArrayList<>();
        for (Future<String> f : results) outcomes.add(f.get(30, TimeUnit.SECONDS));
        pool.shutdown();

        assertThat(outcomes).containsOnlyOnce("BOOKED");
        assertThat(outcomes.stream().filter("CONFLICT"::equals).count()).isEqualTo(threads - 1);
        assertThat(bookingSeatRepository.findBookedSeatNumbers(schedule.getId())).containsExactly("3B");
    }

    @Test
    void concurrentRequestsForDifferentSeats_allSucceed() throws Exception {
        Schedule schedule = newSchedule();
        List<String> seats = List.of("1A", "1B", "1C", "1D");
        ExecutorService pool = Executors.newFixedThreadPool(seats.size());
        CountDownLatch start = new CountDownLatch(1);
        List<Future<Void>> results = new ArrayList<>();
        for (String seat : seats) {
            User user = newUser("solo-" + seat);
            results.add(pool.submit(() -> {
                start.await();
                bookingService.createBooking(user, new BookingRequest(schedule.getId(), List.of(seat)));
                return null;
            }));
        }
        start.countDown();
        for (Future<Void> f : results) f.get(30, TimeUnit.SECONDS); // any exception fails the test
        pool.shutdown();

        assertThat(bookingSeatRepository.findBookedSeatNumbers(schedule.getId()))
                .containsExactlyInAnyOrderElementsOf(seats);
    }

    @Test
    void cancellingFreesTheSeatForRebooking() {
        Schedule schedule = newSchedule();
        User first = newUser("first");
        User second = newUser("second");

        var booking = bookingService.createBooking(first, new BookingRequest(schedule.getId(), List.of("7C")));
        bookingService.cancel(first, booking.id());
        bookingService.createBooking(second, new BookingRequest(schedule.getId(), List.of("7C")));

        assertThat(bookingSeatRepository.findBookedSeatNumbers(schedule.getId())).containsExactly("7C");
    }
}
