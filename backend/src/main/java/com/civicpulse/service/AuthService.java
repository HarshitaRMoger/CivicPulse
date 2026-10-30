
package com.civicpulse.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.civicpulse.dto.RegisterRequest;
import com.civicpulse.entity.Locality;
import com.civicpulse.entity.Role;
import com.civicpulse.entity.User;
import com.civicpulse.repository.LocalityRepository;
import com.civicpulse.repository.UserRepository;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final LocalityRepository localityRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthService(
            UserRepository userRepository,
            LocalityRepository localityRepository,
            PasswordEncoder passwordEncoder) {

        this.userRepository = userRepository;
        this.localityRepository = localityRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public String register(RegisterRequest request) {

        String email = request.getEmail()
                .trim()
                .toLowerCase();

        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new IllegalArgumentException(
                    "Email is already registered");
        }

        // Find the selected locality
        Locality locality = localityRepository
                .findById(request.getLocalityId())
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Selected locality does not exist"));

        // Citizens can register only in active localities
        if (!locality.isActive()) {
            throw new IllegalArgumentException(
                    "Selected locality is currently inactive");
        }

        User user = new User();

        user.setFullName(request.getFullName().trim());
        user.setEmail(email);
        user.setPassword(
                passwordEncoder.encode(request.getPassword()));
        user.setRole(Role.CITIZEN);
        user.setLocality(locality);
        user.setActive(true);

        userRepository.save(user);

        return "Citizen registered successfully";
    }

    @Transactional(readOnly = true)
    public boolean login(String email, String rawPassword) {

        User user = userRepository
                .findByEmailIgnoreCase(email.trim())
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Invalid email or password"));

        if (!user.isActive()
                || !passwordEncoder.matches(
                        rawPassword, user.getPassword())) {

            throw new IllegalArgumentException(
                    "Invalid email or password");
        }

        return true;
    }
}
