
package com.civicpulse.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.civicpulse.entity.Issue;

@Repository
public interface IssueRepository extends JpaRepository<Issue, Long> {

    List<Issue> findByCitizenIdOrderByCreatedAtDesc(Long citizenId);

    List<Issue> findByLocalityIdOrderByCreatedAtDesc(Long localityId);
}
