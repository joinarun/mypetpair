package com.mypetpair;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
@Controller
class WebController {
 @GetMapping({"/discover","/requests","/dogs","/account","/admin","/login","/register"})
 String clientRoute(){return "forward:/index.html";}
}
