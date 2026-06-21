package com.inhalink.service;

import com.inhalink.domain.MealPost;
import com.inhalink.domain.User;
import com.inhalink.domain.enums.PostStatus;
import com.inhalink.dto.request.MealPostCreateRequest;
import com.inhalink.dto.response.MealPostResponse;
import com.inhalink.exception.PostNotFoundException;
import com.inhalink.exception.UserNotFoundException;
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
public class MealPostService {

    private final MealPostRepository mealPostRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<MealPostResponse> getRecruitingPosts() {
        return mealPostRepository.findByStatusOrderByCreatedAtDesc(PostStatus.RECRUITING)
                .stream().map(MealPostResponse::new).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public MealPostResponse getPost(Long postId) {
        return new MealPostResponse(mealPostRepository.findById(postId)
                .orElseThrow(PostNotFoundException::new));
    }

    @Transactional
    public Long createPost(String studentId, MealPostCreateRequest request) {
        User writer = userRepository.findById(studentId)
                .orElseThrow(UserNotFoundException::new);
        MealPost post = MealPost.create(writer, request.getTitle(), request.getLocation(),
                request.getMealTime(), request.getMaxMembers(), request.getContent());
        return mealPostRepository.save(post).getId();
    }

    @Transactional
    public void closePost(String studentId, Long postId) {
        MealPost post = mealPostRepository.findById(postId)
                .orElseThrow(PostNotFoundException::new);
        if (!post.getWriter().getStudentId().equals(studentId)) {
            throw new AccessDeniedException("마감 권한이 없습니다.");
        }
        post.close();
    }

    @Transactional(readOnly = true)
    public List<MealPostResponse> getMyPosts(String studentId) {
        return mealPostRepository.findByWriterStudentIdOrderByCreatedAtDesc(studentId)
                .stream().map(MealPostResponse::new).collect(Collectors.toList());
    }
}
