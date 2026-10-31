package com.mypetpair;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.dao.DataIntegrityViolationException;
@RestControllerAdvice
public class ApiErrors {
 @ExceptionHandler(ApiException.class) ResponseEntity<?> api(ApiException e){return ResponseEntity.status(e.status).body(Map.of("message",e.getMessage()));}
 @ExceptionHandler(MaxUploadSizeExceededException.class) ResponseEntity<?> size(){return ResponseEntity.status(413).body(Map.of("message","Photo must be no larger than 5 MB"));}
 @ExceptionHandler({HttpMessageNotReadableException.class,MethodArgumentTypeMismatchException.class}) ResponseEntity<?> invalid(){return ResponseEntity.badRequest().body(Map.of("message","Invalid request values"));}
 @ExceptionHandler(DataIntegrityViolationException.class) ResponseEntity<?> conflict(){return ResponseEntity.status(409).body(Map.of("message","This change conflicts with existing data"));}
 @ExceptionHandler(Exception.class) ResponseEntity<?> internal(){return ResponseEntity.internalServerError().body(Map.of("message","The request could not be completed"));}
}
