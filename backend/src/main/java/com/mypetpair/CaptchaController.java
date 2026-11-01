package com.mypetpair;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;
import java.util.Set;
import java.util.stream.Collectors;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class CaptchaController {
 final CaptchaService captcha;
 final String page;
 final byte[] widget;
 final Set<String> frameOrigins;
 final SecureRandom random=new SecureRandom();
 CaptchaController(CaptchaService captcha,@Value("${app.cors-allowed-origins:}")String configuredOrigins)throws IOException{
  this.captcha=captcha;
  page=new String(new ClassPathResource("captcha/page.html").getContentAsByteArray(),StandardCharsets.UTF_8);
  widget=new ClassPathResource("captcha/altcha-3.5.0.min.js").getContentAsByteArray();
  frameOrigins=Arrays.stream(configuredOrigins.split(",")).map(String::trim).filter(x->!x.isEmpty()).collect(Collectors.toUnmodifiableSet());
  if(frameOrigins.stream().anyMatch(x->!validOrigin(x)))throw new IllegalStateException("CAPTCHA frame origins must be explicit HTTP(S) origins");
 }
 @GetMapping(value="/api/captcha/challenge",produces=MediaType.APPLICATION_JSON_VALUE)
 ResponseEntity<String> challenge(@RequestParam(defaultValue="login")String purpose){
  return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(captcha.create(purpose).toJson());
 }
 @GetMapping(value="/captcha/widget.js",produces="text/javascript")
 ResponseEntity<byte[]> widget(){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(widget);}
 @GetMapping(value="/captcha",produces=MediaType.TEXT_HTML_VALUE)
 ResponseEntity<String> page(@RequestParam(defaultValue="login")String purpose,@RequestParam(defaultValue="light")String theme,@RequestParam(defaultValue="")String parentOrigin,HttpServletRequest request){
  CaptchaService.validPurpose(purpose);
  if(!theme.equals("light")&&!theme.equals("dark"))throw new ApiException(400,"Choose a valid verification theme");
  String requestOrigin=org.springframework.web.servlet.support.ServletUriComponentsBuilder.fromRequest(request).replacePath(null).replaceQuery(null).fragment(null).build().toUriString();
  if(!parentOrigin.isEmpty()&&(!validOrigin(parentOrigin)||(!parentOrigin.equals(requestOrigin)&&!frameOrigins.contains(parentOrigin))))throw new ApiException(400,"This verification origin is unavailable");
  byte[] bytes=new byte[18];random.nextBytes(bytes);String nonce=Base64.getEncoder().encodeToString(bytes);
  return ResponseEntity.ok().cacheControl(CacheControl.noStore())
   .header("Content-Security-Policy","default-src 'none'; script-src 'self' 'nonce-"+nonce+"'; style-src 'unsafe-inline'; worker-src 'self' blob:; connect-src 'self'; img-src 'self' data:; frame-ancestors 'self'"+(frameOrigins.isEmpty()?"":" "+String.join(" ",frameOrigins))+"; base-uri 'none'; form-action 'none'")
   .body(page.replace("{{PURPOSE}}",purpose).replace("{{THEME}}",theme).replace("{{NONCE}}",nonce).replace("{{PARENT_ORIGIN}}",parentOrigin.isEmpty()?"null":"\""+parentOrigin+"\""));
 }
 static boolean validOrigin(String value){return value.matches("https?://[A-Za-z0-9.-]+(?::[0-9]{1,5})?");}
}
