
package com.civicpulse.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.civicpulse.entity.IssueStatusHistory;

public interface IssueStatusHistoryRepository
        extends JpaRepository<IssueStatusHistory, Long> {

    List<IssueStatusHistory> findByIssueIdOrderByChangedAtAsc(Long issueId);
}
