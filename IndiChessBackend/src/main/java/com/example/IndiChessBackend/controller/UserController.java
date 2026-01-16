package com.example.IndiChessBackend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class UserController {

    @GetMapping("/hello")
    public String showHello(){
        return "Hello";
    }

    @GetMapping("/user/username")
    public ResponseEntity<String> getUser(){
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            return new ResponseEntity<>("Unauthorized", HttpStatus.UNAUTHORIZED);
        }

        String username = authentication.getName();
        return new ResponseEntity<>(username, HttpStatus.OK);
    }


}
