package com.mypetpair;
public class ApiException extends RuntimeException {
 final int status;
 int retryAfter=0;
 public ApiException(int status,String message){super(message);this.status=status;}
 public ApiException retry(int seconds){this.retryAfter=seconds;return this;}
}
