package com.civicpulse.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.civicpulse.entity.Notification;

public interface NotificationRepository
        extends JpaRepository<Notification, Long> {

    List<Notification> findByCitizenIdOrderByCreatedAtDesc(
            Long citizenId);

    long countByCitizenIdAndReadFalse(Long citizenId);
}