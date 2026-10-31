package com.mypetpair;
import java.util.Map;
import org.springframework.stereotype.Component;
/** Server-owned free policy seam. Future billing can change allowances, never authorization or consent. */
@Component
class EntitlementPolicy {
 Map<String,Object> current(){return Map.of("plan","FREE","unlimitedViews",true,"contactSharing",true);}
}
