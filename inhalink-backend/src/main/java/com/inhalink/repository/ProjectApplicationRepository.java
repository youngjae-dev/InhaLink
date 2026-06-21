package com.inhalink.repository;

import com.inhalink.domain.ProjectApplication;
import com.inhalink.domain.ProjectPost;
import com.inhalink.domain.User;
import com.inhalink.domain.enums.ApplicationStatus;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ProjectApplicationRepository extends JpaRepository<ProjectApplication, Long> {
    List<ProjectApplication> findByProjectPostId(Long postId);
    boolean existsByApplicantAndProjectPost(User applicant, ProjectPost projectPost);
    List<ProjectApplication> findByApplicantStudentIdOrderByCreatedAtDesc(String studentId);

    @Modifying
    @Query("UPDATE ProjectApplication a SET a.status = :status WHERE a.projectPost.id = :postId")
    void updateStatusByPostId(@Param("postId") Long postId, @Param("status") ApplicationStatus status);

    @Modifying
    @Query("DELETE FROM ProjectApplication a WHERE a.projectPost.id = :postId")
    void deleteByProjectPostId(@Param("postId") Long postId);
}