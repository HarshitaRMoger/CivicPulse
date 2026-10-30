
package com.civicpulse.controller;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.civicpulse.entity.City;
import com.civicpulse.entity.Locality;
import com.civicpulse.entity.Role;
import com.civicpulse.entity.State;
import com.civicpulse.entity.User;
import com.civicpulse.repository.LocalityRepository;
import com.civicpulse.repository.UserRepository;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@RestController
@RequestMapping("/api/super-admin")
public class SuperAdminController {

    private final UserRepository userRepository;
    private final LocalityRepository localityRepository;
    private final PasswordEncoder passwordEncoder;

    public SuperAdminController(
            UserRepository userRepository,
            LocalityRepository localityRepository,
            PasswordEncoder passwordEncoder) {

        this.userRepository = userRepository;
        this.localityRepository = localityRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // List active localities with their city and state names.
  

@GetMapping("/localities")
@Transactional(readOnly = true)
public List<Map<String, Object>> getLocalities() {
    return localityRepository.findAll()
            .stream()
            .sorted((a, b) -> a.getName().compareToIgnoreCase(b.getName()))
            .map(locality -> {
                City city = locality.getCity();
                State state = city.getState();

                Map<String, Object> result = new LinkedHashMap<>();
                result.put("id", locality.getId());
                result.put("name", locality.getName());
                result.put("cityId", city.getId());
                result.put("cityName", city.getName());
                result.put("stateId", state.getId());
                result.put("stateName", state.getName());
                result.put("active", locality.isActive());

                return result;
            })
            .toList();
}

    // Create an area administrator assigned to one active locality.
    @PostMapping("/area-admins")
    @Transactional
    public Map<String, Object> createAreaAdmin(
            @Valid @RequestBody CreateAreaAdminRequest request) {

        String email = request.email().trim();

        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "An account with this email already exists.");
        }

        Locality locality = localityRepository
                .findById(request.localityId())
                .filter(Locality::isActive)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Please select a valid active locality."));

        User admin = new User();
        admin.setFullName(request.fullName().trim());
        admin.setEmail(email);
        admin.setPassword(passwordEncoder.encode(request.password()));
        admin.setRole(Role.AREA_ADMIN);
        admin.setLocality(locality);
        admin.setActive(true);

        User saved = userRepository.save(admin);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", saved.getId());
        result.put("fullName", saved.getFullName());
        result.put("email", saved.getEmail());
        result.put("role", saved.getRole().name());
        result.put("active", saved.isActive());
        result.put("localityId", locality.getId());
        result.put("localityName", locality.getName());
        result.put("message", "Area administrator created successfully.");

        return result;
    }

    public record CreateAreaAdminRequest(
            @NotBlank
            @Size(max = 100)
            String fullName,

            @NotBlank
            @Email
            @Size(max = 150)
            String email,

            @NotBlank
            @Size(min = 8, max = 72)
            String password,

            @NotNull
            Long localityId) {
    }

   
@GetMapping("/area-admins")
@Transactional(readOnly = true)
public List<Map<String, Object>> getAreaAdmins() {
    return userRepository.findAll().stream()
            .filter(user -> user.getRole() == Role.AREA_ADMIN)
            .map(user -> {
                Map<String, Object> result = new LinkedHashMap<>();
                result.put("id", user.getId());
                result.put("fullName", user.getFullName());
                result.put("email", user.getEmail());
                result.put("active", user.isActive());

                Locality locality = user.getLocality();
                result.put("localityId",
                        locality != null ? locality.getId() : null);
                result.put("localityName",
                        locality != null ? locality.getName() : "Not assigned");

                return result;
            })
            .toList();
}

@org.springframework.web.bind.annotation.PutMapping(
        "/area-admins/{id}/status")
@Transactional
public Map<String, Object> updateAreaAdminStatus(
        @org.springframework.web.bind.annotation.PathVariable Long id,
        @RequestBody Map<String, Boolean> request) {

    Boolean active = request.get("active");

    if (active == null) {
        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Active status is required.");
    }

    User admin = userRepository.findById(id)
            .filter(user -> user.getRole() == Role.AREA_ADMIN)
            .orElseThrow(() -> new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Area administrator not found."));

    admin.setActive(active);
    userRepository.save(admin);

    Map<String, Object> result = new LinkedHashMap<>();
    result.put("id", admin.getId());
    result.put("active", admin.isActive());
    result.put("message", "Area administrator status updated.");

    return result;
}

@org.springframework.web.bind.annotation.PutMapping(
        "/localities/{id}/status")
@Transactional
public Map<String, Object> updateLocalityStatus(
        @org.springframework.web.bind.annotation.PathVariable Long id,
        @RequestBody Map<String, Boolean> request) {

    Boolean active = request.get("active");

    if (active == null) {
        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Active status is required.");
    }

    Locality locality = localityRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Locality not found."));

    locality.setActive(active);
    localityRepository.save(locality);

    Map<String, Object> result = new LinkedHashMap<>();
    result.put("id", locality.getId());
    result.put("name", locality.getName());
    result.put("active", locality.isActive());
    result.put("message", "Locality status updated.");

    return result;
}

}
