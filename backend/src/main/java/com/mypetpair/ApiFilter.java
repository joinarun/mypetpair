package com.mypetpair;
import java.io.IOException;
import java.util.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
@Component
public class ApiFilter extends OncePerRequestFilter {
 final PairService service; final RateLimiter limiter; final ObjectMapper json; final Set<String> origins;
 final int authLimit,writeLimit;
 ApiFilter(PairService service,RateLimiter limiter,ObjectMapper json,@Value("${app.cors-allowed-origins}")String origins,@Value("${app.auth-rate-limit}")int authLimit,@Value("${app.write-rate-limit}")int writeLimit){this.service=service;this.limiter=limiter;this.json=json;this.origins=new HashSet<>(Arrays.asList(origins.split(",")));this.authLimit=authLimit;this.writeLimit=writeLimit;}
 @Override protected void doFilterInternal(HttpServletRequest req,HttpServletResponse res,FilterChain chain)throws ServletException,IOException{
  res.setHeader("X-Content-Type-Options","nosniff");if(!req.getRequestURI().equals("/captcha"))res.setHeader("X-Frame-Options","DENY");res.setHeader("Referrer-Policy","no-referrer");
  String raw=req.getRequestURI().toLowerCase(Locale.ROOT);
  // Expo Router emits lazy chunks such as [screen]-hash.js; browsers encode their brackets.
  // Restrict safe filename escapes to static roots. API paths and encoded separators stay canonical.
  boolean staticRoot=raw.startsWith("/_expo/")||raw.startsWith("/assets/");
  boolean unsafeEscape=raw.contains("%")&&(!staticRoot||raw.replaceAll("%(?:5b|5d|40|28|29|20)","").contains("%"));
  boolean dotSegment=Arrays.stream(raw.split("/")).anyMatch(part->part.equals(".")||part.equals(".."));
  if(raw.contains(";")||unsafeEscape||raw.contains("\\")||dotSegment){res.setStatus(400);res.setContentType("application/json");json.writeValue(res.getOutputStream(),Map.of("message","Unsupported URL path"));return;}
  String requestPath=new org.springframework.web.util.UrlPathHelper().getPathWithinApplication(req);
  if(!requestPath.startsWith("/api/")){chain.doFilter(req,res);return;}
  res.setHeader("Cache-Control","no-store");String origin=req.getHeader("Origin");
  if(origin!=null&&origins.contains(origin)){res.setHeader("Access-Control-Allow-Origin",origin);res.setHeader("Vary","Origin");res.setHeader("Access-Control-Allow-Headers","Authorization,Content-Type");res.setHeader("Access-Control-Allow-Methods","GET,POST,PUT,PATCH,DELETE,OPTIONS");}
  if(req.getMethod().equals("OPTIONS")){res.setStatus(204);return;}
  try{
   String path=requestPath;boolean open=Set.of("/api/health","/api/config","/api/auth/register","/api/auth/login","/api/captcha/challenge").contains(path);
   if(path.equals("/api/captcha/challenge"))limiter.check("captcha:"+req.getRemoteAddr(),60,900000);
   if(path.startsWith("/api/auth/")&&!path.endsWith("logout"))limiter.check("auth:"+req.getRemoteAddr(),authLimit,900000);
   if(!open){String h=req.getHeader("Authorization");if(h==null||!h.startsWith("Bearer "))throw new ApiException(401,"Sign in to continue");String token=h.substring(7);Map<String,Object> owner=service.authenticate(token);req.setAttribute("owner",owner);req.setAttribute("token",token);if(!Set.of("GET","HEAD").contains(req.getMethod()))limiter.check("write:"+owner.get("id"),writeLimit,60000);}
   chain.doFilter(req,res);
  }catch(ApiException e){res.setStatus(e.status);res.setContentType("application/json");if(e.status==429)res.setHeader("Retry-After",Integer.toString(e.retryAfter));json.writeValue(res.getOutputStream(),Map.of("message",e.getMessage()));}
 }
}
