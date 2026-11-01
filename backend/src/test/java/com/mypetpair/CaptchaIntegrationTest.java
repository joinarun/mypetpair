package com.mypetpair;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.altcha.altcha.v2.Altcha;
import org.json.JSONObject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:captcha;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1","app.captcha-hmac-secret=Fictional-captcha-test-key-only-42","app.captcha-test-workload=true","app.seed=false","app.auth-rate-limit=10000"})
@AutoConfigureMockMvc
class CaptchaIntegrationTest {
 @Autowired CaptchaService captcha;
 @Autowired JdbcTemplate db;
 @Autowired MockMvc mvc;
 @Autowired ObjectMapper json;
 @BeforeEach void clear(){db.update("delete from owners");db.update("delete from captcha_redemptions");}

 @Test void challengesAndWidgetArePublicPurposeBoundAndNotCached()throws Exception{
  var response=mvc.perform(get("/api/captcha/challenge").param("purpose","register")).andReturn().getResponse();
  assertEquals(200,response.getStatus());assertEquals("no-store",response.getHeader("Cache-Control"));
  var data=json.readTree(response.getContentAsString());assertEquals("register",data.at("/parameters/data/purpose").asText());assertFalse(data.path("signature").asText().isBlank());
  assertEquals(400,mvc.perform(get("/api/captcha/challenge").param("purpose","anything")).andReturn().getResponse().getStatus());
  var page=mvc.perform(get("/captcha").param("purpose","login").param("theme","dark")).andReturn().getResponse();
  assertEquals(200,page.getStatus());assertNull(page.getHeader("X-Frame-Options"));assertTrue(page.getHeader("Content-Security-Policy").contains("frame-ancestors 'self'"));assertFalse(page.getContentAsString().contains("{{"));assertTrue(page.getContentAsString().contains("/captcha/widget.js"));
  var allowed=mvc.perform(get("/captcha").param("parentOrigin","http://localhost:8081")).andReturn().getResponse();assertEquals(200,allowed.getStatus());assertTrue(allowed.getHeader("Content-Security-Policy").contains("http://localhost:8081"));assertTrue(allowed.getContentAsString().contains("postMessage(result,\"http://localhost:8081\""));
  assertEquals(400,mvc.perform(get("/captcha").param("parentOrigin","https://outside.example")).andReturn().getResponse().getStatus());
  var js=mvc.perform(get("/captcha/widget.js")).andReturn().getResponse();assertEquals(200,js.getStatus());assertTrue(js.getContentAsByteArray().length>100000);
 }
 @Test void genuineProofIsSingleUseAndPurposeBound()throws Exception{
  String proof=CaptchaTestSupport.solve(captcha,"login");
  assertEquals(400,assertThrows(ApiException.class,()->captcha.consume(proof,"register")).status);
  captcha.consume(proof,"login");
  assertEquals(400,assertThrows(ApiException.class,()->captcha.consume(proof,"login")).status);
  assertEquals(1,db.queryForObject("select count(*) from captcha_redemptions",Integer.class));
 }
 @Test void malformedExpiredAndTamperedProofsFailClosed()throws Exception{
  assertThrows(ApiException.class,()->captcha.consume(null,"login"));assertThrows(ApiException.class,()->captcha.consume("not-base64","login"));
  assertThrows(ApiException.class,()->captcha.consume("a".repeat(12001),"login"));
  String proof=CaptchaTestSupport.solve(captcha,"login");
  var root=new JSONObject(new String(Base64.getDecoder().decode(proof),StandardCharsets.UTF_8));root.getJSONObject("challenge").getJSONObject("parameters").put("cost",1);
  String tampered=Base64.getEncoder().encodeToString(root.toString().getBytes(StandardCharsets.UTF_8));
  assertThrows(ApiException.class,()->captcha.consume(tampered,"login"));
  String key="Fictional-captcha-test-key-only-42";
  var expired=Altcha.createChallenge(new Altcha.CreateChallengeOptions().algorithm(CaptchaService.ALGORITHM).cost(10).counter(4).hmacSignatureSecret(key).hmacKeySignatureSecret(CaptchaService.sha256("mypetpair-altcha-key-v1:"+key)).expiresAt(Instant.now().getEpochSecond()-1).data(Map.of("purpose","login")));
  assertThrows(ApiException.class,()->captcha.consume(CaptchaTestSupport.solve(expired),"login"));
  assertEquals(0,db.queryForObject("select count(*) from captcha_redemptions",Integer.class));
 }
 @Test void concurrentRedemptionHasExactlyOneWinner()throws Exception{
  String proof=CaptchaTestSupport.solve(captcha,"login");var pool=Executors.newFixedThreadPool(2);var start=new CountDownLatch(1);
  try{
   java.util.concurrent.Callable<Boolean> job=()->{start.await();try{captcha.consume(proof,"login");return true;}catch(ApiException e){assertEquals(400,e.status);return false;}};
   var first=pool.submit(job);var second=pool.submit(job);start.countDown();assertNotEquals(first.get(15,TimeUnit.SECONDS),second.get(15,TimeUnit.SECONDS));
  }finally{pool.shutdownNow();}
 }
 @Test void authEndpointsRequireProofAndFailedPasswordStillSpendsIt()throws Exception{
  var account=Map.of("email","captcha-test@example.invalid","phone","+15551234567","password","Fictional-test-password-42","displayName","Captcha test","adultConfirmed",true,"termsAccepted",true,"captchaPayload",CaptchaTestSupport.solve(captcha,"register"));
  assertEquals(201,mvc.perform(post("/api/auth/register").contentType("application/json").content(json.writeValueAsBytes(account))).andReturn().getResponse().getStatus());
  assertEquals(400,mvc.perform(post("/api/auth/login").contentType("application/json").content(json.writeValueAsBytes(Map.of("email",account.get("email"),"password",account.get("password"))))).andReturn().getResponse().getStatus());
  String proof=CaptchaTestSupport.solve(captcha,"login");
  var wrong=Map.of("email",account.get("email"),"password","Incorrect-password","captchaPayload",proof);
  assertEquals(401,mvc.perform(post("/api/auth/login").contentType("application/json").content(json.writeValueAsBytes(wrong))).andReturn().getResponse().getStatus());
  assertEquals(400,mvc.perform(post("/api/auth/login").contentType("application/json").content(json.writeValueAsBytes(wrong))).andReturn().getResponse().getStatus());
 }
 @Test void productionRequiresStrongSecretAndRejectsTestWorkload(){
  assertThrows(IllegalStateException.class,()->new CaptchaService(db,"","jdbc:postgresql:///mypetpair",false));
  assertThrows(IllegalStateException.class,()->new CaptchaService(db,"short","jdbc:postgresql:///mypetpair",false));
  assertThrows(IllegalStateException.class,()->new CaptchaService(db,"x".repeat(32),"jdbc:postgresql:///mypetpair",true));
  assertDoesNotThrow(()->new CaptchaService(db,"x".repeat(32),"jdbc:postgresql:///mypetpair",false));
 }
}
