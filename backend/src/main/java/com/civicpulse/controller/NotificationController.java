package com.civicpulse.controller;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.civicpulse.entity.Notification;
import com.civicpulse.entity.Role;
import com.civicpulse.entity.User;
import com.civicpulse.repository.NotificationRepository;
import com.civicpulse.repository.UserRepository;

@RestController
@RequestMapping("/api/citizen/notifications")
public class NotificationController {

    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;

    public NotificationController(
            UserRepository userRepository,
            NotificationRepository notificationRepository) {
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
    }

    private User getAuthenticatedCitizen(
            Authentication authentication) {

        if (authentication == null
                || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getName())) {
            return null;
        }

        User citizen = userRepository
                .findByEmailIgnoreCase(authentication.getName())
                .orElse(null);

        if (citizen == null
                || !citizen.isActive()
                || citizen.getRole() != Role.CITIZEN) {
            return null;
        }

        return citizen;
    }

    // GET /api/citizen/notifications
    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<?> getNotifications(
            Authentication authentication) {

        User citizen = getAuthenticatedCitizen(authentication);

        if (citizen == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message",
                            "Please log in as a citizen"));
        }

        List<Map<String, Object>> notifications =
                notificationRepository
                        .findByCitizenIdOrderByCreatedAtDesc(
                                citizen.getId())
                        .stream()
                        .map(this::toResponse)
                        .toList();

        return ResponseEntity.ok(notifications);
    }

    // GET /api/citizen/notifications/unread-count
    @GetMapping("/unread-count")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getUnreadCount(
            Authentication authentication) {

        User citizen = getAuthenticatedCitizen(authentication);

        if (citizen == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message",
                            "Please log in as a citizen"));
        }

        long unreadCount =
                notificationRepository
                        .countByCitizenIdAndReadFalse(
                                citizen.getId());

        return ResponseEntity.ok(
                Map.of("unreadCount", unreadCount));
    }

    // PATCH /api/citizen/notifications/{notificationId}/read
    @PatchMapping("/{notificationId}/read")
    @Transactional
    public ResponseEntity<?> markAsRead(
            Authentication authentication,
            @PathVariable Long notificationId) {

        User citizen = getAuthenticatedCitizen(authentication);

        if (citizen == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message",
                            "Please log in as a citizen"));
        }

        Notification notification =
                notificationRepository.findById(notificationId)
                        .orElse(null);

        if (notification == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message",
                            "Notification not found"));
        }

        // Citizens can only mark their own notifications as read.
        if (notification.getCitizen() == null
                || !citizen.getId().equals(
                        notification.getCitizen().getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message",
                            "You cannot access this notification"));
        }

        notification.setRead(true);
        notificationRepository.save(notification);

        return ResponseEntity.ok(
                Map.of("message",
                        "Notification marked as read"));
    }

    private Map<String, Object> toResponse(
            Notification notification) {

        Map<String, Object> response =
                new LinkedHashMap<>();

        response.put("id", notification.getId());
        response.put("issueId",
                notification.getIssue().getId());
        response.put("message", notification.getMessage());
        response.put("read", notification.isRead());
        response.put("createdAt", notification.getCreatedAt());

        return response;
    }
}