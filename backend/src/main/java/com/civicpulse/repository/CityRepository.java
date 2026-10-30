
package com.civicpulse.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.civicpulse.entity.City;

@Repository
public interface CityRepository extends JpaRepository<City, Long> {

    // Find all cities belonging to a particular state
    List<City> findByStateId(Long stateId);

    // Find cities belonging to a state, sorted alphabetically
    List<City> findByStateIdOrderByNameAsc(Long stateId);

    // Check whether a city with the same name exists in a state
    boolean existsByNameIgnoreCaseAndStateId(
            String name, Long stateId);

    // Find a city by name within a particular state
    Optional<City> findByNameIgnoreCaseAndStateId(
            String name, Long stateId);
}
