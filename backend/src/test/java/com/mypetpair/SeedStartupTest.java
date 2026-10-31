package com.mypetpair;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={"spring.datasource.url=jdbc:h2:mem:seed-startup;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1","app.seed=true","app.invitation-required=false","app.admin-owner-ids="})
class SeedStartupTest {
 @Autowired JdbcTemplate db; @Autowired TestRestTemplate http;
 @org.springframework.boot.test.web.server.LocalServerPort int port;
 @Test void realServerStartsWithSeedAccountsAndModeratorLogin(){
  assertEquals(3,db.queryForObject("select count(*) from owners",Integer.class));assertEquals(6,db.queryForObject("select count(*) from dogs where moderation='APPROVED'",Integer.class));assertEquals(6,db.queryForObject("select count(*) from photos",Integer.class));
  var health=http.getForEntity("/api/health",Map.class);assertEquals(200,health.getStatusCode().value());assertEquals("ok",health.getBody().get("status"));
  var login=http.postForEntity("/api/auth/login",Map.of("email","moderator@example.invalid","password","Fictional-local-only-42!"),Map.class);assertEquals(200,login.getStatusCode().value());var user=(Map<?,?>)login.getBody().get("user");assertEquals(true,user.get("admin"));assertEquals(PairService.SEED_ADMIN,user.get("id"));
 }
 @Test void encodedRouterStaticChunkLoadsWithoutOpeningEncodedApiPaths(){
  var asset=http.getForEntity(java.net.URI.create("http://127.0.0.1:"+port+"/_expo/static/js/web/%5Bscreen%5D-fixture.js"),String.class);
  assertEquals(200,asset.getStatusCode().value());assertTrue(asset.getBody().contains("mypetpairAssetFixture"));
  var api=http.getForEntity(java.net.URI.create("http://127.0.0.1:"+port+"/%61pi/entitlements"),String.class);assertEquals(400,api.getStatusCode().value());
 }

}
