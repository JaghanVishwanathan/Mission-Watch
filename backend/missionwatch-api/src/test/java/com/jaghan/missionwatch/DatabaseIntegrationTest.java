package com.jaghan.missionwatch;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.mysql.MySQLContainer;

/**
 * Base for tests against a real MySQL in Docker (Flyway migrations, JSON columns, queries), the
 * same version as deployment/docker/compose.yaml. One container is shared by all subclasses.
 * Skipped when Docker is not available locally; CI always has Docker. Scheduled refreshes are off
 * so tests control every LL2 call.
 */
@SpringBootTest(properties = "missionwatch.ll2.refresh-enabled=false")
@Testcontainers(disabledWithoutDocker = true)
public abstract class DatabaseIntegrationTest {

    @Container
    @ServiceConnection
    static final MySQLContainer MYSQL = new MySQLContainer("mysql:9.7");
}
