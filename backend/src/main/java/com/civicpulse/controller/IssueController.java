
package com.civicpulse.controller;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.civicpulse.entity.Issue;
import com.civicpulse.entity.User;
import com.civicpulse.repository.IssueRepository;
import com.civicpulse.repository.UserRepository;
import com.civicpulse.service.IssueService;

@RestController
@RequestMapping("/api/citizen/issues")
public class IssueController {

    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024;

    private static final Set<String> ALLOWED_TYPES =
            Set.of("image/jpeg", "image/png", "image/webp");

    private final IssueService issueService;
    private final IssueRepository issueRepository;
    private final UserRepository userRepository;

    public IssueController(
            IssueService issueService,
            IssueRepository issueRepository,
            UserRepository userRepository) {

        this.issueService = issueService;
        this.issueRepository = issueRepository;
        this.userRepository = userRepository;
    }

    // ==========================================
    // 1. SUBMIT A NEW CIVIC ISSUE
    // POST /api/citizen/issues
    // ==========================================

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> createIssue(
            Authentication authentication,
            @RequestParam("category") String category,
            @RequestParam("description") String description,
            @RequestParam(value = "photo", required = false)
                    MultipartFile photo) {

        if (authentication == null
                || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Please log in"));
        }

        String photoFilename = null;

        try {
            if (photo != null && !photo.isEmpty()) {

                if (photo.getSize() > MAX_FILE_SIZE) {
                    return ResponseEntity.badRequest()
                            .body(Map.of(
                                    "message",
                                    "Photo must be 5 MB or smaller"));
                }

                String contentType = photo.getContentType();

                if (contentType == null
                        || !ALLOWED_TYPES.contains(
                                contentType.toLowerCase(Locale.ROOT))) {

                    return ResponseEntity.badRequest()
                            .body(Map.of(
                                    "message",
                                    "Upload a JPG, PNG, or WebP image"));
                }

                String extension = switch (
                        contentType.toLowerCase(Locale.ROOT)) {
                    case "image/jpeg" -> ".jpg";
                    case "image/png" -> ".png";
                    case "image/webp" -> ".webp";
                    default -> throw new IllegalArgumentException(
                            "Unsupported image type");
                };

                Path uploadDirectory = Paths.get("uploads", "issues")
                        .toAbsolutePath()
                        .normalize();

                Files.createDirectories(uploadDirectory);

                String filename = UUID.randomUUID() + extension;

                Path destination = uploadDirectory
                        .resolve(filename)
                        .normalize();

                if (!destination.startsWith(uploadDirectory)
                        || !destination.getParent().equals(uploadDirectory)) {
                    return ResponseEntity.badRequest()
                            .body(Map.of(
                                    "message",
                                    "Invalid photo filename"));
                }

                Files.copy(
                        photo.getInputStream(),
                        destination,
                        StandardCopyOption.REPLACE_EXISTING);

                photoFilename = filename;
            }

            Issue issue = issueService.createIssue(
                    authentication.getName(),
                    category,
                    description,
                    photoFilename);

            Map<String, Object> response = new LinkedHashMap<>();

            response.put("message", "Issue submitted successfully");
            response.put("issueId", issue.getId());
            response.put("category", issue.getCategory());
            response.put("status", issue.getStatus().name());
            response.put("photoUploaded", photoFilename != null);

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(response);

        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", exception.getMessage()));

        } catch (IOException exception) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Unable to save the photo"));
        }
    }

    // ==========================================
    // 2. GET THE LOGGED-IN CITIZEN'S REPORTS
    // GET /api/citizen/issues
    // ==========================================

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<?> getMyIssues(
            Authentication authentication) {

        if (authentication == null
                || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Please log in"));
        }

        User citizen = userRepository
                .findByEmailIgnoreCase(authentication.getName())
                .orElse(null);

        if (citizen == null || !citizen.isActive()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(
                            "message",
                            "Citizen account not available"));
        }

        List<Map<String, Object>> reports = issueRepository
                .findByCitizenIdOrderByCreatedAtDesc(citizen.getId())
                .stream()
                .map(issue -> {

                    Map<String, Object> report = new LinkedHashMap<>();

                    report.put("id", issue.getId());
                    report.put("category", issue.getCategory());
                    report.put("description", issue.getDescription());
                    report.put("status", issue.getStatus().name());
                    report.put("createdAt", issue.getCreatedAt());
                    report.put(
                            "localityName",
                            issue.getLocality().getName());

                    boolean hasPhoto = issue.getPhotoPath() != null
                            && !issue.getPhotoPath().isBlank();

                    report.put("photoUploaded", hasPhoto);

                    if (hasPhoto) {
                        report.put(
                                "photoUrl",
                                "/api/citizen/issues/"
                                        + issue.getId()
                                        + "/photo");
                    } else {
                        report.put("photoUrl", null);
                    }

                    return report;
                })
                .toList();

        return ResponseEntity.ok(reports);
    }

    // ==========================================
    // 3. VIEW A PHOTO BELONGING TO YOUR OWN ISSUE
    // GET /api/citizen/issues/{issueId}/photo
    // ==========================================

    @GetMapping("/{issueId}/photo")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getIssuePhoto(
            Authentication authentication,
            @PathVariable Long issueId) {

        if (authentication == null
                || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Please log in"));
        }

        User citizen = userRepository
                .findByEmailIgnoreCase(authentication.getName())
                .orElse(null);

        if (citizen == null || !citizen.isActive()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(
                            "message",
                            "Citizen account not available"));
        }

        Issue issue = issueRepository.findById(issueId).orElse(null);

        // Citizens can only view photos from their own issues.
        if (issue == null
                || issue.getCitizen() == null
                || !issue.getCitizen().getId().equals(citizen.getId())) {
            return ResponseEntity.notFound().build();
        }

        String filename = issue.getPhotoPath();

        // Only allow filenames in the expected UUID-image format.
        if (filename == null
                || !filename.matches(
                        "[a-fA-F0-9-]+\\.(jpg|png|webp)")) {
            return ResponseEntity.notFound().build();
        }

        try {
            Path uploadDirectory = Paths.get("uploads", "issues")
                    .toAbsolutePath()
                    .normalize();

            Path photoFile = uploadDirectory
                    .resolve(filename)
                    .normalize();

            if (!photoFile.startsWith(uploadDirectory)
                    || !Files.isRegularFile(photoFile)) {
                return ResponseEntity.notFound().build();
            }

            MediaType mediaType = switch (
                    filename.substring(filename.lastIndexOf('.') + 1)
                            .toLowerCase(Locale.ROOT)) {
                case "jpg" -> MediaType.IMAGE_JPEG;
                case "png" -> MediaType.IMAGE_PNG;
                case "webp" -> MediaType.parseMediaType("image/webp");
                default -> null;
            };

            if (mediaType == null) {
                return ResponseEntity.notFound().build();
            }

            byte[] imageBytes = Files.readAllBytes(photoFile);

            return ResponseEntity.ok()
                    .contentType(mediaType)
                    .header(
                            HttpHeaders.CACHE_CONTROL,
                            "private, no-store")
                    .header(
                            "X-Content-Type-Options",
                            "nosniff")
                    .body(imageBytes);

        } catch (IOException exception) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Unable to read the photo"));
        }
    }
}
