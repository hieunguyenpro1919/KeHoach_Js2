package com.medsched.auth;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Task 1 - Register / Login / Refresh: the only three endpoints open to anonymous callers. */
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;
    private final ZaloOtpService zaloOtpService;

    public AuthController(AuthService authService, ZaloOtpService zaloOtpService) {
        this.authService = authService;
        this.zaloOtpService = zaloOtpService;
    }

    /** Customer - Register trực tiếp không qua OTP (Legacy/Internal API). */
    @PostMapping("/register")
    public ResponseEntity<AuthDtos.AuthResponse> register(@Valid @RequestBody AuthDtos.RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    /** BƯỚC 1: Yêu cầu gửi mã OTP 4 số qua Zalo/Email để đăng ký. */
    @PostMapping("/request-otp")
    public ResponseEntity<ZaloOtpDtos.RequestOtpResponse> requestOtp(@Valid @RequestBody ZaloOtpDtos.RequestOtpRequest request) {
        return ResponseEntity.ok(zaloOtpService.requestOtp(request));
    }

    /** BƯỚC 2: Xác thực mã OTP 4 số và tạo tài khoản chính thức. */
    @PostMapping("/verify-otp")
    public ResponseEntity<AuthDtos.AuthResponse> verifyOtp(@Valid @RequestBody ZaloOtpDtos.VerifyOtpRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(zaloOtpService.verifyOtp(request));
    }

    /** BƯỚC 3: Gửi lại mã OTP qua Zalo/Email. */
    @PostMapping("/resend-otp")
    public ResponseEntity<ZaloOtpDtos.ResendOtpResponse> resendOtp(@Valid @RequestBody ZaloOtpDtos.ResendOtpRequest request) {
        return ResponseEntity.ok(zaloOtpService.resendOtp(request));
    }

    /** One login endpoint shared by Customer / Doctor / Staff / Admin. */
    @PostMapping("/login")
    public AuthDtos.AuthResponse login(@Valid @RequestBody AuthDtos.LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/refresh")
    public AuthDtos.AuthResponse refresh(@Valid @RequestBody AuthDtos.RefreshRequest request) {
        return authService.refresh(request);
    }

}
