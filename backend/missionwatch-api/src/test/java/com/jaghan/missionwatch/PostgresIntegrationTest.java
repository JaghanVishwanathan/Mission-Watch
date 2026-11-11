package com.jaghan.missionwatch;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Base for tests against a real PostgreSQL in Docker (Flyway migrations, JSONB, queries). One
 * container is shared by all subclasses. Skipped when Docker is not available locally; CI always
 * has Docker. Scheduled refreshes are off so tests control every LL2 call.
 */
@SpringBootTest(properties = "missionwatch.ll2.refresh-enabled=false")
@Testcontainers(disabledWithoutDocker = true)
public abstract class PostgresIntegrationTest {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
}
