package com.inhalink.controller;

import com.inhalink.dto.request.MealPostCreateRequest;
import com.inhalink.dto.response.ApiResponse;
import com.inhalink.dto.response.MealPostResponse;
import com.inhalink.service.MealPostService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/meal-posts")
@RequiredArgsConstructor
public class MealPostController {

    private final MealPostService mealPostService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<MealPostResponse>>> getPosts() {
        return ResponseEntity.ok(ApiResponse.success("조회 성공", mealPostService.getRecruitingPosts()));
    }

    @GetMapping("/{postId}")
    public ResponseEntity<ApiResponse<MealPostResponse>> getPost(@PathVariable Long postId) {
        return ResponseEntity.ok(ApiResponse.success("조회 성공", mealPostService.getPost(postId)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Long>> createPost(
            @RequestParam String studentId,
            @Valid @RequestBody MealPostCreateRequest request) {
        Long id = mealPostService.createPost(studentId, request);
        return ResponseEntity.ok(ApiResponse.success("작성 완료", id));
    }

    @PatchMapping("/{postId}/close")
    public ResponseEntity<ApiResponse<Void>> closePost(
            @PathVariable Long postId,
            @RequestParam String studentId) {
        mealPostService.closePost(studentId, postId);
        return ResponseEntity.ok(ApiResponse.success("마감 완료", null));
    }
}
