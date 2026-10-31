package com.mypetpair;

import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.util.Map;
import javax.imageio.ImageIO;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

@Component
@ConditionalOnProperty(name="app.seed",havingValue="true")
class SeedData implements ApplicationRunner {
 final PairService service; final JdbcTemplate db; final String databaseUrl;
 SeedData(PairService service,JdbcTemplate db,@Value("${spring.datasource.url}")String databaseUrl){this.service=service;this.db=db;this.databaseUrl=databaseUrl;}
 @Override @Transactional public void run(ApplicationArguments args)throws Exception{
  if(!databaseUrl.startsWith("jdbc:h2:"))throw new IllegalStateException("Seed only permitted with local H2");
  if(db.queryForObject("select count(*) from owners where id=?",Integer.class,PairService.SEED_ADMIN)>0)return;
  String[] ids={PairService.SEED_ADMIN,"00000000-0000-0000-0000-000000000002","00000000-0000-0000-0000-000000000003"};
  String[] emails={"moderator@example.invalid","male@example.invalid","female@example.invalid"};String[] names={"Pilot Moderator","Alex • sample owner","Sam • sample owner"};
  for(int n=0;n<3;n++)db.update("insert into owners(id,email,password_hash,display_name,phone,created_at) values(?,?,?,?,?,?)",ids[n],emails[n],new BCryptPasswordEncoder(12).encode("Fictional-local-only-42!"),names[n],"",PairService.now());
  String[] dogNames={"Cooper","Luna","Daisy","Milo","Olive","Maple"};String[] breeds={"Golden Retriever","Golden Retriever","Labrador Retriever","Poodle","Beagle","Labrador Retriever"};
  for(int n=0;n<dogNames.length;n++){
   String ownerId=n==0||n==3?ids[1]:n==4?ids[0]:ids[2];var owner=db.queryForMap("select * from owners where id=?",ownerId);
   var fields=PairService.map("name",dogNames[n],"breed",breeds[n],"sex",n==0||n==3?"MALE":"FEMALE","birthDate",LocalDate.now().minusMonths(36+n*4).toString(),"city","Bengaluru • fictional sample","latitude",12.97+n*.025,"longitude",77.59+n*.008,"weightKg",n==4?12:25,"temperament","Gentle, curious and sociable","bio","A fictional sample profile for local testing. Loves long walks and quiet afternoons.","healthSummary","Fictional sample: owner-reported screening discussed with a vet. This is not a breeding recommendation.","vetCheckedOn",LocalDate.now().minusMonths(1).toString(),"intact",true,"vaccinated",true,"ownershipAttested",true,"registry","","available",true);
   var dog=service.createDog(owner,fields);String dogId=dog.get("id").toString();db.update("insert into photos(id,dog_id,image_data,created_at) values(?,?,?,?)",PairService.uuid(),dogId,illustration(n),PairService.now());db.update("update dogs set moderation='APPROVED',moderation_reason='Fictional local sample only' where id=?",dogId);
  }
 }
 static byte[] illustration(int n)throws Exception{
  BufferedImage image=new BufferedImage(640,720,BufferedImage.TYPE_INT_RGB);Graphics2D g=image.createGraphics();g.setRenderingHint(RenderingHints.KEY_ANTIALIASING,RenderingHints.VALUE_ANTIALIAS_ON);
  Color[] backs={new Color(238,226,199),new Color(231,225,215),new Color(224,233,218),new Color(225,216,204),new Color(237,221,210),new Color(223,230,223)};Color[] coats={new Color(190,139,77),new Color(209,173,113),new Color(171,123,69),new Color(121,92,70),new Color(168,112,70),new Color(199,173,132)};
  g.setColor(backs[n]);g.fillRect(0,0,640,720);g.setColor(new Color(255,255,255,85));g.fillOval(-100,400,850,600);g.setColor(coats[n].darker());g.fillOval(119,210,130,265);g.fillOval(391,210,130,265);g.setColor(coats[n]);g.fillOval(180,190,280,320);g.fillOval(151,473,339,370);g.setColor(new Color(242,226,201));g.fillOval(236,363,168,126);g.setColor(new Color(53,43,34));g.fillOval(246,312,23,29);g.fillOval(369,312,23,29);g.fillOval(293,384,54,35);g.setStroke(new BasicStroke(5));g.drawArc(283,409,76,47,190,160);g.setColor(new Color(223,129,122));g.fillRoundRect(309,449,25,33,15,15);g.setColor(new Color(67,83,58));g.fillRoundRect(216,506,208,24,12,12);g.setColor(new Color(225,179,82));g.fillOval(305,520,30,35);g.setFont(new Font("SansSerif",Font.PLAIN,16));g.setColor(new Color(75,76,64));g.drawString("FICTIONAL SAMPLE • ORIGINAL ILLUSTRATION",105,680);g.dispose();var bytes=new ByteArrayOutputStream();ImageIO.write(image,"jpeg",bytes);return bytes.toByteArray();
 }
}
