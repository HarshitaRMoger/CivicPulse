package com.civicpulse.controller;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.civicpulse.entity.Issue;
import com.civicpulse.entity.IssueStatus;
import com.civicpulse.entity.IssueStatusHistory;
import com.civicpulse.entity.Notification;
import com.civicpulse.entity.Role;
import com.civicpulse.entity.User;
import com.civicpulse.repository.IssueRepository;
import com.civicpulse.repository.IssueStatusHistoryRepository;
import com.civicpulse.repository.NotificationRepository;
import com.civicpulse.repository.UserRepository;

@RestController
@RequestMapping("/api/area-admin")
public class AreaAdminController {

    private final UserRepository userRepository;
    private final IssueRepository issueRepository;
    private final IssueStatusHistoryRepository historyRepository;
    private final NotificationRepository notificationRepository;

    public AreaAdminController(
            UserRepository userRepository,
            IssueRepository issueRepository,
            IssueStatusHistoryRepository historyRepository,
            NotificationRepository notificationRepository) {

        this.userRepository = userRepository;
        this.issueRepository = issueRepository;
        this.historyRepository = historyRepository;
        this.notificationRepository = notificationRepository;
    }

    // ==========================================
    // 1. GET LOGGED-IN ADMIN PROFILE
    // GET /api/area-admin/me
    // ==========================================

