package com.mypetpair;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import org.altcha.altcha.v2.Altcha;
import org.json.JSONObject;

/** Real protocol proofs for H2 integration tests; never bypasses verification. */
final class CaptchaTestSupport {
 private CaptchaTestSupport(){}
 static String solve(CaptchaService captcha,String purpose)throws Exception{return solve(captcha.create(purpose));}
 static String solve(Altcha.Challenge challenge)throws Exception{
  var solution=Altcha.solveChallenge(challenge,Altcha.kdf(challenge.parameters().algorithm()),0,1,Duration.ofSeconds(30));
  if(solution==null)throw new IllegalStateException("CAPTCHA test solve timed out");
  var payload=new JSONObject().put("challenge",new JSONObject(challenge.toJson()))
   .put("solution",new JSONObject().put("counter",solution.counter()).put("derivedKey",solution.derivedKey()).put("time",solution.time()));
  return Base64.getEncoder().encodeToString(payload.toString().getBytes(StandardCharsets.UTF_8));
 }
}
