package com.mypetpair;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Map;
import java.util.Set;
import org.altcha.altcha.v2.Altcha;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Signed, purpose-bound ALTCHA proofs. No authentication bypass exists. */
@Service
public class CaptchaService {
 static final int TTL_SECONDS=300;
 static final String ALGORITHM="PBKDF2/SHA-256";
 final JdbcTemplate db;
 final String secret,keySecret;
 final boolean testWorkload;
 final SecureRandom random=new SecureRandom();

 CaptchaService(JdbcTemplate db,
   @Value("${app.captcha-hmac-secret:}") String configuredSecret,
   @Value("${spring.datasource.url}") String databaseUrl,
   @Value("${app.captcha-test-workload:false}") boolean testWorkload){
  this.db=db;this.testWorkload=testWorkload;
  boolean local=databaseUrl.startsWith("jdbc:h2:");
  if(testWorkload&&!local)throw new IllegalStateException("CAPTCHA test workload is prohibited outside H2");
  if(configuredSecret.getBytes(StandardCharsets.UTF_8).length<32){
   if(!local||!configuredSecret.isBlank())throw new IllegalStateException("CAPTCHA requires a signing secret of at least 32 UTF-8 bytes");
   byte[] bytes=new byte[32];random.nextBytes(bytes);this.secret=Base64.getEncoder().encodeToString(bytes);
  }else this.secret=configuredSecret;
  // Domain separation: never use the challenge signature key as the derived-key signature key.
  this.keySecret=sha256("mypetpair-altcha-key-v1:"+secret);
 }

 public Altcha.Challenge create(String purpose){
  validPurpose(purpose);
  try{
   return Altcha.createChallenge(new Altcha.CreateChallengeOptions()
    .algorithm(ALGORITHM).cost(testWorkload?10:5000)
    .counter(testWorkload?4+random.nextInt(4):1024+random.nextInt(1024))
    .hmacSignatureSecret(secret).hmacKeySignatureSecret(keySecret)
    .expiresInSeconds(TTL_SECONDS).data(Map.of("purpose",purpose)));
  }catch(Exception e){throw new ApiException(503,"Verification is temporarily unavailable. Please try again.");}
 }

 /** Own transaction: a correct proof is spent even if account authentication subsequently fails. */
 @Transactional(propagation=Propagation.REQUIRES_NEW)
 public void consume(String encoded,String purpose){
  validPurpose(purpose);
  if(encoded==null||encoded.isBlank()||encoded.length()>12000)throw invalid();
  Altcha.Payload payload;
  try{
   payload=Altcha.parsePayload(encoded);
   var parameters=payload.challenge().parameters();
   long now=Instant.now().getEpochSecond();
   if(parameters.expiresAt()==null||parameters.expiresAt().doubleValue()<=now
    ||parameters.expiresAt().doubleValue()>now+TTL_SECONDS+5
    ||parameters.data()==null||!purpose.equals(parameters.data().get("purpose"))
    ||!ALGORITHM.equals(parameters.algorithm())||parameters.cost()!=(testWorkload?10:5000)
    ||parameters.keyLength()!=32||parameters.keySignature()==null
    ||payload.solution().counter()<0||payload.solution().counter()>0xffff_ffffL
    ||!Altcha.verifySolution(payload.challenge(),payload.solution(),secret,keySecret,null).verified())throw invalid();
  }catch(ApiException e){throw e;}catch(Exception e){throw invalid();}
  String hash=sha256(payload.challenge().signature());
  // Same database lock used by graph mutations makes redemption atomic across service replicas.
  db.queryForObject("select id from mutation_lock where id=1 for update",Integer.class);
  db.update("delete from captcha_redemptions where expires_at<?",Instant.now().getEpochSecond());
  if(Boolean.TRUE.equals(db.queryForObject("select count(*)>0 from captcha_redemptions where signature_hash=?",Boolean.class,hash)))throw invalid();
  db.update("insert into captcha_redemptions(signature_hash,expires_at) values(?,?)",hash,payload.challenge().parameters().expiresAt().longValue());
 }

 static void validPurpose(String value){if(value==null||!Set.of("login","register").contains(value))throw new ApiException(400,"Choose a valid verification purpose");}
 static ApiException invalid(){return new ApiException(400,"Complete a fresh security verification and try again.");}
 static String sha256(String value){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException("SHA-256 unavailable");}}
}
