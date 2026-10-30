
package com.civicpulse.service;

import com.civicpulse.dto.CityResponse;
import com.civicpulse.dto.LocalityResponse;
import com.civicpulse.dto.StateResponse;
import com.civicpulse.entity.City;
import com.civicpulse.entity.Locality;
import com.civicpulse.entity.State;
import com.civicpulse.repository.CityRepository;
import com.civicpulse.repository.LocalityRepository;
import com.civicpulse.repository.StateRepository;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class LocationService {

    private final StateRepository stateRepository;
    private final CityRepository cityRepository;
    private final LocalityRepository localityRepository;

    public LocationService(
            StateRepository stateRepository,
            CityRepository cityRepository,
            LocalityRepository localityRepository) {
        this.stateRepository = stateRepository;
        this.cityRepository = cityRepository;
        this.localityRepository = localityRepository;
    }

    public List<StateResponse> getStates() {
        return stateRepository.findAll()
                .stream()
                .map(state -> new StateResponse(
                        state.getId(),
                        state.getName()))
                .toList();
    }

    public List<CityResponse> getCities(Long stateId) {
        return cityRepository.findByStateIdOrderByNameAsc(stateId)
                .stream()
                .map(city -> new CityResponse(
                        city.getId(),
                        city.getName(),
                        city.getState().getId()))
                .toList();
    }

    public List<LocalityResponse> getLocalities(Long cityId) {
        return localityRepository
                .findByCityIdAndActiveTrueOrderByNameAsc(cityId)
                .stream()
                .map(locality -> new LocalityResponse(
                        locality.getId(),
                        locality.getName(),
                        locality.getCity().getId(),
                        locality.isActive()))
                .toList();
    }
}
