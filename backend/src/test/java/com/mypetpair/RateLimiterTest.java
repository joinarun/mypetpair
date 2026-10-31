package com.mypetpair;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
class RateLimiterTest {
 @Test void limitsKeysAndProvidesWindowRetry(){
  RateLimiter limiter=new RateLimiter();limiter.check("owner:a",2,60000);limiter.check("owner:a",2,60000);ApiException e=assertThrows(ApiException.class,()->limiter.check("owner:a",2,60000));assertEquals(429,e.status);assertTrue(e.retryAfter>0&&e.retryAfter<=60);limiter.check("owner:b",2,60000);
 }
 @Test void productionCannotStartWithOpenRegistrationOrSeed(){
  var db=org.mockito.Mockito.mock(org.springframework.jdbc.core.JdbcTemplate.class);
  var open=new PairService(db,"",false,"",false,"jdbc:postgresql:///mypetpair");assertThrows(IllegalStateException.class,open::validateDeployment);
  var seeded=new PairService(db,"",true,"secret",true,"jdbc:postgresql:///mypetpair");assertThrows(IllegalStateException.class,seeded::validateDeployment);
  var empty=new PairService(db,"",true,"",false,"jdbc:postgresql:///mypetpair");assertThrows(IllegalStateException.class,empty::validateDeployment);
 }
 @Test void invitationGateFailsBeforeAnyDatabaseAccess(){
  var db=org.mockito.Mockito.mock(org.springframework.jdbc.core.JdbcTemplate.class);var service=new PairService(db,"",true,"invited-only",false,"jdbc:h2:mem:test");
  var in=java.util.Map.<String,Object>of("adultConfirmed",true,"termsAccepted",true,"invitationCode","wrong");ApiException e=assertThrows(ApiException.class,()->service.register(in));assertEquals(403,e.status);org.mockito.Mockito.verifyNoInteractions(db);
 }
}
