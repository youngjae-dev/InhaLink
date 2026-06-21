package com.inhalink.controller;

import com.inhalink.dto.request.ProjectPostCreateRequest;
import com.inhalink.dto.response.ApiResponse;
import com.inhalink.dto.response.PostCreateResponse;
import com.inhalink.dto.response.ProjectPostResponse;
import com.inhalink.service.ProjectPostService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Post API", description = "팀플·공모전 모집글 관련 API")
@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
public class ProjectPostController {

    private final ProjectPostService projectPostService;

    @Operation(summary = "모집글 목록 조회", description = "모집 중인 글 목록을 반환합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<List<ProjectPostResponse>>> getPosts() {
        List<ProjectPostResponse> posts = projectPostService.getRecruitingPosts();
        return ResponseEntity.ok(ApiResponse.success("조회 성공", posts));
    }

    @Operation(summary = "모집글 상세 조회", description = "특정 모집글의 상세 정보를 반환합니다.")
    @GetMapping("/{postId}")
    public ResponseEntity<ApiResponse<ProjectPostResponse>> getPost(@PathVariable Long postId) {
        ProjectPostResponse post = projectPostService.getPost(postId);
        return ResponseEntity.ok(ApiResponse.success("조회 성공", post));
    }

    @Operation(summary = "모집글 조기마감", description = "작성자가 모집글을 조기 마감합니다.")
    @PatchMapping("/{postId}/close")
    public ResponseEntity<ApiResponse<Void>> closePost(
            @PathVariable Long postId,
            @RequestParam String studentId) {
        projectPostService.closePost(studentId, postId);
        return ResponseEntity.ok(ApiResponse.success("마감 완료", null));
    }

    @Operation(summary = "모집글 작성", description = "필수 항목이 모두 입력되어야 등록됩니다. 마감일은 24시간 이후여야 합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<PostCreateResponse>> createPost(
            @RequestParam String studentId,
            @Valid @RequestBody ProjectPostCreateRequest request) {

        Long newPostId = projectPostService.createPost(studentId, request);
        PostCreateResponse data = new PostCreateResponse(newPostId, "모집글이 성공적으로 작성되었습니다.");
        return ResponseEntity.ok(ApiResponse.success("성공", data));
    }

}