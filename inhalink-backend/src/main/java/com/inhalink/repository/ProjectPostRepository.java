package com.inhalink.repository;

import com.inhalink.domain.ProjectPost;
import com.inhalink.domain.enums.PostStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProjectPostRepository extends JpaRepository<ProjectPost, Long> {
    // 나중에 특정 상태(예: 모집중)인 글만 가져오고 싶다면 기능 추가 가능
    // List<ProjectPost> findByStatus(String status);

    List<ProjectPost> findByStatus(PostStatus status);

    List<ProjectPost> findByWriterStudentIdOrderByCreatedAtDesc(String studentId);

    @Query("SELECT p FROM ProjectPost p WHERE p.deadline < CURRENT_TIMESTAMP AND p.status = :recruitingStatus")
    List<ProjectPost> findExpiredPosts(@Param("recruitingStatus") PostStatus recruitingStatus);
}