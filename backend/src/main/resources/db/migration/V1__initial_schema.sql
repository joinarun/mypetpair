CREATE TABLE owners (
 id VARCHAR(36) PRIMARY KEY, email VARCHAR(254) NOT NULL UNIQUE,
 password_hash VARCHAR(100) NOT NULL, display_name VARCHAR(80) NOT NULL,
 phone VARCHAR(30) NOT NULL DEFAULT '', created_at VARCHAR(40) NOT NULL
);
CREATE TABLE sessions (
 token_hash VARCHAR(64) PRIMARY KEY, owner_id VARCHAR(36) NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
 expires_at VARCHAR(40) NOT NULL
);
CREATE INDEX sessions_owner ON sessions(owner_id);
CREATE TABLE dogs (
 id VARCHAR(36) PRIMARY KEY, owner_id VARCHAR(36) NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
 name VARCHAR(80) NOT NULL, breed VARCHAR(100) NOT NULL, sex VARCHAR(6) NOT NULL CHECK(sex IN ('MALE','FEMALE')),
 birth_date VARCHAR(10) NOT NULL, city VARCHAR(100) NOT NULL, latitude DOUBLE PRECISION NOT NULL, longitude DOUBLE PRECISION NOT NULL,
 weight_kg DOUBLE PRECISION, temperament VARCHAR(300) NOT NULL DEFAULT '', bio VARCHAR(1000) NOT NULL DEFAULT '',
 health_summary VARCHAR(2000) NOT NULL DEFAULT '', vet_checked_on VARCHAR(10), intact BOOLEAN NOT NULL,
 vaccinated BOOLEAN NOT NULL, ownership_attested BOOLEAN NOT NULL, registry VARCHAR(200) NOT NULL DEFAULT '',
 available BOOLEAN NOT NULL, moderation VARCHAR(20) NOT NULL DEFAULT 'PENDING', moderation_reason VARCHAR(1000) NOT NULL DEFAULT '',
 archived BOOLEAN NOT NULL DEFAULT FALSE, created_at VARCHAR(40) NOT NULL
);
CREATE INDEX dogs_owner ON dogs(owner_id);
CREATE INDEX dogs_discovery ON dogs(moderation,available,archived,latitude,longitude);
CREATE TABLE photos (
 id VARCHAR(36) PRIMARY KEY, dog_id VARCHAR(36) NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
 image_data BYTEA NOT NULL, created_at VARCHAR(40) NOT NULL
);
CREATE INDEX photos_dog ON photos(dog_id);
CREATE TABLE interests (
 id VARCHAR(36) PRIMARY KEY, male_dog_id VARCHAR(36) NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
 female_dog_id VARCHAR(36) NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
 state VARCHAR(20) NOT NULL, active_pair VARCHAR(73) UNIQUE,
 created_at VARCHAR(40) NOT NULL, updated_at VARCHAR(40) NOT NULL
);
CREATE INDEX interests_male ON interests(male_dog_id);
CREATE INDEX interests_female ON interests(female_dog_id);
CREATE TABLE contact_grants (
 interest_id VARCHAR(36) NOT NULL REFERENCES interests(id) ON DELETE CASCADE,
 owner_id VARCHAR(36) NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
 share_email BOOLEAN NOT NULL, share_phone BOOLEAN NOT NULL,
 PRIMARY KEY(interest_id,owner_id)
);
CREATE TABLE owner_blocks (
 blocker_id VARCHAR(36) NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
 blocked_id VARCHAR(36) NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
 created_at VARCHAR(40) NOT NULL, PRIMARY KEY(blocker_id,blocked_id)
);
CREATE TABLE reports (
 id VARCHAR(36) PRIMARY KEY, reporter_id VARCHAR(36) NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
 dog_id VARCHAR(36) NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
 reason VARCHAR(20) NOT NULL, details VARCHAR(1000) NOT NULL DEFAULT '', status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
 resolution VARCHAR(1000) NOT NULL DEFAULT '', created_at VARCHAR(40) NOT NULL
);
CREATE TABLE audit_events (
 id VARCHAR(36) PRIMARY KEY, actor_id VARCHAR(36), action VARCHAR(80) NOT NULL,
 target_id VARCHAR(36), detail VARCHAR(200) NOT NULL DEFAULT '', created_at VARCHAR(40) NOT NULL
);
CREATE TABLE mutation_lock (id INTEGER PRIMARY KEY);
INSERT INTO mutation_lock(id) VALUES(1);
