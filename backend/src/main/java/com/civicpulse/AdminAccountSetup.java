
package com.civicpulse.civicpulse;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.civicpulse.entity.Locality;
import com.civicpulse.entity.Role;
import com.civicpulse.entity.User;
import com.civicpulse.repository.LocalityRepository;
import com.civicpulse.repository.UserRepository;

@Configuration
public class AdminAccountSetup {

    @Bean
    CommandLineRunner createAdminAccounts(
            UserRepository userRepository,
            LocalityRepository localityRepository,
            PasswordEncoder passwordEncoder) {

        return args -> {

            // Create Area Admin if it does not exist
            String areaAdminEmail =
                    "admin.electroniccity@civicpulse.test";

            if (!userRepository.existsByEmailIgnoreCase(areaAdminEmail)) {

                Locality locality = localityRepository.findById(3L)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Locality ID 3 not found"));

                User admin = new User();
                admin.setFullName("Electronic City Admin");
                admin.setEmail(areaAdminEmail);
                admin.setPassword(
                        passwordEncoder.encode("Admin@12345"));
                admin.setRole(Role.AREA_ADMIN);
                admin.setLocality(locality);
                admin.setActive(true);

                userRepository.save(admin);

                System.out.println("Area Admin account created.");
            } else {
                System.out.println("Area Admin account already exists.");
            }

            // Create Super Admin if it does not exist
            String superAdminEmail =
                    "superadmin@civicpulse.test";

            if (!userRepository.existsByEmailIgnoreCase(superAdminEmail)) {

                User superAdmin = new User();
                superAdmin.setFullName("CivicPulse Super Admin");
                superAdmin.setEmail(superAdminEmail);
                superAdmin.setPassword(
                        passwordEncoder.encode("SuperAdmin@12345"));
                superAdmin.setRole(Role.SUPER_ADMIN);

                // Super Admin manages all localities
                superAdmin.setLocality(null);
                superAdmin.setActive(true);

                userRepository.save(superAdmin);

                System.out.println("Super Admin account created.");
                System.out.println("Super Admin email: "
                        + superAdminEmail);
                System.out.println("Temporary password: "
                        + "SuperAdmin@12345");
            } else {
                System.out.println("Super Admin account already exists.");
            }
        };
    }
}
