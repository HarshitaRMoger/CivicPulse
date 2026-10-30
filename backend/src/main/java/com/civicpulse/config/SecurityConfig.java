
package com.civicpulse.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;

@Configuration
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http) throws Exception {

        http
            // CSRF protection is disabled for this API configuration.
            .csrf(csrf -> csrf.disable())

            // Store the security context in the HTTP session.
            .securityContext(context -> context
                .securityContextRepository(
                    new HttpSessionSecurityContextRepository()
                )
                .requireExplicitSave(true)
            )

            // Use sessions when needed.
            .sessionManagement(session -> session
                .sessionCreationPolicy(
                    SessionCreationPolicy.IF_REQUIRED
                )
                .sessionFixation(
                    fixation -> fixation.changeSessionId()
                )
            )

            // Authorization rules.
            .authorizeHttpRequests(auth -> auth

                // Public pages and static resources.
                .requestMatchers(
                    "/",
                    "/index.html",
                    "/login.html",
                    "/register.html",
                    "/css/**",
                    "/js/**",
                    "/images/**",
                    "/favicon.ico"
                ).permitAll()

                // Public authentication endpoints.
                .requestMatchers("/api/auth/**").permitAll()

                // Public location dropdown APIs.
                .requestMatchers(
                    HttpMethod.GET,
                    "/api/locations/**"
                ).permitAll()

                // Citizen dashboard and APIs.
                .requestMatchers("/citizen-dashboard.html")
                    .hasRole("CITIZEN")
                .requestMatchers("/api/citizen/**")
                    .hasRole("CITIZEN")

                // Area administrator dashboard and APIs.
                .requestMatchers("/area-admin-dashboard.html")
                    .hasRole("AREA_ADMIN")
                .requestMatchers("/api/area-admin/**")
                    .hasRole("AREA_ADMIN")

                // Super administrator dashboard and APIs.
                .requestMatchers("/super-admin-dashboard.html")
                    .hasRole("SUPER_ADMIN")
                .requestMatchers("/api/super-admin/**")
                    .hasRole("SUPER_ADMIN")

                // Protect the old generic dashboard.
                .requestMatchers("/dashboard.html")
                    .hasRole("CITIZEN")

                // All remaining endpoints require authentication.
                .anyRequest().authenticated()
            );

        return http.build();
    }
}
