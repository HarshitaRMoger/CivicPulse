
package com.civicpulse.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.civicpulse.entity.Locality;


@Repository
public interface LocalityRepository
        extends JpaRepository<Locality, Long> {

    // Find all localities belonging to a city
    List<Locality> findByCityId(Long cityId);

    // Find only active localities belonging to a city
    List<Locality> findByCityIdAndActiveTrue(Long cityId);

    // Find active localities sorted alphabetically
    List<Locality> findByCityIdAndActiveTrueOrderByNameAsc(
            Long cityId);

    // Check whether a locality with the same name exists in a city
    boolean existsByNameIgnoreCaseAndCityId(
            String name, Long cityId);

    // Find a locality by name within a particular city
    Optional<Locality> findByNameIgnoreCaseAndCityId(
            String name, Long cityId);


 
// Find all active localities across all cities
List<Locality> findByActiveTrueOrderByNameAsc();

}
