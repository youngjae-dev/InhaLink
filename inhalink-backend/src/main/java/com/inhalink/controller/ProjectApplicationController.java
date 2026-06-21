package com.inhalink.controller;

import com.inhalink.domain.enums.ApplicationStatus;
import com.inhalink.dto.response.ApiResponse;
import com.inhalink.dto.response.ApplicationResponse;
import com.inhalink.service.ProjectApplicationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import com.inhalink.dto.response.MyApplicationResponse;
import java.util.List;

@Tag(name = "Application API", description = "모집글 지원 관련 API")
@RestController
@RequiredArgsConstructor
public class ProjectApplicationController {

    private final ProjectApplicationService applicationService;

    @Operation(summary = "모집글 지원")
    @PostMapping("/api/posts/{postId}/apply")
    public ResponseEntity<ApiResponse<Long>> apply(
            @PathVariable Long postId,
            Authentication auth) {
        String studentId = (String) auth.getPrincipal();
        Long id = applicationService.applyForProject(studentId, postId);
        return ResponseEntity.ok(ApiResponse.success("지원이 완료되었습니다.", id));
    }

    @Operation(summary = "내가 지원한 글 목록 조회")
    @GetMapping("/api/applications/my")
    public ResponseEntity<ApiResponse<List<MyApplicationResponse>>> getMyApplications(Authentication auth) {
        String studentId = (String) auth.getPrincipal();
        return ResponseEntity.ok(ApiResponse.success("조회 성공", applicationService.getMyApplications(studentId)));
    }

    @Operation(summary = "지원자 목록 조회 (글 작성자만)")
    @GetMapping("/api/posts/{postId}/applications")
    public ResponseEntity<ApiResponse<List<ApplicationResponse>>> getApplications(
            @PathVariable Long postId,
            Authentication auth) {
        String studentId = (String) auth.getPrincipal();
        return ResponseEntity.ok(ApiResponse.success("조회 성공", applicationService.getApplications(studentId, postId)));
    }

    @Operation(summary = "지원 수락")
    @PatchMapping("/api/applications/{applicationId}/accept")
    public ResponseEntity<ApiResponse<Void>> accept(
            @PathVariable Long applicationId,
            Authentication auth) {
        String studentId = (String) auth.getPrincipal();
        applicationService.updateApplicationStatus(studentId, applicationId, ApplicationStatus.ACCEPTED);
        return ResponseEntity.ok(ApiResponse.success("수락되었습니다.", null));
    }

    @Operation(summary = "지원 거절")
    @PatchMapping("/api/applications/{applicationId}/reject")
    public ResponseEntity<ApiResponse<Void>> reject(
            @PathVariable Long applicationId,
            Authentication auth) {
        String studentId = (String) auth.getPrincipal();
        applicationService.updateApplicationStatus(studentId, applicationId, ApplicationStatus.REJECTED);
        return ResponseEntity.ok(ApiResponse.success("거절되었습니다.", null));
    }

    @Operation(summary = "지원 내역 삭제 (본인만)")
    @DeleteMapping("/api/applications/{applicationId}")
    public ResponseEntity<ApiResponse<Void>> deleteApplication(
            @PathVariable Long applicationId,
            Authentication auth) {
        applicationService.deleteApplication((String) auth.getPrincipal(), applicationId);
        return ResponseEntity.ok(ApiResponse.success("삭제되었습니다.", null));
    }
}
