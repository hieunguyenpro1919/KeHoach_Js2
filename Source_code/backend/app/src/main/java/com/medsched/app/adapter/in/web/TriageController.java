package com.medsched.app.adapter.in.web;

import com.medsched.app.adapter.in.ai.MedSchedAiTools;
import com.medsched.core.port.out.AiTriagePort;
import com.medsched.core.port.out.TriageEvaluation;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class TriageController {

    private final AiTriagePort aiTriagePort;
    private final MedSchedAiTools aiTools;

    public TriageController(AiTriagePort aiTriagePort, MedSchedAiTools aiTools) {
        this.aiTriagePort = aiTriagePort;
        this.aiTools = aiTools;
    }

    public record TriageRequest(String symptoms, String medicalHistory) {}
    public record ToolExecuteRequest(String toolName, Map<String, Object> arguments) {}

    @PostMapping("/triage")
    public ResponseEntity<Map<String, Object>> triage(@RequestBody TriageRequest request) {
        TriageEvaluation eval = aiTriagePort.evaluateSymptoms(request.symptoms(), request.medicalHistory());

        Map<String, Object> response = new HashMap<>();
        // Tương thích ngược với các hàm Frontend cũ
        response.put("specialty", eval.specialtyName());
        response.put("suggestedSpecialty", eval.specialtyCode());
        response.put("summary", eval.clinicalSummary());
        response.put("clinicalSummary", eval.clinicalSummary());
        response.put("disclaimer", eval.disclaimer());

        // Các trường mở rộng mới chuẩn hóa cho Phòng khám tư
        response.put("specialtyCode", eval.specialtyCode());
        response.put("specialtyName", eval.specialtyName());
        response.put("recommendedService", eval.recommendedService());
        response.put("estimatedFee", eval.estimatedFee());
        response.put("preparationAdvice", eval.preparationAdvice());
        response.put("isEmergency", eval.isEmergency());
        response.put("emergencyWarning", eval.emergencyWarning());

        return ResponseEntity.ok(response);
    }

    /**
     * Khám phá danh mục các công cụ AI (AI/MCP Tools) có sẵn trong hệ thống.
     */
    @GetMapping("/tools")
    public ResponseEntity<List<Map<String, Object>>> getTools() {
        return ResponseEntity.ok(aiTools.getToolDefinitions());
    }

    /**
     * Cho phép AI Agent hoặc Frontend Client thực thi trực tiếp các Tool y tế.
     */
    @PostMapping("/tools/execute")
    public ResponseEntity<Map<String, Object>> executeTool(@RequestBody ToolExecuteRequest request) {
        String result = aiTools.executeTool(request.toolName(), request.arguments());
        return ResponseEntity.ok(Map.of(
                "toolName", request.toolName() != null ? request.toolName() : "",
                "result", result
        ));
    }
}
