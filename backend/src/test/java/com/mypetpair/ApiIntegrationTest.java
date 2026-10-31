package com.mypetpair;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1", "app.admin-owner-ids=00000000-0000-0000-0000-000000000001", "app.auth-rate-limit=10000", "app.seed=false"})
@AutoConfigureMockMvc
class ApiIntegrationTest {
 @Autowired MockMvc mvc; @Autowired ObjectMapper json; @Autowired JdbcTemplate db;
 final String password="Fictional-safe-pass-42";
 String a,b,c,admin,aid,bid,cid;
 @BeforeEach void setup() throws Exception {
  db.update("delete from owners"); db.update("delete from audit_events");
  db.update("insert into owners(id,email,password_hash,display_name,phone,created_at) values(?,?,?,?,?,?)", "00000000-0000-0000-0000-000000000001","admin@example.invalid",new BCryptPasswordEncoder().encode(password),"Moderator","","2026-01-01T00:00:00Z");
  admin=login("admin@example.invalid");
  var aa=register("a@example.invalid"); var bb=register("b@example.invalid"); var cc=register("c@example.invalid");
  a=(String)aa.get("token"); b=(String)bb.get("token"); c=(String)cc.get("token"); aid=id(aa);bid=id(bb);cid=id(cc);
 }
 @SuppressWarnings("unchecked") String id(Map<String,Object> auth){return (String)((Map<String,Object>)auth.get("user")).get("id");}
 Map<String,Object> register(String email) throws Exception { return call("POST","/api/auth/register",null,Map.of("email",email,"password",password,"displayName",email.substring(0,1),"adultConfirmed",true,"termsAccepted",true),201); }
 String login(String email)throws Exception{return (String)call("POST","/api/auth/login",null,Map.of("email",email,"password",password),200).get("token");}
 @SuppressWarnings("unchecked") Map<String,Object> call(String method,String url,String token,Object body,int status)throws Exception{
  var req=request(org.springframework.http.HttpMethod.valueOf(method),url); if(token!=null)req.header("Authorization","Bearer "+token);if(body!=null)req.contentType("application/json").content(json.writeValueAsBytes(body));
  MvcResult r=mvc.perform(req).andReturn(); assertEquals(status,r.getResponse().getStatus(),r.getResponse().getContentAsString()+" "+r.getResolvedException());
  return r.getResponse().getContentAsByteArray().length==0?Map.of():json.readValue(r.getResponse().getContentAsByteArray(),Map.class);
 }
 List<Map<String,Object>> list(String url,String token)throws Exception{var r=mvc.perform(get(url).header("Authorization","Bearer "+token)).andReturn();assertEquals(200,r.getResponse().getStatus());return json.readValue(r.getResponse().getContentAsByteArray(),List.class);}
 Map<String,Object> fields(String sex,double lat){Map<String,Object> d=new HashMap<>();d.put("name",sex.equals("MALE")?"Oak":"Daisy");d.put("breed","Labrador");d.put("sex",sex);d.put("birthDate",LocalDate.now().minusYears(3).toString());d.put("city","Test City");d.put("latitude",lat);d.put("longitude",77.5946);d.put("weightKg",25);d.put("temperament","Calm");d.put("bio","Fictional dog");d.put("healthSummary","Screening discussed with vet; self declared");d.put("vetCheckedOn",LocalDate.now().minusMonths(1).toString());d.put("intact",true);d.put("vaccinated",true);d.put("ownershipAttested",true);d.put("registry","");d.put("available",true);return d;}
 byte[] image()throws Exception{var b=new ByteArrayOutputStream();var writer=ImageIO.getImageWritersByFormatName("png").next();try(var output=ImageIO.createImageOutputStream(b)){writer.setOutput(output);var image=new BufferedImage(40,30,BufferedImage.TYPE_INT_RGB);var metadata=writer.getDefaultImageMetadata(javax.imageio.ImageTypeSpecifier.createFromRenderedImage(image),writer.getDefaultWriteParam());var root=new javax.imageio.metadata.IIOMetadataNode("javax_imageio_png_1.0");var text=new javax.imageio.metadata.IIOMetadataNode("tEXt");var entry=new javax.imageio.metadata.IIOMetadataNode("tEXtEntry");entry.setAttribute("keyword","GPSLatitude");entry.setAttribute("value","private-source-location");text.appendChild(entry);root.appendChild(text);metadata.mergeTree("javax_imageio_png_1.0",root);writer.write(null,new javax.imageio.IIOImage(image,null,metadata),writer.getDefaultWriteParam());}finally{writer.dispose();}return b.toByteArray();}
 String dog(String owner,String sex,double lat,boolean approve)throws Exception{
  String id=(String)call("POST","/api/dogs",owner,fields(sex,lat),201).get("id");
  var photo=new MockMultipartFile("file","dog.png","image/png",image());var r=mvc.perform(multipart("/api/dogs/"+id+"/photos").file(photo).header("Authorization","Bearer "+owner)).andReturn();assertEquals(201,r.getResponse().getStatus(),r.getResponse().getContentAsString());
  if(approve)call("POST","/api/admin/dogs/"+id+"/moderation",admin,Map.of("status","APPROVED","reason","Pilot review"),200);return id;
 }
 String interest(String male,String female)throws Exception{return (String)call("POST","/api/interests",a,Map.of("maleDogId",male,"femaleDogId",female),201).get("id");}
 String accepted()throws Exception{var i=interest(dog(a,"MALE",12.97,true),dog(b,"FEMALE",12.98,true));call("POST","/api/interests/"+i+"/decision",b,Map.of("action","ACCEPT"),200);return i;}
 @Test void accountAcknowledgementByteLimitsLogoutAndOwnerIsolation()throws Exception{
  call("POST","/api/auth/register",null,Map.of("email","no@example.invalid","password",password,"displayName","No","adultConfirmed",false,"termsAccepted",true),400);
  call("POST","/api/auth/register",null,Map.of("email","long@example.invalid","password","猫".repeat(30),"displayName","Long","adultConfirmed",true,"termsAccepted",true),400);
  call("POST","/api/dogs",a,Map.of("name","Incomplete"),400);
  String d=dog(a,"MALE",12.971234,false);call("PUT","/api/dogs/"+d,b,fields("MALE",13),404);call("GET","/api/dogs/"+d,b,null,404);
  var own=call("GET","/api/dogs/"+d,a,null,200);assertEquals(12.97,((Number)own.get("latitude")).doubleValue());
  call("POST","/api/auth/logout",a,null,204);call("GET","/api/me",a,null,401);
 }
 @Test void discoveryFiltersPrivacyAndModeration()throws Exception{
  String mine=dog(a,"MALE",12.97,true),near=dog(b,"FEMALE",12.98,true);dog(c,"FEMALE",13.1,true);dog(b,"FEMALE",12.99,false);
  var result=call("GET","/api/discovery?dogId="+mine+"&radiusKm=50&sex=FEMALE",a,null,200);var items=(List<Map<String,Object>>)result.get("items");assertEquals(2,items.size());assertEquals(near,items.get(0).get("id"));String encoded=json.writeValueAsString(items);assertFalse(encoded.contains("latitude"));assertFalse(encoded.contains("longitude"));assertFalse(encoded.contains("email"));assertFalse(encoded.contains("birthDate"));assertFalse(encoded.contains("distanceKm"));
  assertTrue(((List<?>)call("GET","/api/discovery?dogId="+mine+"&breed=Poodle",a,null,200).get("items")).isEmpty());
  call("GET","/api/discovery?dogId="+near,a,null,404);call("GET","/api/discovery?dogId="+mine+"&radiusKm=999",a,null,400);
  call("PUT","/api/dogs/"+near,b,fields("FEMALE",12.98),200);call("GET","/api/dogs/"+near,a,null,404);
 }
 @Test void photosArePrivateAndInvalidContentRejected()throws Exception{
  String d=dog(a,"MALE",12.97,false);var own=call("GET","/api/dogs/"+d,a,null,200);String p=(String)((List<?>)own.get("photoIds")).get(0);
  var read=mvc.perform(get("/api/photos/"+p).header("Authorization","Bearer "+a)).andReturn();assertEquals(200,read.getResponse().getStatus());assertEquals("image/jpeg",read.getResponse().getContentType());assertNotNull(ImageIO.read(new java.io.ByteArrayInputStream(read.getResponse().getContentAsByteArray())));assertTrue(new String(image(),java.nio.charset.StandardCharsets.ISO_8859_1).contains("private-source-location"));assertFalse(new String(read.getResponse().getContentAsByteArray(),java.nio.charset.StandardCharsets.ISO_8859_1).contains("private-source-location"));
  call("GET","/api/photos/"+p,b,null,404);
  assertEquals(200,mvc.perform(get("/api/photos/"+p).header("Authorization","Bearer "+admin)).andReturn().getResponse().getStatus());
  var r=mvc.perform(multipart("/api/dogs/"+d+"/photos").file(new MockMultipartFile("file","bad.jpg","image/jpeg","not-an-image".getBytes())).header("Authorization","Bearer "+a)).andReturn();assertEquals(400,r.getResponse().getStatus());
  var tooLarge=mvc.perform(multipart("/api/dogs/"+d+"/photos").file(new MockMultipartFile("file","large.jpg","image/jpeg",new byte[5*1024*1024+1])).header("Authorization","Bearer "+a)).andReturn();assertEquals(413,tooLarge.getResponse().getStatus());
 }
 @Test void maleToFemaleRolesUniquePairAndDecisions()throws Exception{
  String m=dog(a,"MALE",12.97,true),f=dog(b,"FEMALE",12.98,true),i=interest(m,f);
  call("POST","/api/interests",a,Map.of("maleDogId",m,"femaleDogId",f),409);
  call("POST","/api/interests",b,Map.of("maleDogId",f,"femaleDogId",m),400);
  call("POST","/api/interests/"+i+"/decision",a,Map.of("action","ACCEPT"),403);
  call("POST","/api/interests/"+i+"/decision",b,Map.of("action","ACCEPT"),200);call("POST","/api/interests/"+i+"/decision",b,Map.of("action","ACCEPT"),200);
  call("POST","/api/interests/"+i+"/decision",a,Map.of("action","WITHDRAW"),409);
 }
 @Test void contactsRequireIndependentGrantsAndRevocation()throws Exception{
  String i=accepted(),url="/api/interests/"+i+"/contacts";
  var initial=call("GET",url,a,null,200);assertFalse(json.writeValueAsString(initial).contains("b@example.invalid"));
  call("GET",url,c,null,404);call("PUT",url,b,Map.of("shareEmail",true,"sharePhone",false),200);
  assertTrue(json.writeValueAsString(call("GET",url,a,null,200)).contains("b@example.invalid"));assertFalse(json.writeValueAsString(call("GET",url,b,null,200)).contains("a@example.invalid"));
  call("PUT",url,b,Map.of("shareEmail",false,"sharePhone",false),200);assertFalse(json.writeValueAsString(call("GET",url,a,null,200)).contains("b@example.invalid"));
  call("PUT",url,b,Map.of("shareEmail",false,"sharePhone",true),400);
 }
 @Test void blockClosesConnectionsAndRedactsPhotos()throws Exception{
  String i=accepted(),url="/api/interests/"+i+"/contacts";call("PUT",url,b,Map.of("shareEmail",true,"sharePhone",false),200);
  call("POST","/api/blocks",a,Map.of("ownerId",bid),204);call("GET",url,a,null,409);call("GET",url,b,null,409);
  var hiddenHistory=list("/api/interests",a);String encoded=json.writeValueAsString(hiddenHistory);assertTrue(encoded.contains("Unavailable profile"));assertFalse(encoded.contains("b@example.invalid"));assertEquals(bid,((Map<?,?>)hiddenHistory.get(0).get("femaleDog")).get("ownerId"));
  call("DELETE","/api/blocks/"+bid,a,null,204);call("GET",url,a,null,409);
 }
 @Test void editedDogRevokesContactVisibilityAndCanStillClose()throws Exception{
  String i=accepted();var row=db.queryForMap("select female_dog_id from interests where id=?",i);String f=(String)row.get("female_dog_id");
  call("PUT","/api/interests/"+i+"/contacts",b,Map.of("shareEmail",true,"sharePhone",false),200);call("PUT","/api/dogs/"+f,b,fields("FEMALE",12.98),200);
  call("GET","/api/interests/"+i+"/contacts",a,null,409);assertTrue(json.writeValueAsString(list("/api/interests",a)).contains("Unavailable profile"));
  call("PUT","/api/interests/"+i+"/contacts",b,Map.of("shareEmail",false,"sharePhone",false),200);call("POST","/api/interests/"+i+"/decision",a,Map.of("action","CLOSE"),200);
  var history=list("/api/interests",a);var hidden=(Map<?,?>)history.get(0).get("femaleDog");assertEquals(bid,hidden.get("ownerId"));assertEquals(true,hidden.get("unavailable"));assertFalse(hidden.containsKey("healthSummary"));assertFalse(hidden.containsKey("latitude"));assertFalse(hidden.containsKey("email"));call("POST","/api/blocks",a,Map.of("ownerId",hidden.get("ownerId")),204);assertEquals(bid,list("/api/blocks",a).get(0).get("ownerId"));
 }
 @Test void moderationReportsExportAndDeletion()throws Exception{
  String i=accepted();String f=(String)db.queryForMap("select female_dog_id from interests where id=?",i).get("female_dog_id");
  call("GET","/api/admin/reports",a,null,403);call("POST","/api/reports",a,Map.of("dogId",f,"reason","WELFARE","details","Please review"),201);
  var reports=list("/api/admin/reports",admin);assertEquals(1,reports.size());call("POST","/api/admin/reports/"+reports.get(0).get("id")+"/resolve",admin,Map.of("resolution","Reviewed with owner"),200);
  call("POST","/api/admin/dogs/"+f+"/moderation",admin,Map.of("status","SUSPENDED","reason","Review required"),200);call("GET","/api/interests/"+i+"/contacts",a,null,409);
  String export=json.writeValueAsString(call("GET","/api/me/export",a,null,200));assertFalse(export.contains("password_hash"));assertFalse(export.contains("b@example.invalid"));
  call("DELETE","/api/me",a,Map.of("password",password),204);call("GET","/api/me",a,null,401);assertEquals(0,db.queryForObject("select count(*) from interests where id=?",Integer.class,i));assertTrue(list("/api/admin/audit",admin).size()>0);
 }
 @Test void encodedAndPathParameterRoutesCannotBypassAuthentication()throws Exception{
  assertEquals(400,mvc.perform(get("/api;v=1/entitlements")).andReturn().getResponse().getStatus());
  assertEquals(400,mvc.perform(get("/api%3bv=1/entitlements")).andReturn().getResponse().getStatus());
  assertEquals(400,mvc.perform(get(java.net.URI.create("/%61pi/entitlements"))).andReturn().getResponse().getStatus());
  assertEquals(400,mvc.perform(get(java.net.URI.create("/api%3Bv=1/entitlements"))).andReturn().getResponse().getStatus());
  assertEquals(400,mvc.perform(get(java.net.URI.create("/_expo/%2e%2e/api/entitlements"))).andReturn().getResponse().getStatus());
  assertEquals(400,mvc.perform(get(java.net.URI.create("/_expo/%252fapi/entitlements"))).andReturn().getResponse().getStatus());
  assertEquals(400,mvc.perform(get(java.net.URI.create("/_expo/x%2fapi/entitlements"))).andReturn().getResponse().getStatus());
  assertEquals(400,mvc.perform(get(java.net.URI.create("/_expo/../api/entitlements"))).andReturn().getResponse().getStatus());
  assertEquals(401,mvc.perform(get("/api/entitlements")).andReturn().getResponse().getStatus());
 }
 @Test void concurrentGrantAndBlockCannotLeaveContactPermission()throws Exception{
  String i=accepted();var pool=Executors.newFixedThreadPool(2);var start=new CountDownLatch(1);
  var grant=pool.submit(()->{start.await();return mvc.perform(put("/api/interests/"+i+"/contacts").header("Authorization","Bearer "+b).contentType("application/json").content(json.writeValueAsBytes(Map.of("shareEmail",true,"sharePhone",false)))).andReturn().getResponse().getStatus();});
  var block=pool.submit(()->{start.await();return mvc.perform(post("/api/blocks").header("Authorization","Bearer "+a).contentType("application/json").content(json.writeValueAsBytes(Map.of("ownerId",bid)))).andReturn().getResponse().getStatus();});start.countDown();assertTrue(Set.of(200,409).contains(grant.get()));assertEquals(204,block.get());pool.shutdown();assertEquals(0,db.queryForObject("select count(*) from contact_grants where interest_id=?",Integer.class,i));call("GET","/api/interests/"+i+"/contacts",a,null,409);
 }
 @Test void replacingPhoneRevokesExistingPhoneGrant()throws Exception{
  String i=accepted();call("PATCH","/api/me",b,Map.of("displayName","Sam","phone","+1 202 555 0100"),200);call("PUT","/api/interests/"+i+"/contacts",b,Map.of("shareEmail",false,"sharePhone",true),200);
  assertTrue(json.writeValueAsString(call("GET","/api/interests/"+i+"/contacts",a,null,200)).contains("+1 202 555 0100"));call("PATCH","/api/me",b,Map.of("displayName","Sam","phone","+1 202 555 0101"),200);String result=json.writeValueAsString(call("GET","/api/interests/"+i+"/contacts",a,null,200));assertFalse(result.contains("+1 202 555 0101"));
 }
 @Test void archivedDogsRemainInOwnExport()throws Exception{
  String d=dog(a,"MALE",12.97,false);call("DELETE","/api/dogs/"+d,a,null,204);assertTrue(list("/api/dogs/mine",a).isEmpty());assertTrue(json.writeValueAsString(call("GET","/api/me/export",a,null,200)).contains(d));
 }
 @Test void concurrentDuplicateRequestsOnlyOneActive()throws Exception{
  String m=dog(a,"MALE",12.97,true),f=dog(b,"FEMALE",12.98,true);var pool=Executors.newFixedThreadPool(2);var start=new CountDownLatch(1);List<Future<Integer>> out=new ArrayList<>();
  for(int n=0;n<2;n++)out.add(pool.submit(()->{start.await();return mvc.perform(post("/api/interests").header("Authorization","Bearer "+a).contentType("application/json").content(json.writeValueAsBytes(Map.of("maleDogId",m,"femaleDogId",f)))).andReturn().getResponse().getStatus();}));start.countDown();var statuses=new ArrayList<Integer>();for(var x:out)statuses.add(x.get());pool.shutdown();Collections.sort(statuses);assertEquals(List.of(201,409),statuses);
 }
 @Test void expiredRequestReleasesPairAndCannotAccept()throws Exception{
  String m=dog(a,"MALE",12.97,true),f=dog(b,"FEMALE",12.98,true),i=interest(m,f);db.update("update interests set created_at=? where id=?",java.time.Instant.now().minus(31,java.time.temporal.ChronoUnit.DAYS).toString(),i);
  call("POST","/api/interests/"+i+"/decision",b,Map.of("action","ACCEPT"),409);interest(m,f);
 }
 @Test void underageOrStaleVetCannotPublishAndFreeIsUnlimited()throws Exception{
  var d=fields("MALE",12.97);d.put("birthDate",LocalDate.now().minusMonths(10).toString());String id=(String)call("POST","/api/dogs",a,d,201).get("id");assertEquals(201,mvc.perform(multipart("/api/dogs/"+id+"/photos").file(new MockMultipartFile("file","dog.png","image/png",image())).header("Authorization","Bearer "+a)).andReturn().getResponse().getStatus());call("POST","/api/admin/dogs/"+id+"/moderation",admin,Map.of("status","APPROVED","reason","Review"),400);
  d.put("birthDate",LocalDate.now().minusYears(3).toString());d.put("vetCheckedOn",LocalDate.now().minusYears(2).toString());call("PUT","/api/dogs/"+id,a,d,200);call("POST","/api/admin/dogs/"+id+"/moderation",admin,Map.of("status","APPROVED","reason","Review"),400);
  var e=call("GET","/api/entitlements",a,null,200);assertEquals("FREE",e.get("plan"));assertEquals(true,e.get("unlimitedViews"));
 }
}
