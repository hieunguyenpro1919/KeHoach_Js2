package com.medsched.doctor;

import com.medsched.persistence.entity.*;
import com.medsched.persistence.enums.ScheduleStatus;
import com.medsched.persistence.enums.SlotStatus;
import com.medsched.persistence.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class DoctorScheduleServiceTest {

    @Mock
    private DoctorScheduleJpaRepository doctorScheduleRepository;
    @Mock
    private TimeSlotJpaRepository timeSlotRepository;
    @Mock
    private DoctorJpaRepository doctorRepository;
    @Mock
    private UserJpaRepository userJpaRepository;

    private DoctorScheduleService doctorScheduleService;

    @BeforeEach
    void setUp() {
        doctorScheduleService = new DoctorScheduleService(
                doctorScheduleRepository, timeSlotRepository, doctorRepository, userJpaRepository
        );
    }

    @Test
    @DisplayName("Lấy danh sách ca trực của bác sĩ và tự động tạo lịch hôm nay nếu chưa có")
    void givenDoctor_whenGetDoctorSchedules_thenReturnList() {
        Instant now = Instant.now();
        DoctorEntity doc = new DoctorEntity(
                "doc-1", "u-doc-1", "spec-1", "ThS.BS",
                BigDecimal.valueOf(300000), "P.101", "Bio", null, now, now
        );

        DoctorScheduleEntity sch = new DoctorScheduleEntity(
                "sch-1", "doc-1", LocalDate.now(), LocalTime.of(8, 0),
                LocalTime.of(12, 0), 30, ScheduleStatus.ACTIVE, now, now
        );

        given(doctorRepository.findByUserId("u-doc-1")).willReturn(List.of(doc));
        given(doctorScheduleRepository.findByDoctorIdAndWorkDate("doc-1", LocalDate.now())).willReturn(List.of(sch));
        given(doctorScheduleRepository.findByDoctorIdOrderByWorkDateAscStartTimeAsc("doc-1")).willReturn(List.of(sch));
        given(timeSlotRepository.findByScheduleIdOrderByStartTimeAsc("sch-1")).willReturn(List.of());

        var res = doctorScheduleService.getDoctorSchedules("u-doc-1", null, null, null);

        assertThat(res).hasSize(1);
        assertThat(res.get(0).id()).isEqualTo("sch-1");
    }

    @Test
    @DisplayName("Đăng ký ca trực mới thành công và sinh các time slots")
    void givenValidRequest_whenCreateSchedule_thenSaveScheduleAndSlots() {
        Instant now = Instant.now();
        DoctorEntity doc = new DoctorEntity(
                "doc-1", "u-doc-1", "spec-1", "ThS.BS",
                BigDecimal.valueOf(300000), "P.101", "Bio", null, now, now
        );

        given(doctorRepository.findById("doc-1")).willReturn(Optional.of(doc));
        given(doctorScheduleRepository.findByDoctorIdAndWorkDate("doc-1", LocalDate.now().plusDays(2))).willReturn(List.of());
        given(doctorScheduleRepository.findByWorkDate(LocalDate.now().plusDays(2))).willReturn(List.of());
        given(doctorScheduleRepository.save(any())).willAnswer(inv -> inv.getArgument(0));

        var req = new DoctorScheduleDtos.CreateScheduleRequest(
                "doc-1",
                LocalDate.now().plusDays(2),
                LocalTime.of(8, 0),
                LocalTime.of(10, 0),
                30,
                "P.101"
        );

        var res = doctorScheduleService.createSchedule("u-doc-1", req);

        assertThat(res).isNotNull();
        verify(doctorScheduleRepository).save(any());
        verify(timeSlotRepository).saveAll(any());
    }

    @Test
    @DisplayName("Khóa hoặc mở khóa time slot khám")
    void givenSlot_whenToggleSlotStatus_thenStatusChanges() {
        Instant now = Instant.now();
        TimeSlotEntity slot = new TimeSlotEntity(
                "slot-1", "sch-1", "doc-1",
                now.plusSeconds(3600), now.plusSeconds(5400),
                SlotStatus.AVAILABLE, now, now
        );

        given(timeSlotRepository.findById("slot-1")).willReturn(Optional.of(slot));
        given(timeSlotRepository.save(any())).willAnswer(inv -> inv.getArgument(0));

        var res = doctorScheduleService.toggleSlotStatus("slot-1");

        assertThat(res.status()).isEqualTo("LOCKED");
    }

    @Test
    @DisplayName("Xóa ca trực khi chưa có bệnh nhân nào đặt lịch")
    void givenUnbookedSchedule_whenDeleteSchedule_thenDeleteSuccess() {
        Instant now = Instant.now();
        DoctorScheduleEntity sch = new DoctorScheduleEntity(
                "sch-del", "doc-1", LocalDate.now(), LocalTime.of(8, 0),
                LocalTime.of(12, 0), 30, ScheduleStatus.ACTIVE, now, now
        );

        given(doctorScheduleRepository.findById("sch-del")).willReturn(Optional.of(sch));
        given(timeSlotRepository.findByScheduleIdOrderByStartTimeAsc("sch-del")).willReturn(List.of());

        doctorScheduleService.deleteSchedule("sch-del");

        verify(doctorScheduleRepository).delete(sch);
    }
}
