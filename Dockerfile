FROM node:24-bookworm-slim AS web
WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
ENV EXPO_NO_TELEMETRY=1
RUN npx expo export --platform web

FROM maven:3.9.11-eclipse-temurin-17 AS api
WORKDIR /build/backend
COPY backend/pom.xml backend/maven-settings.xml ./
RUN mvn -s maven-settings.xml -B -q dependency:go-offline
COPY backend/src/ ./src/
COPY --from=web /build/frontend/dist/ ./src/main/resources/static/
RUN mvn -s maven-settings.xml -B -DskipTests package

FROM eclipse-temurin:17-jre-jammy
RUN groupadd --system app && useradd --system --gid app --home-dir /app app
WORKDIR /app
COPY --from=api /build/backend/target/*.jar /app/app.jar
USER app
ENV PORT=8080 JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -Djava.awt.headless=true"
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
