package com.medsched.app.adapter.in.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.medsched.core.port.out.AiTriagePort;
import com.medsched.core.port.out.TriageEvaluation;
import com.medsched.persistence.entity.AppointmentEntity;
import com.medsched.persistence.entity.DoctorEntity;
import com.medsched.persistence.entity.TimeSlotEntity;
import com.medsched.persistence.enums.SlotStatus;
import com.medsched.persistence.repository.AppointmentJpaRepository;
import com.medsched.persistence.repository.DoctorJpaRepository;
import com.medsched.persistence.repository.TimeSlotJpaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.function.Supplier;

/**
 * Adapter cung cấp các công cụ y tế (Medical AI Tools / MCP Tools)
 * cho AI Agent / LLM Client tương tự mô hình MCP trong test-demo.
 *
 * <p>Mỗi tool được bọc cơ chế xử lý lỗi an toàn ({@link #safely(Supplier)})
 * để chuyển đổi các ngoại lệ thành câu thông báo thân thiện mà mô hình AI có thể hiểu được.
 */
@Component
public class MedSchedAiTools {

    private static final Logger log = LoggerFactory.getLogger(MedSchedAiTools.class);

    private final AiTriagePort aiTriagePort;
    private final DoctorJpaRepository doctorRepository;
    private final TimeSlotJpaRepository timeSlotRepository;
    private final AppointmentJpaRepository appointmentRepository;
    private final ObjectMapper objectMapper;

