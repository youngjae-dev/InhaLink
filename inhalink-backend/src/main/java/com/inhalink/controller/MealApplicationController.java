package com.inhalink.controller;

import com.inhalink.domain.enums.ApplicationStatus;
import com.inhalink.dto.response.ApiResponse;
import com.inhalink.dto.response.MealApplicationResponse;
import com.inhalink.dto.response.MyMealApplicationResponse;
import com.inhalink.service.MealApplicationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class MealApplicationController {

    private final MealApplicationService mealApplicationService;

    @PostMapping("/api/meal-posts/{postId}/apply")
    public ResponseEntity<ApiResponse<Long>> apply(@PathVariable Long postId, Authentication auth) {
        String studentId = (String) auth.getPrincipal();
        return ResponseEntity.ok(ApiResponse.success("지원 완료", mealApplicationService.apply(studentId, postId)));
    }

    @GetMapping("/api/meal-posts/{postId}/applications")
    public ResponseEntity<ApiResponse<List<MealApplicationResponse>>> getApplications(
            @PathVariable Long postId, Authentication auth) {
        String studentId = (String) auth.getPrincipal();
        return ResponseEntity.ok(ApiResponse.success("조회 성공", mealApplicationService.getApplications(studentId, postId)));
    }

    @PatchMapping("/api/meal-applications/{appId}/accept")
    public ResponseEntity<ApiResponse<Void>> accept(@PathVariable Long appId, Authentication auth) {
        mealApplicationService.updateStatus((String) auth.getPrincipal(), appId, ApplicationStatus.ACCEPTED);
        return ResponseEntity.ok(ApiResponse.success("수락 완료", null));
    }

    @PatchMapping("/api/meal-applications/{appId}/reject")
    public ResponseEntity<ApiResponse<Void>> reject(@PathVariable Long appId, Authentication auth) {
        mealApplicationService.updateStatus((String) auth.getPrincipal(), appId, ApplicationStatus.REJECTED);
        return ResponseEntity.ok(ApiResponse.success("거절 완료", null));
    }

    @GetMapping("/api/meal-applications/my")
    public ResponseEntity<ApiResponse<List<MyMealApplicationResponse>>> getMyApplications(Authentication auth) {
        String studentId = (String) auth.getPrincipal();
        return ResponseEntity.ok(ApiResponse.success("조회 성공", mealApplicationService.getMyApplications(studentId)));
    }

    @DeleteMapping("/api/meal-applications/{appId}")
    public ResponseEntity<ApiResponse<Void>> deleteApplication(@PathVariable Long appId, Authentication auth) {
        mealApplicationService.deleteApplication((String) auth.getPrincipal(), appId);
        return ResponseEntity.ok(ApiResponse.success("삭제되었습니다.", null));
    }
}
