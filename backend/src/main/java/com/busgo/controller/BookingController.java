package com.busgo.controller;

import com.busgo.dto.BookingDtos.BookingRequest;
import com.busgo.dto.BookingDtos.BookingResponse;
import com.busgo.entity.User;
import com.busgo.repository.UserRepository;
import com.busgo.security.UserPrincipal;
import com.busgo.service.BookingService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
@Tag(name = "Bookings", description = "Create, list and cancel bookings (authenticated users)")
public class BookingController {

    private final BookingService bookingService;
    private final UserRepository userRepository;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BookingResponse create(@AuthenticationPrincipal UserPrincipal principal,
                                   @Valid @RequestBody BookingRequest request) {
        User user = currentUser(principal);
        return bookingService.createBooking(user, request);
    }

    @GetMapping("/mine")
    public List<BookingResponse> mine(@AuthenticationPrincipal UserPrincipal principal) {
        User user = currentUser(principal);
        return bookingService.findMine(user);
    }

    @PutMapping("/{id}/cancel")
    public BookingResponse cancel(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id) {
        User user = currentUser(principal);
        return bookingService.cancel(user, id);
    }

    private User currentUser(UserPrincipal principal) {
        return userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found in database"));
    }
}