    @GetMapping("/me")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getMyProfile(
            Authentication authentication) {

        User admin = getAuthenticatedAdmin(authentication);

        if (admin == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Please log in"));
        }

        if (admin.getRole() != Role.AREA_ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Area admin access required"));
        }

        if (admin.getLocality() == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message",
                            "No locality assigned to this admin"));
        }

        if (!admin.getLocality().isActive()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message",
                            "Your assigned locality is inactive"));
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("id", admin.getId());
        response.put("fullName", admin.getFullName());
        response.put("email", admin.getEmail());
        response.put("role", admin.getRole().name());
        response.put("localityId", admin.getLocality().getId());
        response.put("localityName", admin.getLocality().getName());

        return ResponseEntity.ok(response);
    }

    // ==========================================
    // 2. GET ISSUES FOR THE ADMIN'S LOCALITY
    // GET /api/area-admin/issues
    // ==========================================

    @GetMapping("/issues")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getLocalityIssues(
            Authentication authentication) {

        User admin = getAuthenticatedAdmin(authentication);

        if (admin == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Please log in"));
        }

        if (admin.getRole() != Role.AREA_ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message",
                            "Area admin access required"));
        }

        if (admin.getLocality() == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message",
                            "No locality assigned to this admin"));
        }

        if (!admin.getLocality().isActive()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message",
                            "Your assigned locality is inactive"));
        }

        Long localityId = admin.getLocality().getId();

        List<Map<String, Object>> reports = issueRepository
                .findByLocalityIdOrderByCreatedAtDesc(localityId)
                .stream()
                .map(issue -> {

                    Map<String, Object> report =
                            new LinkedHashMap<>();

                    report.put("id", issue.getId());
                    report.put("category", issue.getCategory());
                    report.put("description", issue.getDescription());
                    report.put("status", issue.getStatus().name());
                    report.put("createdAt", issue.getCreatedAt());
                    report.put(
                            "localityName",
                            issue.getLocality().getName());

                    boolean hasPhoto =
                            issue.getPhotoPath() != null
                            && !issue.getPhotoPath().isBlank();

                    report.put("photoUploaded", hasPhoto);

                    report.put(
                            "photoUrl",
                            hasPhoto
                                    ? "/api/area-admin/issues/"
                                            + issue.getId() + "/photo"
                                    : null);

                    return report;
                })
                .toList();

        return ResponseEntity.ok(reports);
    }

    // ==========================================
    // 3. UPDATE ISSUE STATUS, SAVE HISTORY
    //    AND CREATE CITIZEN NOTIFICATION
    // PUT /api/area-admin/issues/{issueId}/status
    // ==========================================

    @PutMapping("/issues/{issueId}/status")
    @Transactional
    public ResponseEntity<?> updateIssueStatus(
            Authentication authentication,
            @PathVariable Long issueId,
            @RequestBody Map<String, String> request) {

        User admin = getAuthenticatedAdmin(authentication);

        if (admin == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Please log in"));
        }

        if (admin.getRole() != Role.AREA_ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message",
                            "Area admin access required"));
        }

        if (admin.getLocality() == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message",
                            "No locality assigned to this admin"));
        }

        if (!admin.getLocality().isActive()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message",
                            "Your assigned locality is inactive"));
        }

        Issue issue = issueRepository.findById(issueId)
                .orElse(null);

        if (issue == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Issue not found"));
        }

        // Admins can update only issues in their assigned locality.
        if (issue.getLocality() == null
                || !admin.getLocality().getId()
                        .equals(issue.getLocality().getId())) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                            "message",
                            "You can update issues only in your assigned locality"));
        }

        String statusValue = request == null
                ? null
                : request.get("status");

        if (statusValue == null || statusValue.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Status is required"));
        }

        IssueStatus newStatus;

        try {
            newStatus = IssueStatus.valueOf(
                    statusValue.trim().toUpperCase(Locale.ROOT));

        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Invalid status. Allowed values: "
                                    + "SUBMITTED, UNDER_REVIEW, "
                                    + "IN_PROGRESS, RESOLVED, REJECTED"));
        }

        String remarks = request == null
                ? null
                : request.get("remarks");

        if (remarks != null) {
            remarks = remarks.trim();

            if (remarks.isEmpty()) {
                remarks = null;
            }

            if (remarks != null && remarks.length() > 250) {
                return ResponseEntity.badRequest()
                        .body(Map.of(
                                "message",
                                "Remarks must not exceed 250 characters"));
            }
        }

        // Capture the existing status before updating.
        IssueStatus previousStatus = issue.getStatus();

        // Do not create duplicate history or notifications
        // when the requested status is unchanged.
        if (previousStatus == newStatus) {

            Map<String, Object> response =
                    new LinkedHashMap<>();

            response.put("message",
                    "Issue already has this status");
            response.put("issueId", issue.getId());
            response.put("status", issue.getStatus().name());

            return ResponseEntity.ok(response);
        }

        // Update and save the issue.
        issue.setStatus(newStatus);
        issueRepository.save(issue);

        // Save status history.
        IssueStatusHistory history =
                new IssueStatusHistory();

        history.setIssue(issue);
        history.setPreviousStatus(previousStatus);
        history.setNewStatus(newStatus);
        history.setChangedBy(admin);
        history.setRemarks(remarks);

        historyRepository.save(history);

        // Create a notification for the citizen who reported
        // this issue.
        Notification notification = new Notification();

        notification.setCitizen(issue.getCitizen());
        notification.setIssue(issue);

        String category = issue.getCategory()
                .toLowerCase(Locale.ROOT)
                .replace("_", " ");

        String readableStatus =
                newStatus.name().replace("_", " ");

        notification.setMessage(
                "Your " + category
                        + " issue has been updated to "
                        + readableStatus
                        + " by " + admin.getFullName() + ".");

        notificationRepository.save(notification);

        // Return the update result.
        Map<String, Object> response =
                new LinkedHashMap<>();

        response.put(
                "message",
                "Issue status updated and citizen notified successfully");

        response.put("issueId", issue.getId());
        response.put("previousStatus", previousStatus.name());
        response.put("status", newStatus.name());
        response.put("remarks", remarks);

        return ResponseEntity.ok(response);
    }

    // ==========================================
    // 4. VIEW ISSUE PHOTO
    // GET /api/area-admin/issues/{issueId}/photo
    // ==========================================

    @GetMapping("/issues/{issueId}/photo")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getIssuePhoto(
            Authentication authentication,
            @PathVariable Long issueId) {

        User admin = getAuthenticatedAdmin(authentication);

        if (admin == null) {
            return ResponseEntity.status(
                    HttpStatus.UNAUTHORIZED).build();
        }

        if (admin.getRole() != Role.AREA_ADMIN
                || admin.getLocality() == null) {

            return ResponseEntity.status(
                    HttpStatus.FORBIDDEN).build();
        }

        if (!admin.getLocality().isActive()) {
            return ResponseEntity.status(
                    HttpStatus.FORBIDDEN).build();
        }

        Issue issue = issueRepository.findById(issueId)
                .orElse(null);

        // Prevent viewing photos from another locality.
        if (issue == null
                || issue.getLocality() == null
                || !admin.getLocality().getId()
                        .equals(issue.getLocality().getId())) {

            return ResponseEntity.notFound().build();
        }

        String storedPhotoPath = issue.getPhotoPath();

        if (storedPhotoPath == null
                || storedPhotoPath.isBlank()) {

            return ResponseEntity.notFound().build();
        }

        try {
            Path uploadRoot = Path.of("uploads", "issues")
                    .toAbsolutePath()
                    .normalize();

            Path fileName =
                    Path.of(storedPhotoPath).getFileName();

            if (fileName == null
                    || !fileName.toString().equals(storedPhotoPath)
                    || storedPhotoPath.contains("/")
                    || storedPhotoPath.contains("\\")) {

                return ResponseEntity.notFound().build();
            }

            Path photoPath =
                    uploadRoot.resolve(fileName).normalize();

            if (!photoPath.startsWith(uploadRoot)
                    || !Files.isRegularFile(photoPath)) {

                return ResponseEntity.notFound().build();
            }

            String contentType =
                    Files.probeContentType(photoPath);

            if (contentType == null
                    || !contentType.matches(
                            "image/(jpeg|png|webp)")) {

                return ResponseEntity.status(
                        HttpStatus.UNSUPPORTED_MEDIA_TYPE).build();
            }

            Resource resource =
                    new UrlResource(photoPath.toUri());

            return ResponseEntity.ok()
                    .header("X-Content-Type-Options", "nosniff")
                    .contentType(
                            MediaType.parseMediaType(contentType))
                    .body(resource);

        } catch (Exception exception) {
            return ResponseEntity.internalServerError().build();
        }
    }

    // ==========================================
    // HELPER: GET CURRENT USER
    // ==========================================

    private User getAuthenticatedAdmin(
            Authentication authentication) {

        if (authentication == null
                || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getName())) {

            return null;
        }

        User user = userRepository
                .findByEmailIgnoreCase(authentication.getName())
                .orElse(null);

        if (user == null || !user.isActive()) {
            return null;
        }

        return user;
    }
}