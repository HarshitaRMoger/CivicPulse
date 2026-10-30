package com.civicpulse.dto;

public record LocalityResponse(
        Long id,
        String name,
        Long cityId,
        boolean active
) {
}