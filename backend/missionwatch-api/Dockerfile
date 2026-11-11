# Multi-stage build: compile with the Maven Wrapper, run on a slim JRE as a non-root user.
FROM eclipse-temurin:25-jdk AS build
WORKDIR /src
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -B -q dependency:go-offline
COPY src src
RUN ./mvnw -B -q package -DskipTests -Dspotless.check.skip=true \
    && java -Djarmode=tools -jar target/missionwatch-api-*.jar extract --layers --launcher --destination /extracted

FROM eclipse-temurin:25-jre
RUN useradd --system --uid 10001 missionwatch
WORKDIR /app
COPY --from=build /extracted/dependencies/ ./
COPY --from=build /extracted/spring-boot-loader/ ./
COPY --from=build /extracted/snapshot-dependencies/ ./
COPY --from=build /extracted/application/ ./
USER missionwatch
EXPOSE 8080
ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
