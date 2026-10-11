package com.medsched.mail;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;

/**
 * Dịch vụ gửi Email tự động qua Google Gmail SMTP (Miễn phí 100%).
 */
@Service("otpEmailService")
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String fromEmail;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    /**
     * Gửi email mã OTP xác thực đăng ký tài khoản MedSched (HTML đẹp mắt).
     */
    public void sendOtpEmail(String toEmail, String recipientName, String otpCode) {
        if (fromEmail == null || fromEmail.isBlank()) {
            log.warn("⚠️ [EmailService] Chưa cấu hình spring.mail.username. Bỏ qua gửi email.");
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(
                    message,
                    MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED,
                    StandardCharsets.UTF_8.name()
            );

            helper.setFrom(fromEmail, "MedSched Smart Healthcare");
            helper.setTo(toEmail);
            helper.setSubject("[MedSched] " + otpCode + " là mã xác thực OTP đăng ký tài khoản của bạn");

            String htmlContent = buildOtpHtmlTemplate(recipientName, otpCode);
            helper.setText(htmlContent, true);

            mailSender.send(message);
            log.info("✅ [EmailService] Đã gửi email chứa mã OTP [{}] thành công tới: {}", otpCode, toEmail);
        } catch (MessagingException e) {
            log.error("❌ [EmailService] Lỗi tạo nội dung email gửi tới {}: {}", toEmail, e.getMessage());
            throw new RuntimeException("Không thể gửi email xác thực. Vui lòng thử lại sau.", e);
        } catch (Exception e) {
            log.error("❌ [EmailService] Lỗi khi gửi email qua Gmail SMTP tới {}: {}", toEmail, e.getMessage(), e);
            throw new RuntimeException("Lỗi hệ thống khi gửi email xác thực: " + e.getMessage(), e);
        }
    }

    private String buildOtpHtmlTemplate(String recipientName, String otpCode) {
        String safeName = (recipientName == null || recipientName.isBlank()) ? "Quý khách" : recipientName.trim();
        return """
                <!DOCTYPE html>
                <html lang="vi">
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>Mã xác thực OTP MedSched</title>
                </head>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b;">
                  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%%" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
                    <!-- Header -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #0d9488 0%%, #0f766e 100%%); padding: 32px 24px; text-align: center; color: #ffffff;">
                        <div style="font-size: 26px; font-weight: 800; letter-spacing: -0.5px; margin: 0;">MedSched Smart Healthcare</div>
                        <div style="font-size: 14px; opacity: 0.92; margin-top: 6px;">Hệ Thống Đặt Lịch & Chăm Sóc Y Tế Thông Minh</div>
                      </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                      <td style="padding: 32px 28px;">
                        <p style="font-size: 16px; font-weight: 600; color: #0f172a; margin: 0 0 12px 0;">Xin chào %s,</p>
                        <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 24px 0;">
                          Cảm ơn bạn đã lựa chọn đăng ký tài khoản tại <strong>MedSched</strong>. Để hoàn tất quy trình kích hoạt tài khoản và bảo vệ an toàn thông tin, vui lòng nhập mã xác thực OTP 4 chữ số dưới đây:
                        </p>
                        
                        <!-- OTP Box -->
                        <div style="background-color: #f0fdfa; border: 2px dashed #0d9488; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
                          <div style="font-size: 12px; font-weight: 700; color: #0d9488; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">MÃ XÁC THỰC OTP CỦA BẠN</div>
                          <div style="font-size: 42px; font-weight: 900; letter-spacing: 12px; color: #0f766e; font-family: 'Consolas', 'Courier New', monospace; padding-left: 12px;">%s</div>
                        </div>
                        
                        <!-- Notice Box -->
                        <div style="background-color: #f8fafc; border-left: 4px solid #0d9488; border-radius: 6px; padding: 14px 16px; margin: 24px 0; font-size: 13px; color: #334155; line-height: 1.6;">
                          ⏱️ <strong>Thời gian hiệu lực:</strong> Mã này có giá trị trong vòng <strong>2 phút (120 giây)</strong>.<br>
                          🔒 <strong>Nguyên tắc an toàn:</strong> Tuyệt đối không chia sẻ mã này cho bất kỳ ai, kể cả nhân viên y tế hoặc tổng đài viên.
                        </div>
                        
                        <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 20px 0 0 0;">
                          Nếu bạn không thực hiện yêu cầu đăng ký này, hãy bỏ qua email này hoặc thông báo cho chúng tôi để được hỗ trợ.
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.6;">
                        © 2026 <strong>MedSched</strong>. All rights reserved.<br>
                        Đây là email tự động gửi từ hệ thống máy chủ, vui lòng không phản hồi trực tiếp.
                      </td>
                    </tr>
                  </table>
                </body>
                </html>
                """.formatted(safeName, otpCode);
    }
}
