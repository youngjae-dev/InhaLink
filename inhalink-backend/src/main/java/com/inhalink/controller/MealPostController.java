package com.inhalink.controller;

import com.inhalink.dto.request.MealPostCreateRequest;
import com.inhalink.dto.response.ApiResponse;
import com.inhalink.dto.response.MealPostResponse;
import com.inhalink.service.MealPostService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
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

    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<MealPostResponse>>> getMyPosts(Authentication auth) {
        return ResponseEntity.ok(ApiResponse.success("조회 성공", mealPostService.getMyPosts((String) auth.getPrincipal())));
    }

    @PostMapping("/{postId}/confirm")
    public ResponseEntity<ApiResponse<Void>> confirmPost(@PathVariable Long postId, Authentication auth) {
        mealPostService.confirmPost((String) auth.getPrincipal(), postId);
        return ResponseEntity.ok(ApiResponse.success("채팅방이 개설되었습니다.", null));
    }

    @DeleteMapping("/{postId}")
    public ResponseEntity<ApiResponse<Void>> cancelPost(@PathVariable Long postId, Authentication auth) {
        mealPostService.cancelPost((String) auth.getPrincipal(), postId);
        return ResponseEntity.ok(ApiResponse.success("모집이 취소되었습니다.", null));
    }
}
