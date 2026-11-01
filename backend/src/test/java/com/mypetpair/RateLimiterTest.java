package com.mypetpair;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
class RateLimiterTest {
 @Test void limitsKeysAndProvidesWindowRetry(){
  RateLimiter limiter=new RateLimiter();limiter.check("owner:a",2,60000);limiter.check("owner:a",2,60000);ApiException e=assertThrows(ApiException.class,()->limiter.check("owner:a",2,60000));assertEquals(429,e.status);assertTrue(e.retryAfter>0&&e.retryAfter<=60);limiter.check("owner:b",2,60000);
 }
 @Test void productionAllowsOpenRegistrationButNeverLocalSeed(){
  var db=org.mockito.Mockito.mock(org.springframework.jdbc.core.JdbcTemplate.class);
  var open=new PairService(db,"",false,"jdbc:postgresql:///mypetpair");assertDoesNotThrow(open::validateDeployment);
  var seeded=new PairService(db,"",true,"jdbc:postgresql:///mypetpair");assertThrows(IllegalStateException.class,seeded::validateDeployment);
 }
 @Test void mobileIsRequiredAndValidatedBeforeRegistrationDatabaseAccess(){
  var db=org.mockito.Mockito.mock(org.springframework.jdbc.core.JdbcTemplate.class);var service=new PairService(db,"",false,"jdbc:h2:mem:test");
  var in=java.util.Map.<String,Object>of("adultConfirmed",true,"termsAccepted",true,"email","owner@example.invalid","password","Fictional-safe-pass-42","displayName","Owner");ApiException e=assertThrows(ApiException.class,()->service.register(in));assertEquals(400,e.status);org.mockito.Mockito.verifyNoInteractions(db);
 }
}
