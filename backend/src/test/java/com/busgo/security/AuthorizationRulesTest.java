package com.busgo.security;

import com.busgo.entity.User;
import com.busgo.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.web.context.WebApplicationContext;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.webAppContextSetup;

/**
 * Locks in the authorization rules through the REAL security filter chain and real JWTs.
 * Regression guard for a bug where requestMatchers("GET", "/api/buses", ...) passed "GET" as a
 * URL pattern (String varargs), silently making those routes public for every HTTP method:
 * anonymous POST /api/buses returned 201.
 */
@SpringBootTest
class AuthorizationRulesTest {

    private static final String BUS_BODY = "{\"busNumber\":\"%s\",\"operatorName\":\"Op\",\"totalSeats\":40,\"busType\":\"SEATER\"}";
    private static final String SCHEDULE_BODY =
            "{\"busId\":1,\"fromCity\":\"A\",\"toCity\":\"B\",\"departureTime\":\"09:00:00\","
                    + "\"arrivalTime\":\"17:00:00\",\"fare\":100,\"journeyDate\":\"2030-01-01\"}";

    @Autowired private WebApplicationContext context;
    @Autowired private JwtService jwtService;
    @Autowired private UserRepository userRepository;

    private MockMvc mvc;
    private String passengerToken;
    private String adminToken;

    @BeforeEach
    void setUp() {
        mvc = webAppContextSetup(context).apply(springSecurity()).build();
        String email = "authz." + System.nanoTime() + "@example.com";
        userRepository.save(User.builder().email(email).password("x").name("Passenger").build());
        passengerToken = jwtService.generateToken(email, false);
        adminToken = jwtService.generateToken("admin@busgo.com", true); // seeded by DataSeeder
    }

    private int status(HttpMethod method, String path, String body, String token) throws Exception {
        MockHttpServletRequestBuilder req = request(method, path);
        if (body != null) req.contentType(MediaType.APPLICATION_JSON).content(body);
        if (token != null) req.header("Authorization", "Bearer " + token);
        return mvc.perform(req).andReturn().getResponse().getStatus();
    }

    /** Every admin-only write, listed once so anonymous / passenger / admin are all checked against it. */
    static final String WRITES = """
            POST,/api/buses
            PUT,/api/buses/1
            DELETE,/api/buses/999999
            POST,/api/schedules
            PUT,/api/schedules/1
            DELETE,/api/schedules/999999
            GET,/api/schedules/all
            """;

    private String bodyFor(String path) {
        if (path.startsWith("/api/buses")) return String.format(BUS_BODY, "AZ-" + System.nanoTime());
        return path.startsWith("/api/schedules") ? SCHEDULE_BODY : null;
    }

    @ParameterizedTest(name = "anonymous {0} {1} -> 401")
    @CsvSource(textBlock = WRITES)
    void anonymousCannotUseAdminEndpoints(String method, String path) throws Exception {
        assertThat(status(HttpMethod.valueOf(method), path, bodyFor(path), null)).isEqualTo(401);
    }

    @ParameterizedTest(name = "passenger {0} {1} -> 403")
    @CsvSource(textBlock = WRITES)
    void passengerCannotUseAdminEndpoints(String method, String path) throws Exception {
        assertThat(status(HttpMethod.valueOf(method), path, bodyFor(path), passengerToken)).isEqualTo(403);
    }

    @ParameterizedTest(name = "admin {0} {1} passes security")
    @CsvSource(textBlock = WRITES)
    void adminIsNotBlockedBySecurity(String method, String path) throws Exception {
        int s = status(HttpMethod.valueOf(method), path, bodyFor(path), adminToken);
        assertThat(s).isNotIn(401, 403); // 201/200/404/400... = reached the controller
    }

    @Test
    void adminCanActuallyCreateABus() throws Exception {
        assertThat(status(HttpMethod.POST, "/api/buses", String.format(BUS_BODY, "AZ-" + System.nanoTime()), adminToken))
                .isEqualTo(201);
    }

    @Test
    void publicReadEndpointsStayPublic() throws Exception {
        assertThat(status(HttpMethod.GET, "/api/buses", null, null)).isEqualTo(200);
        assertThat(status(HttpMethod.GET, "/api/schedules?from=a&to=b&date=2030-01-01", null, null)).isEqualTo(200);
        assertThat(status(HttpMethod.GET, "/api/schedules/999999/seats", null, null)).isNotIn(401, 403);
    }

    @Test
    void bookingsRequireLogin() throws Exception {
        assertThat(status(HttpMethod.GET, "/api/bookings/mine", null, null)).isEqualTo(401);
        assertThat(status(HttpMethod.POST, "/api/bookings", "{\"scheduleId\":1,\"seatNumbers\":[\"1A\"]}", null)).isEqualTo(401);
        assertThat(status(HttpMethod.PUT, "/api/bookings/1/cancel", null, null)).isEqualTo(401);
        assertThat(status(HttpMethod.GET, "/api/bookings/mine", null, passengerToken)).isEqualTo(200);
    }
}
