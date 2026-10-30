
package com.civicpulse.service;

import java.util.Locale;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.civicpulse.entity.Issue;
import com.civicpulse.entity.IssueStatus;
import com.civicpulse.entity.Locality;
import com.civicpulse.entity.User;
import com.civicpulse.repository.IssueRepository;
import com.civicpulse.repository.LocalityRepository;
import com.civicpulse.repository.UserRepository;

@Service
public class IssueService {

    private final IssueRepository issueRepository;
    private final LocalityRepository localityRepository;
    private final UserRepository userRepository;

    public IssueService(
            IssueRepository issueRepository,
            LocalityRepository localityRepository,
            UserRepository userRepository) {
        this.issueRepository = issueRepository;
        this.localityRepository = localityRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public Issue createIssue(
            String email,
            String category,
            String description,
            String photoPath) {

        User citizen = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() ->
                        new IllegalArgumentException("Citizen account not found"));

        if (!citizen.isActive()) {
            throw new IllegalArgumentException("Citizen account is inactive");
        }

        if (citizen.getLocality() == null) {
            throw new IllegalArgumentException(
                    "Please select a locality before reporting an issue");
        }

        if (category == null || category.isBlank()) {
            throw new IllegalArgumentException("Please select an issue category");
        }

        String normalizedCategory = category.trim().toUpperCase(Locale.ROOT);

        if (!normalizedCategory.matches(
                "ROADS|WASTE|STREETLIGHT|WATER|DRAINAGE|OTHER")) {
            throw new IllegalArgumentException("Invalid issue category");
        }

        if (description == null
        || description.isBlank()
        || description.trim().length() > 180) {
    throw new IllegalArgumentException(
            "Description is required and must be at most 180 characters");
}

        Locality locality = localityRepository
                .findById(citizen.getLocality().getId())
                .filter(Locality::isActive)
                .orElseThrow(() ->
                        new IllegalArgumentException("Citizen locality is inactive"));

        Issue issue = new Issue();
        issue.setCategory(normalizedCategory);
        issue.setDescription(description.trim());
        issue.setPhotoPath(photoPath);
        issue.setStatus(IssueStatus.SUBMITTED);
        issue.setCitizen(citizen);
        issue.setLocality(locality);

        return issueRepository.save(issue);
    }
}