    public MedSchedAiTools(
            AiTriagePort aiTriagePort,
            DoctorJpaRepository doctorRepository,
            TimeSlotJpaRepository timeSlotRepository,
            AppointmentJpaRepository appointmentRepository,
            ObjectMapper objectMapper
    ) {
        this.aiTriagePort = aiTriagePort;
        this.doctorRepository = doctorRepository;
        this.timeSlotRepository = timeSlotRepository;
        this.appointmentRepository = appointmentRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * Tool 1: Phân tích triệu chứng bệnh nhân, gợi ý chuyên khoa, dịch vụ và cảnh báo cấp cứu.
     */
    public String triagePatientSymptoms(String symptoms, String medicalHistory) {
        return safely(() -> {
            TriageEvaluation eval = aiTriagePort.evaluateSymptoms(symptoms, medicalHistory);
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("specialtyCode", eval.specialtyCode());
            result.put("specialtyName", eval.specialtyName());
            result.put("clinicalSummary", eval.clinicalSummary());
            result.put("recommendedService", eval.recommendedService());
            result.put("estimatedFee", eval.estimatedFee());
            result.put("isEmergency", eval.isEmergency());
            result.put("emergencyWarning", eval.emergencyWarning());
            result.put("preparationAdvice", eval.preparationAdvice());
            result.put("disclaimer", eval.disclaimer());
            return toJson(result);
        });
    }

    /**
     * Tool 2: Tra cứu danh bạ bác sĩ theo chuyên khoa.
     */
    public String lookupDoctorDirectory(String specialtyId) {
        return safely(() -> {
            List<DoctorEntity> doctors;
            if (specialtyId != null && !specialtyId.isBlank()) {
                doctors = doctorRepository.findBySpecialtyId(specialtyId);
            } else {
                doctors = doctorRepository.findAll();
            }

            List<Map<String, Object>> list = doctors.stream().map(d -> {
                Map<String, Object> map = new LinkedHashMap<>();
                map.put("doctorId", d.getId());
                map.put("specialtyId", d.getSpecialtyId());
                map.put("academicTitle", d.getAcademicTitle());
                map.put("roomNumber", d.getRoomNumber());
                map.put("consultationFee", d.getConsultationFee());
                map.put("biography", d.getBio());
                return map;
            }).toList();

            return toJson(list);
        });
    }

    /**
     * Tool 3: Tra cứu các khung giờ khám còn trống của bác sĩ.
     */
    public String getAvailableTimeSlots(String doctorId) {
        return safely(() -> {
            if (doctorId == null || doctorId.isBlank()) {
                return "Lỗi: Cần cung cấp doctorId để tra cứu khung giờ khám.";
            }

            List<TimeSlotEntity> slots = timeSlotRepository
                    .findByDoctorIdAndStatusOrderByStartTimeAsc(doctorId, SlotStatus.AVAILABLE);

            List<Map<String, Object>> list = slots.stream().map(s -> {
                Map<String, Object> map = new LinkedHashMap<>();
                map.put("slotId", s.getId());
                map.put("doctorId", s.getDoctorId());
                map.put("startTime", s.getStartTime() != null ? s.getStartTime().toString() : null);
                map.put("endTime", s.getEndTime() != null ? s.getEndTime().toString() : null);
                map.put("status", s.getStatus() != null ? s.getStatus().name() : "AVAILABLE");
                return map;
            }).toList();

            return toJson(list);
        });
    }

    /**
     * Tool 4: Tra cứu thông tin vé hẹn và số thứ tự theo mã đặt lịch (booking code).
     */
    public String verifyBookingCode(String bookingCode) {
        return safely(() -> {
            if (bookingCode == null || bookingCode.isBlank()) {
                return "Lỗi: Vui lòng nhập mã vé hẹn (booking code).";
            }

            Optional<AppointmentEntity> opt = appointmentRepository.findByBookingCode(bookingCode.trim().toUpperCase());
            if (opt.isEmpty()) {
                return "Không tìm thấy lịch hẹn với mã: " + bookingCode;
            }

            AppointmentEntity apt = opt.get();
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("appointmentId", apt.getId());
            map.put("bookingCode", apt.getBookingCode());
            map.put("queueNumber", apt.getQueueNumber());
            map.put("doctorId", apt.getDoctorId());
            map.put("status", apt.getStatus() != null ? apt.getStatus().name() : null);
            map.put("queueType", apt.getQueueType() != null ? apt.getQueueType().name() : null);
            map.put("checkinTime", apt.getCheckInTime() != null ? apt.getCheckInTime().toString() : null);
            return toJson(map);
        });
    }

    /**
     * Danh sách định nghĩa các công cụ y tế (Metadata Schemas) cho AI Agent / LLM Client.
     */
    public List<Map<String, Object>> getToolDefinitions() {
        return List.of(
                Map.of(
                        "name", "triage_patient_symptoms",
                        "description", "Phân tích triệu chứng y tế của bệnh nhân, đưa ra gợi ý chuyên khoa, dịch vụ và cảnh báo cấp cứu.",
                        "parameters", Map.of(
                                "type", "object",
                                "properties", Map.of(
                                        "symptoms", Map.of("type", "string", "description", "Mô tả triệu chứng bệnh nhân đang gặp phải"),
                                        "medicalHistory", Map.of("type", "string", "description", "Tiền sử bệnh lý (tùy chọn)")
                                ),
                                "required", List.of("symptoms")
                        )
                ),
                Map.of(
                        "name", "lookup_doctor_directory",
                        "description", "Tra cứu danh bạ bác sĩ và buồng khám theo mã chuyên khoa.",
                        "parameters", Map.of(
                                "type", "object",
                                "properties", Map.of(
                                        "specialtyId", Map.of("type", "string", "description", "Mã chuyên khoa cần tra cứu (để trống nếu lấy tất cả)")
                                )
                        )
                ),
                Map.of(
                        "name", "get_available_time_slots",
                        "description", "Tra cứu danh sách các khung giờ khám còn trống (AVAILABLE) của bác sĩ.",
                        "parameters", Map.of(
                                "type", "object",
                                "properties", Map.of(
                                        "doctorId", Map.of("type", "string", "description", "Mã định danh của bác sĩ")
                                ),
                                "required", List.of("doctorId")
                        )
                ),
                Map.of(
                        "name", "verify_booking_code",
                        "description", "Tra cứu trạng thái vé hẹn, số thứ tự khám và buồng khám theo mã booking code.",
                        "parameters", Map.of(
                                "type", "object",
                                "properties", Map.of(
                                        "bookingCode", Map.of("type", "string", "description", "Mã đặt lịch hẹn (ví may: MED-123456)")
                                ),
                                "required", List.of("bookingCode")
                        )
                )
        );
    }

    /**
     * Thực thi tool theo tên và tham số.
     */
    public String executeTool(String toolName, Map<String, Object> arguments) {
        if (toolName == null) {
            return "Lỗi: toolName không được để trống.";
        }
        Map<String, Object> args = arguments != null ? arguments : Collections.emptyMap();

        return switch (toolName) {
            case "triage_patient_symptoms" -> triagePatientSymptoms(
                    Objects.toString(args.get("symptoms"), ""),
                    Objects.toString(args.get("medicalHistory"), "")
            );
            case "lookup_doctor_directory" -> lookupDoctorDirectory(
                    Objects.toString(args.get("specialtyId"), null)
            );
            case "get_available_time_slots" -> getAvailableTimeSlots(
                    Objects.toString(args.get("doctorId"), "")
            );
            case "verify_booking_code" -> verifyBookingCode(
                    Objects.toString(args.get("bookingCode"), "")
            );
            default -> "Lỗi: Không tìm thấy tool '" + toolName + "'.";
        };
    }

    /**
     * Wrapper an toàn áp dụng từ test-demo:
     * Bắt mọi ngoại lệ và trả về chuỗi thông báo để mô hình AI có thể đọc và phản hồi người dùng.
     */
    private String safely(Supplier<String> call) {
        try {
            return call.get();
        } catch (Exception ex) {
            log.error("AI Tool call failed: {}", ex.getMessage(), ex);
            return "Thao tác thất bại: " + ex.getMessage();
        }
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return String.valueOf(obj);
        }
    }
}
