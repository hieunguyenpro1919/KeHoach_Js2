package com.medsched.app.adapter.in.scheduler;

import com.medsched.doctor.DoctorScheduleDtos;
import com.medsched.doctor.DoctorScheduleService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.ZoneId;

/**
 * Tác vụ định kỳ tự động xếp lịch trực cho toàn bộ Bác sĩ vào 17:00:00 hằng ngày.
 * Logic: Nếu trước 17:00 Bác sĩ chưa chủ động đăng ký ca trực cho ngày hôm sau,
 * hệ thống sẽ tự động xếp ca trực chuẩn (Ca sáng 8h-12h, Ca chiều 13h30-17h)
 * để mở bán khung giờ (slots) cho người bệnh đặt lịch trực tuyến vào buổi tối.
 */
@Component
public class DoctorDailyAutoScheduleJob {

    private static final Logger log = LoggerFactory.getLogger(DoctorDailyAutoScheduleJob.class);
    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final DoctorScheduleService doctorScheduleService;

    public DoctorDailyAutoScheduleJob(DoctorScheduleService doctorScheduleService) {
        this.doctorScheduleService = doctorScheduleService;
    }

    /**
     * Tự động chạy đúng 17:00:00 hằng ngày (Múi giờ Asia/Ho_Chi_Minh)
     */
    @Scheduled(cron = "0 0 17 * * *", zone = "Asia/Ho_Chi_Minh")
    public void runDailyAutoScheduleAt17h() {
        LocalDate tomorrow = LocalDate.now(VN_ZONE).plusDays(1);
        log.info("⏰ [CRON 17:00] Bắt đầu kích hoạt tự động xếp lịch trực cho ngày mai: {}", tomorrow);
        try {
            DoctorScheduleDtos.AutoScheduleResultDto result =
                    doctorScheduleService.autoGenerateScheduleForTargetDate(tomorrow);
            log.info("✅ [CRON 17:00] Hoàn tất tự động xếp lịch ngày mai: {}", result.message());
        } catch (Exception e) {
            log.error("❌ [CRON 17:00] Lỗi khi tự động xếp lịch ngày mai:", e);
        }
    }
}
