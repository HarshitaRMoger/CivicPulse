
package com.civicpulse.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.civicpulse.entity.State;

@Repository
public interface StateRepository extends JpaRepository<State, Long> {

    // Find a state by name, ignoring uppercase/lowercase differences
    Optional<State> findByNameIgnoreCase(String name);

    // Check whether a state with the same name already exists
    boolean existsByNameIgnoreCase(String name);
}
