
package com.civicpulse.controller;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.civicpulse.entity.Issue;
import com.civicpulse.entity.IssueStatusHistory;
import com.civicpulse.entity.Role;
import com.civicpulse.entity.User;
import com.civicpulse.repository.IssueRepository;
import com.civicpulse.repository.IssueStatusHistoryRepository;
import com.civicpulse.repository.UserRepository;

@RestController
@RequestMapping("/api/citizen/issues")
public class IssueStatusHistoryController {

    private final UserRepository userRepository;
    private final IssueRepository issueRepository;
    private final IssueStatusHistoryRepository historyRepository;

    public IssueStatusHistoryController(
            UserRepository userRepository,
            IssueRepository issueRepository,
            IssueStatusHistoryRepository historyRepository) {
        this.userRepository = userRepository;
        this.issueRepository = issueRepository;
        this.historyRepository = historyRepository;
    }

    // GET /api/citizen/issues/{issueId}/history
    @GetMapping("/{issueId}/history")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getIssueStatusHistory(
            Authentication authentication,
            @PathVariable Long issueId) {

        if (authentication == null
                || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getName())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Please log in"));
        }

        User citizen = userRepository
                .findByEmailIgnoreCase(authentication.getName())
                .orElse(null);

        if (citizen == null || !citizen.isActive()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Please log in"));
        }

        if (citizen.getRole() != Role.CITIZEN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Citizen access required"));
        }

        Issue issue = issueRepository.findById(issueId).orElse(null);

        if (issue == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Issue not found"));
        }

        // Citizens may view history only for issues they reported.
        if (issue.getCitizen() == null
                || !citizen.getId().equals(issue.getCitizen().getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                            "message",
                            "You can view history only for your own issues"));
        }

        List<Map<String, Object>> history = historyRepository
                .findByIssueIdOrderByChangedAtAsc(issueId)
                .stream()
                .map(this::toHistoryResponse)
                .toList();

        return ResponseEntity.ok(history);
    }

    private Map<String, Object> toHistoryResponse(
            IssueStatusHistory record) {

        Map<String, Object> item = new LinkedHashMap<>();

        item.put("id", record.getId());
        item.put("issueId", record.getIssue().getId());

        item.put(
                "previousStatus",
                record.getPreviousStatus() == null
                        ? null
                        : record.getPreviousStatus().name());

        item.put("newStatus", record.getNewStatus().name());
        item.put("changedAt", record.getChangedAt());
        item.put("remarks", record.getRemarks());

        User changedBy = record.getChangedBy();

        item.put(
                "changedBy",
                changedBy == null ? null : changedBy.getFullName());

        return item;
    }
}
