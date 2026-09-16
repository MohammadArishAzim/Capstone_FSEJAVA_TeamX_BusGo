package com.busgo.service;

import com.busgo.dto.AuthDtos.AuthResponse;
import com.busgo.dto.AuthDtos.LoginRequest;
import com.busgo.dto.AuthDtos.RegisterRequest;
import com.busgo.entity.User;
import com.busgo.exception.ConflictException;
import com.busgo.repository.UserRepository;
import com.busgo.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new ConflictException("An account with this email already exists");
        }
        User user = User.builder()
                .email(request.email().toLowerCase())
                .password(passwordEncoder.encode(request.password()))
                .name(request.name())
                .isAdmin(false)
                .build();
        userRepository.save(user);
        String token = jwtService.generateToken(user.getEmail(), user.isAdmin());
        return new AuthResponse(token, user.getEmail(), user.getName(), user.isAdmin());
    }

    public AuthResponse login(LoginRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.email().toLowerCase(), request.password()));
        } catch (org.springframework.security.core.AuthenticationException ex) {
            throw new BadCredentialsException("Invalid email or password");
        }

        User user = userRepository.findByEmail(request.email().toLowerCase())
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        String token = jwtService.generateToken(user.getEmail(), user.isAdmin());
        return new AuthResponse(token, user.getEmail(), user.getName(), user.isAdmin());
    }
}
