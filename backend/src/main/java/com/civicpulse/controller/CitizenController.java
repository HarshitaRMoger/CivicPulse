
package com.civicpulse.controller;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.civicpulse.entity.User;
import com.civicpulse.repository.UserRepository;

@RestController
@RequestMapping("/api/citizen")
public class CitizenController {

    private final UserRepository userRepository;

    public CitizenController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    @GetMapping("/me")
    public ResponseEntity<?> getProfile(Authentication authentication) {

        // Check whether the user is logged in
        if (authentication == null
                || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Please log in"));
        }

        // Find the logged-in user
        User user = userRepository
                .findByEmailIgnoreCase(authentication.getName())
                .orElse(null);

        // Check whether the account exists and is active
        if (user == null || !user.isActive()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Account not available"));
        }

        // Load the locality while the database transaction is active
        String localityName = user.getLocality() != null
                ? user.getLocality().getName()
                : "Not assigned";

        // Return the citizen's profile
        return ResponseEntity.ok(Map.of(
                "fullName", user.getFullName(),
                "email", user.getEmail(),
                "role", user.getRole().name(),
                "localityName", localityName
        ));
    }
}
