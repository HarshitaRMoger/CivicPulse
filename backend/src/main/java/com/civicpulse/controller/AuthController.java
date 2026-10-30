
package com.civicpulse.controller;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.civicpulse.dto.LoginRequest;
import com.civicpulse.dto.RegisterRequest;
import com.civicpulse.entity.User;
import com.civicpulse.repository.UserRepository;
import com.civicpulse.service.AuthService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;

    public AuthController(
            AuthService authService,
            UserRepository userRepository) {
        this.authService = authService;
        this.userRepository = userRepository;
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String, String>> register(
            @Valid @RequestBody RegisterRequest request) {
        try {
            String message = authService.register(request);

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(Map.of("message", message));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, String>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {
        try {
            authService.login(
                    request.getEmail(),
                    request.getPassword());

            User user = userRepository
                    .findByEmailIgnoreCase(request.getEmail().trim())
                    .orElseThrow(() ->
                            new IllegalArgumentException(
                                    "Invalid email or password"));

            if (!user.isActive()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("message", "Account is inactive"));
            }

            // Prevent session fixation after authentication.
            HttpSession existingSession = httpRequest.getSession(false);

if (existingSession != null) {
    httpRequest.changeSessionId();
}

            Authentication authentication =
                    org.springframework.security.authentication
                            .UsernamePasswordAuthenticationToken
                            .authenticated(
                                    user.getEmail(),
                                    null,
                                    java.util.List.of(
                                            new org.springframework.security.core.authority
                                                    .SimpleGrantedAuthority(
                                                            "ROLE_" + user.getRole().name())));

            SecurityContext context =
                    SecurityContextHolder.createEmptyContext();
            context.setAuthentication(authentication);
            SecurityContextHolder.setContext(context);

            HttpSession session = httpRequest.getSession(true);
            session.setAttribute(
                    HttpSessionSecurityContextRepository
                            .SPRING_SECURITY_CONTEXT_KEY,
                    context);

            String dashboard = switch (user.getRole()) {
                case CITIZEN -> "/citizen-dashboard.html";
                case AREA_ADMIN -> "/area-admin-dashboard.html";
                case SUPER_ADMIN -> "/super-admin-dashboard.html";
            };

            return ResponseEntity.ok(Map.of(
                    "message", "Login successful",
                    "role", user.getRole().name(),
                    "redirectUrl", dashboard
            ));

        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(
                            "message", "Invalid email or password"));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(
            HttpServletRequest request) {

        SecurityContextHolder.clearContext();

        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }

        return ResponseEntity.ok(
                Map.of("message", "Logged out successfully"));
    }
}
