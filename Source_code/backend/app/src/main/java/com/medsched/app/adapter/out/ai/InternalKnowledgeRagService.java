package com.medsched.app.adapter.out.ai;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

/** Local retrieval over reviewed clinic knowledge; no external API/token is required. */
@Service
public class InternalKnowledgeRagService {
    private static final int MAX_ANSWER_CHARS = 900;
    private final List<KnowledgeChunk> chunks;

    public InternalKnowledgeRagService() { this.chunks = loadKnowledgeBase(); }

    public Optional<Answer> retrieve(String question) {
        if (question == null || question.isBlank()) return Optional.empty();
        String normalizedQuestion = normalize(question);
        List<String> terms = List.of(normalizedQuestion.split("\\s+"));
        return chunks.stream()
                .map(chunk -> new ScoredChunk(chunk, score(chunk, normalizedQuestion, terms)))
                .filter(item -> item.score() >= 2)
                .max(Comparator.comparingInt(ScoredChunk::score))
                .map(item -> new Answer(limit(item.chunk().answer()), item.chunk().title(), item.score()));
    }

    private int score(KnowledgeChunk chunk, String question, List<String> terms) {
        int score = 0;
        String keywords = normalize(chunk.keywords());
        String title = normalize(chunk.title());
        for (String term : terms) {
            if (term.length() >= 3 && keywords.contains(term)) score += 2;
            if (term.length() >= 3 && title.contains(term)) score += 1;
        }
        if (question.contains(keywords)) score += 3;
        return score;
    }

    private List<KnowledgeChunk> loadKnowledgeBase() {
        List<KnowledgeChunk> result = new ArrayList<>();
        try (var stream = new ClassPathResource("ai/patient-knowledge-base.md").getInputStream();
             var reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            String title = null, keywords = "";
            StringBuilder answer = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.startsWith("## ")) {
                    addChunk(result, title, keywords, answer);
                    title = line.substring(3).trim(); keywords = ""; answer = new StringBuilder();
                } else if (line.toLowerCase(Locale.ROOT).startsWith("keywords:")) {
                    keywords = line.substring("keywords:".length()).trim();
                } else if (!line.isBlank()) {
                    if (answer.length() > 0) answer.append('\n');
                    answer.append(line.trim());
                }
            }
            addChunk(result, title, keywords, answer);
        } catch (Exception ignored) { }
        if (result.isEmpty()) result.add(new KnowledgeChunk("Hỗ trợ chung", "phòng khám đặt lịch giờ khám", "Bạn có thể đặt lịch trên MedSched hoặc liên hệ lễ tân để được hỗ trợ."));
        return List.copyOf(result);
    }

    private void addChunk(List<KnowledgeChunk> result, String title, String keywords, StringBuilder answer) {
        if (title != null && !answer.isEmpty()) result.add(new KnowledgeChunk(title, keywords, answer.toString()));
    }

    private String normalize(String value) {
        String decomposed = Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD);
        return decomposed.replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT).replace('đ', 'd');
    }

    private String limit(String value) { return value.length() <= MAX_ANSWER_CHARS ? value : value.substring(0, MAX_ANSWER_CHARS - 1).strip() + "…"; }

    public record Answer(String text, String source, int relevance) {}
    private record KnowledgeChunk(String title, String keywords, String answer) {}
    private record ScoredChunk(KnowledgeChunk chunk, int score) {}
}
