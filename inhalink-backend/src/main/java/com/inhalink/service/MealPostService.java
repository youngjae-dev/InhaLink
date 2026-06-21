package com.inhalink.service;

import com.inhalink.domain.MealApplication;
import com.inhalink.domain.MealPost;
import com.inhalink.domain.User;
import com.inhalink.domain.enums.ApplicationStatus;
import com.inhalink.domain.enums.PostStatus;
import com.inhalink.dto.request.MealPostCreateRequest;
import com.inhalink.dto.response.MealPostResponse;
import com.inhalink.exception.PostNotFoundException;
import com.inhalink.exception.UserNotFoundException;
import com.inhalink.repository.MealApplicationRepository;
import com.inhalink.repository.MealPostRepository;
import com.inhalink.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MealPostService {

    private final MealPostRepository mealPostRepository;
    private final MealApplicationRepository mealApplicationRepository;
    private final UserRepository userRepository;
    private final ChatService chatService;

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

    @Transactional
    public void updatePost(String studentId, Long postId, MealPostCreateRequest request) {
        MealPost post = mealPostRepository.findById(postId).orElseThrow(PostNotFoundException::new);
        if (!post.getWriter().getStudentId().equals(studentId)) throw new AccessDeniedException("수정 권한이 없습니다.");
        post.update(request.getTitle(), request.getLocation(), request.getMealTime(),
                request.getMaxMembers(), request.getContent());
    }

    @Transactional(readOnly = true)
    public List<MealPostResponse> getMyPosts(String studentId) {
        return mealPostRepository.findByWriterStudentIdOrderByCreatedAtDesc(studentId)
                .stream().map(MealPostResponse::new).collect(Collectors.toList());
    }

    @Transactional
    public void confirmPost(String studentId, Long postId) {
        MealPost post = mealPostRepository.findById(postId).orElseThrow(PostNotFoundException::new);
        if (!post.getWriter().getStudentId().equals(studentId)) throw new AccessDeniedException("권한이 없습니다.");

        List<MealApplication> all = mealApplicationRepository.findByMealPostId(postId);
        List<MealApplication> accepted = all.stream()
                .filter(a -> a.getStatus() == ApplicationStatus.ACCEPTED).collect(Collectors.toList());

        if (accepted.isEmpty()) throw new IllegalStateException("수락된 지원자가 없어 그룹을 확정할 수 없습니다.");

        List<String> memberIds = new ArrayList<>();
        memberIds.add(studentId);
        accepted.forEach(a -> memberIds.add(a.getApplicant().getStudentId()));

        chatService.createRoomDirect(post.getTitle() + " 밥친구채팅", memberIds);
        mealApplicationRepository.deleteAll(all);
    }

    @Transactional
    public void cancelPost(String studentId, Long postId) {
        MealPost post = mealPostRepository.findById(postId).orElseThrow(PostNotFoundException::new);
        if (!post.getWriter().getStudentId().equals(studentId)) throw new AccessDeniedException("권한이 없습니다.");

        mealApplicationRepository.findByMealPostId(postId).forEach(MealApplication::reject);
        mealPostRepository.delete(post);
    }
}
