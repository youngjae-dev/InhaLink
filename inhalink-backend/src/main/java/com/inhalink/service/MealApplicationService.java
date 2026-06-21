package com.inhalink.service;

import com.inhalink.domain.MealApplication;
import com.inhalink.domain.MealPost;
import com.inhalink.domain.User;
import com.inhalink.domain.enums.ApplicationStatus;
import com.inhalink.domain.enums.PostStatus;
import com.inhalink.dto.response.MealApplicationResponse;
import com.inhalink.dto.response.MyMealApplicationResponse;
import com.inhalink.exception.PostNotFoundException;
import com.inhalink.exception.UserNotFoundException;
import com.inhalink.repository.MealApplicationRepository;
import com.inhalink.repository.MealPostRepository;
import com.inhalink.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MealApplicationService {

    private final MealApplicationRepository mealApplicationRepository;
    private final MealPostRepository mealPostRepository;
    private final UserRepository userRepository;

    @Transactional
    public Long apply(String studentId, Long postId) {
        User applicant = userRepository.findById(studentId).orElseThrow(UserNotFoundException::new);
        MealPost post = mealPostRepository.findById(postId).orElseThrow(PostNotFoundException::new);

        if (post.getStatus() == PostStatus.CLOSED) throw new IllegalStateException("마감된 모집글입니다.");
        if (post.getWriter().getStudentId().equals(studentId)) throw new IllegalStateException("본인 글에 지원할 수 없습니다.");
        if (mealApplicationRepository.existsByApplicantAndMealPost(applicant, post)) throw new IllegalStateException("이미 지원하셨습니다.");

        return mealApplicationRepository.save(MealApplication.applyToPost(applicant, post)).getId();
    }

    @Transactional(readOnly = true)
    public List<MealApplicationResponse> getApplications(String loginId, Long postId) {
        MealPost post = mealPostRepository.findById(postId).orElseThrow(PostNotFoundException::new);
        if (!post.getWriter().getStudentId().equals(loginId)) throw new AccessDeniedException("조회 권한이 없습니다.");
        return mealApplicationRepository.findByMealPostId(postId).stream()
                .map(MealApplicationResponse::new).collect(Collectors.toList());
    }

    @Transactional
    public void updateStatus(String loginId, Long appId, ApplicationStatus status) {
        MealApplication app = mealApplicationRepository.findById(appId).orElseThrow(PostNotFoundException::new);
        if (!app.getMealPost().getWriter().getStudentId().equals(loginId)) throw new AccessDeniedException("권한이 없습니다.");
        if (status == ApplicationStatus.ACCEPTED) app.accept();
        else app.reject();
    }

    @Transactional(readOnly = true)
    public List<MyMealApplicationResponse> getMyApplications(String studentId) {
        return mealApplicationRepository.findByApplicantStudentIdOrderByCreatedAtDesc(studentId).stream()
                .map(MyMealApplicationResponse::new).collect(Collectors.toList());
    }
}
