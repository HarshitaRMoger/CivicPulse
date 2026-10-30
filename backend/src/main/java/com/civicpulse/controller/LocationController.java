
package com.civicpulse.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.civicpulse.dto.CityResponse;
import com.civicpulse.dto.LocalityResponse;
import com.civicpulse.dto.StateResponse;
import com.civicpulse.service.LocationService;

@RestController
@RequestMapping("/api/locations")
public class LocationController {

    private final LocationService locationService;

    public LocationController(LocationService locationService) {
        this.locationService = locationService;
    }

    // Get all states
    @GetMapping("/states")
    public List<StateResponse> getStates() {
        return locationService.getStates();
    }

    // Get cities belonging to a state
    @GetMapping("/states/{stateId}/cities")
    public List<CityResponse> getCities(
            @PathVariable Long stateId) {
        return locationService.getCities(stateId);
    }

    // Get localities belonging to a city
    @GetMapping("/cities/{cityId}/localities")
    public List<LocalityResponse> getLocalities(
            @PathVariable Long cityId) {
        return locationService.getLocalities(cityId);
    }
}
