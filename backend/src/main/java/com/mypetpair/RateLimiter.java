package com.mypetpair;
import java.util.*;
import org.springframework.stereotype.Component;
@Component
class RateLimiter {
 private record Window(long start,int count){}
 private final Map<String,Window> windows=new LinkedHashMap<>(256,.75f,true);
 synchronized void check(String key,int limit,long milliseconds){
  long now=System.currentTimeMillis();Window w=windows.get(key);
  if(w==null||now-w.start>=milliseconds){w=new Window(now,0);}
  if(w.count>=limit)throw new ApiException(429,"Too many requests. Please try again later.").retry((int)Math.max(1,(milliseconds-(now-w.start)+999)/1000));
  windows.put(key,new Window(w.start,w.count+1));
  if(windows.size()>10000){var it=windows.keySet().iterator();it.next();it.remove();}
 }
}
