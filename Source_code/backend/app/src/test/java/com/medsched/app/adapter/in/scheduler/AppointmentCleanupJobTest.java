package com.medsched.app.adapter.in.scheduler;

import com.medsched.persistence.entity.AppointmentEntity;
import com.medsched.persistence.entity.TimeSlotEntity;
import com.medsched.persistence.enums.AppointmentStatus;
import com.medsched.persistence.enums.QueueType;
import com.medsched.persistence.enums.SlotStatus;
import com.medsched.persistence.repository.AppointmentJpaRepository;
import com.medsched.persistence.repository.TimeSlotJpaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class AppointmentCleanupJobTest {

    @Mock
    private AppointmentJpaRepository appointmentJpaRepository;
    @Mock
    private TimeSlotJpaRepository timeSlotJpaRepository;

    private AppointmentCleanupJob job;

    @BeforeEach
    void setUp() {
        job = new AppointmentCleanupJob(appointmentJpaRepository, timeSlotJpaRepository);
    }

    @Test
    @DisplayName("Tự động hủy ca PENDING quá 15 phút và giải phóng slot")
    void givenExpiredPendingAppointment_whenCleanup_thenCancelAndReleaseSlot() {
        Instant thirtyMinsAgo = Instant.now().minus(30, ChronoUnit.MINUTES);

        AppointmentEntity appt = new AppointmentEntity(
                "app-expired", "MED-EXP", "c-1", "p-1", "doc-1", "slot-1",
                "01", QueueType.ONLINE_BOOKED, "Trieu chung", AppointmentStatus.PENDING,
                thirtyMinsAgo, thirtyMinsAgo
        );

        TimeSlotEntity slot = new TimeSlotEntity(
                "slot-1", "sch-1", "doc-1",
                thirtyMinsAgo, thirtyMinsAgo.plusSeconds(1800),
                SlotStatus.BOOKED, thirtyMinsAgo, thirtyMinsAgo
        );

        given(appointmentJpaRepository.findAll()).willReturn(List.of(appt));
        given(timeSlotJpaRepository.findById("slot-1")).willReturn(Optional.of(slot));

        job.cleanupExpiredAppointments();

        verify(appointmentJpaRepository).save(any());
        verify(timeSlotJpaRepository).save(any());
    }
}
