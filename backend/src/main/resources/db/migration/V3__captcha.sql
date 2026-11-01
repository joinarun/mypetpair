CREATE TABLE captcha_redemptions (
 signature_hash VARCHAR(64) PRIMARY KEY,
 expires_at BIGINT NOT NULL
);
CREATE INDEX captcha_redemptions_expiry ON captcha_redemptions(expires_at);
