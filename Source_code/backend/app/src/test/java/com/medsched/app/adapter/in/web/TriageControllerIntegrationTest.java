package com.medsched.app.adapter.in.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.medsched.app.adapter.in.ai.MedSchedAiTools;
import com.medsched.core.port.out.AiTriagePort;
import com.medsched.core.port.out.TriageEvaluation;
import com.medsched.security.AppUserDetailsService;
import com.medsched.security.JwtAuthenticationFilter;
import com.medsched.security.JwtService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = TriageController.class)
@AutoConfigureMockMvc(addFilters = false)
class TriageControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AiTriagePort aiTriagePort;

    @MockBean
    private MedSchedAiTools aiTools;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private AppUserDetailsService appUserDetailsService;

    @Test
    @DisplayName("POST /api/ai/triage returns triage analysis")
    void triage_success() throws Exception {
        TriageEvaluation eval = new TriageEvaluation(
                "CARDIO", "Khoa Tim Mạch",
                "Gói Khám Tim", "500,000 VND",
                "Đau thắt ngực", "Nghỉ ngơi",
                false, "Không", "Tham khảo"
        );
        given(aiTriagePort.evaluateSymptoms(eq("Đau ngực"), any())).willReturn(eval);

        TriageController.TriageRequest request = new TriageController.TriageRequest("Đau ngực", "");

        mockMvc.perform(post("/api/ai/triage")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.specialtyCode").value("CARDIO"))
                .andExpect(jsonPath("$.specialtyName").value("Khoa Tim Mạch"))
                .andExpect(jsonPath("$.recommendedService").value("Gói Khám Tim"));
    }

    @Test
    @DisplayName("GET /api/ai/tools returns available AI tool definitions")
    void getTools_success() throws Exception {
        List<Map<String, Object>> tools = List.of(
                Map.of("name", "triage_patient_symptoms", "description", "Triage symptoms"),
                Map.of("name", "lookup_doctor_directory", "description", "Doctor directory")
        );
        given(aiTools.getToolDefinitions()).willReturn(tools);

        mockMvc.perform(get("/api/ai/tools"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("triage_patient_symptoms"))
                .andExpect(jsonPath("$[1].name").value("lookup_doctor_directory"));
    }

    @Test
    @DisplayName("POST /api/ai/tools/execute executes medical tool successfully")
    void executeTool_success() throws Exception {
        given(aiTools.executeTool(eq("verify_booking_code"), any())).willReturn("{\"status\":\"CONFIRMED\"}");

        TriageController.ToolExecuteRequest request = new TriageController.ToolExecuteRequest(
                "verify_booking_code",
                Map.of("bookingCode", "MED-123456")
        );

        mockMvc.perform(post("/api/ai/tools/execute")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.toolName").value("verify_booking_code"))
                .andExpect(jsonPath("$.result").value("{\"status\":\"CONFIRMED\"}"));
    }
}
