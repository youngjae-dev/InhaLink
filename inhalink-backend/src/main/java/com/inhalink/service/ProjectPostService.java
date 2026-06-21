package com.inhalink.service;

import com.inhalink.domain.ProjectApplication;
import com.inhalink.domain.ProjectPost;
import com.inhalink.domain.User;
import com.inhalink.domain.enums.ApplicationStatus;
import com.inhalink.domain.enums.PostStatus;
import com.inhalink.dto.request.ProjectPostCreateRequest;
import com.inhalink.dto.response.ProjectPostResponse;
import com.inhalink.exception.PostNotFoundException;
import com.inhalink.exception.UserNotFoundException;
import com.inhalink.repository.ProjectApplicationRepository;
import com.inhalink.repository.ProjectPostRepository;
import com.inhalink.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProjectPostService {

    private final ProjectPostRepository projectPostRepository;
    private final ProjectApplicationRepository projectApplicationRepository;
    private final UserRepository userRepository;
    private final ChatService chatService;

    @Transactional
    public Long createPost(String studentId, ProjectPostCreateRequest request) {
        if (request.getDeadline().isBefore(LocalDateTime.now().plusDays(1))) {
            throw new IllegalArgumentException("마감 기한은 현재 시간으로부터 최소 24시간 이후여야 합니다.");
        }

        User writer = userRepository.findById(studentId)
                .orElseThrow(UserNotFoundException::new);

        ProjectPost post = ProjectPost.createNewPost(
                writer,
                request.getTitle(),
                request.getCategory(),
                request.getProjectName(),
                request.getContent(),
                request.getMaxMembers(),
                request.getDeadline(),
                request.getTeamFormationDate(),
                request.getPreferredQualifications(),
                request.getMessage(),
                request.getActivityMethod()
        );

        return projectPostRepository.save(post).getId();
    }

    // 모집 중인 글 목록 조회
    @Transactional(readOnly = true)
    public List<ProjectPostResponse> getRecruitingPosts() {
        return projectPostRepository.findByStatus(PostStatus.RECRUITING)
                .stream()
                .map(ProjectPostResponse::new)
                .collect(Collectors.toList());
    }

    // 글 상세 조회
    @Transactional(readOnly = true)
    public ProjectPostResponse getPost(Long postId) {
        ProjectPost post = projectPostRepository.findById(postId)
                .orElseThrow(PostNotFoundException::new);
        return new ProjectPostResponse(post);
    }

    @Transactional
    public void closePost(String studentId, Long postId) {
        ProjectPost post = projectPostRepository.findById(postId)
                .orElseThrow(PostNotFoundException::new);
        if (!post.getWriter().getStudentId().equals(studentId)) {
            throw new AccessDeniedException("마감 권한이 없습니다.");
        }
        post.close();
    }

    @Transactional
    public void updatePost(String studentId, Long postId, ProjectPostCreateRequest request) {
        ProjectPost post = projectPostRepository.findById(postId).orElseThrow(PostNotFoundException::new);
        if (!post.getWriter().getStudentId().equals(studentId)) throw new AccessDeniedException("수정 권한이 없습니다.");
        post.update(request.getTitle(), request.getCategory(), request.getProjectName(),
                request.getContent(), request.getMaxMembers(), request.getDeadline(),
                request.getTeamFormationDate(), request.getPreferredQualifications(),
                request.getMessage(), request.getActivityMethod());
    }

    @Transactional(readOnly = true)
    public List<ProjectPostResponse> getMyPosts(String studentId) {
        return projectPostRepository.findByWriterStudentIdOrderByCreatedAtDesc(studentId).stream()
                .map(ProjectPostResponse::new).collect(Collectors.toList());
    }

    @Transactional
    public void confirmPost(String studentId, Long postId) {
        ProjectPost post = projectPostRepository.findById(postId).orElseThrow(PostNotFoundException::new);
        if (!post.getWriter().getStudentId().equals(studentId)) throw new AccessDeniedException("권한이 없습니다.");

        List<ProjectApplication> all = projectApplicationRepository.findByProjectPostId(postId);
        List<ProjectApplication> accepted = all.stream()
                .filter(a -> a.getStatus() == ApplicationStatus.ACCEPTED).collect(Collectors.toList());

        if (accepted.isEmpty()) throw new IllegalStateException("수락된 지원자가 없어 그룹을 확정할 수 없습니다.");

        List<String> memberIds = new java.util.ArrayList<>();
        memberIds.add(studentId);
        accepted.forEach(a -> memberIds.add(a.getApplicant().getStudentId()));

        chatService.createRoom(post.getTitle() + " 그룹채팅", memberIds, post);
        projectApplicationRepository.deleteByProjectPostId(postId);
    }

    @Transactional
    public void cancelPost(String studentId, Long postId) {
        ProjectPost post = projectPostRepository.findById(postId).orElseThrow(PostNotFoundException::new);
        if (!post.getWriter().getStudentId().equals(studentId)) throw new AccessDeniedException("권한이 없습니다.");

        chatService.deleteRoomsByPostId(postId);
        projectApplicationRepository.deleteAll(projectApplicationRepository.findByProjectPostId(postId));
        projectPostRepository.delete(post);
    }
}