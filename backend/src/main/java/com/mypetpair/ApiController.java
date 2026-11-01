package com.mypetpair;

import java.util.*;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api")
public class ApiController {
 final PairService service; final EntitlementPolicy entitlements; final CaptchaService captcha;
 ApiController(PairService service,EntitlementPolicy entitlements,CaptchaService captcha){this.service=service;this.entitlements=entitlements;this.captcha=captcha;}
 @SuppressWarnings("unchecked") Map<String,Object> owner(HttpServletRequest r){return (Map<String,Object>)r.getAttribute("owner");}
 @GetMapping("/health") Map<String,Object> health(){return service.health();}
 @GetMapping("/config") Map<String,Object> config(){return service.config();}
 @PostMapping("/auth/register") @ResponseStatus(HttpStatus.CREATED) Map<String,Object> register(@RequestBody Map<String,Object> in){captcha.consume(PairService.str(in,"captchaPayload"),"register");return service.register(in);}
 @PostMapping("/auth/login") Map<String,Object> login(@RequestBody Map<String,Object> in){captcha.consume(PairService.str(in,"captchaPayload"),"login");return service.login(in);}
 @PostMapping("/auth/logout") @ResponseStatus(HttpStatus.NO_CONTENT) void logout(HttpServletRequest r){service.logout((String)r.getAttribute("token"));}
 @GetMapping("/me") Map<String,Object> me(HttpServletRequest r){return service.me(owner(r));}
 @PatchMapping("/me") Map<String,Object> me(HttpServletRequest r,@RequestBody Map<String,Object> in){return service.updateMe(owner(r),in);}
 @GetMapping("/me/export") Map<String,Object> export(HttpServletRequest r){return service.export(owner(r));}
 @DeleteMapping("/me") @ResponseStatus(HttpStatus.NO_CONTENT) void deleteMe(HttpServletRequest r,@RequestBody Map<String,Object> in){service.deleteMe(owner(r),in);}
 @GetMapping("/entitlements") Map<String,Object> entitlements(){return entitlements.current();}
 @GetMapping("/dogs/mine") List<Map<String,Object>> mine(HttpServletRequest r){return service.mine(owner(r));}
 @PostMapping("/dogs") @ResponseStatus(HttpStatus.CREATED) Map<String,Object> createDog(HttpServletRequest r,@RequestBody Map<String,Object> in){return service.createDog(owner(r),in);}
 @GetMapping("/dogs/{id}") Map<String,Object> dog(HttpServletRequest r,@PathVariable String id){return service.dog(owner(r),id);}
 @PutMapping("/dogs/{id}") Map<String,Object> updateDog(HttpServletRequest r,@PathVariable String id,@RequestBody Map<String,Object> in){return service.updateDog(owner(r),id,in);}
 @DeleteMapping("/dogs/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) void archive(HttpServletRequest r,@PathVariable String id){service.archiveDog(owner(r),id);}
 @PostMapping("/dogs/{id}/photos") @ResponseStatus(HttpStatus.CREATED) Map<String,Object> addPhoto(HttpServletRequest r,@PathVariable String id,@RequestParam("file")MultipartFile file){return service.addPhoto(owner(r),id,file);}
 @GetMapping("/photos/{id}") ResponseEntity<byte[]> photo(HttpServletRequest r,@PathVariable String id){return ResponseEntity.ok().contentType(MediaType.IMAGE_JPEG).cacheControl(CacheControl.noStore()).body(service.photo(owner(r),id));}
 @DeleteMapping("/dogs/{dogId}/photos/{photoId}") @ResponseStatus(HttpStatus.NO_CONTENT) void deletePhoto(HttpServletRequest r,@PathVariable String dogId,@PathVariable String photoId){service.deletePhoto(owner(r),dogId,photoId);}
 @GetMapping("/discovery") Map<String,Object> discovery(HttpServletRequest r,@RequestParam String dogId,@RequestParam(defaultValue="50")double radiusKm,@RequestParam(defaultValue="")String sex,@RequestParam(defaultValue="")String breed,@RequestParam(defaultValue="24")int minAgeMonths,@RequestParam(defaultValue="420")int maxAgeMonths,@RequestParam(defaultValue="nearest")String sort,@RequestParam(defaultValue="0")int page,@RequestParam(defaultValue="20")int size){return service.discovery(owner(r),dogId,radiusKm,sex,breed,minAgeMonths,maxAgeMonths,sort,page,size);}
 @GetMapping("/interests") List<Map<String,Object>> interests(HttpServletRequest r){return service.interests(owner(r));}
 @PostMapping("/interests") @ResponseStatus(HttpStatus.CREATED) Map<String,Object> createInterest(HttpServletRequest r,@RequestBody Map<String,Object> in){return service.createInterest(owner(r),in);}
 @PostMapping("/interests/{id}/decision") Map<String,Object> decision(HttpServletRequest r,@PathVariable String id,@RequestBody Map<String,Object> in){return service.decision(owner(r),id,in);}
 @GetMapping("/interests/{id}/contacts") Map<String,Object> contacts(HttpServletRequest r,@PathVariable String id){return service.contacts(owner(r),id);}
 @PutMapping("/interests/{id}/contacts") Map<String,Object> grant(HttpServletRequest r,@PathVariable String id,@RequestBody Map<String,Object> in){return service.setContacts(owner(r),id,in);}
 @GetMapping("/interests/{id}/messages") Map<String,Object> messages(HttpServletRequest r,@PathVariable String id,@RequestParam(defaultValue="0")long beforeId,@RequestParam(defaultValue="50")int size){return service.messages(owner(r),id,beforeId,size);}
 @PostMapping("/interests/{id}/messages") Map<String,Object> sendMessage(HttpServletRequest r,@PathVariable String id,@RequestBody Map<String,Object> in){return service.sendMessage(owner(r),id,in);}
 @PutMapping("/interests/{id}/messages/read") @ResponseStatus(HttpStatus.NO_CONTENT) void readMessages(HttpServletRequest r,@PathVariable String id,@RequestBody Map<String,Object> in){service.markMessagesRead(owner(r),id,in);}
 @PostMapping("/messages/{id}/report") @ResponseStatus(HttpStatus.CREATED) Map<String,Object> reportMessage(HttpServletRequest r,@PathVariable long id,@RequestBody Map<String,Object> in){return service.reportMessage(owner(r),id,in);}
 @DeleteMapping("/admin/dogs/{dogId}/photos/{photoId}") @ResponseStatus(HttpStatus.NO_CONTENT) void adminDeletePhoto(HttpServletRequest r,@PathVariable String dogId,@PathVariable String photoId,@RequestBody Map<String,Object> in){service.adminDeletePhoto(owner(r),dogId,photoId,in);}
 @GetMapping("/blocks") List<Map<String,Object>> blocks(HttpServletRequest r){return service.blocks(owner(r));}
 @PostMapping("/blocks") @ResponseStatus(HttpStatus.NO_CONTENT) void block(HttpServletRequest r,@RequestBody Map<String,Object> in){service.block(owner(r),in);}
 @DeleteMapping("/blocks/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) void unblock(HttpServletRequest r,@PathVariable String id){service.unblock(owner(r),id);}
 @PostMapping("/reports") @ResponseStatus(HttpStatus.CREATED) Map<String,Object> report(HttpServletRequest r,@RequestBody Map<String,Object> in){return service.report(owner(r),in);}
 @GetMapping("/admin/dogs") List<Map<String,Object>> adminDogs(HttpServletRequest r,@RequestParam(defaultValue="APPROVED")String status){return service.adminDogs(owner(r),status);}
 @PostMapping("/admin/dogs/{id}/moderation") Map<String,Object> moderate(HttpServletRequest r,@PathVariable String id,@RequestBody Map<String,Object> in){return service.moderate(owner(r),id,in);}
 @GetMapping("/admin/reports") List<Map<String,Object>> reports(HttpServletRequest r){return service.reports(owner(r));}
 @PostMapping("/admin/reports/{id}/resolve") Map<String,Object> resolve(HttpServletRequest r,@PathVariable String id,@RequestBody Map<String,Object> in){return service.resolve(owner(r),id,in);}
 @GetMapping("/admin/audit") List<Map<String,Object>> audits(HttpServletRequest r){return service.audits(owner(r));}
}
