package com.inhalink.repository;

import com.inhalink.domain.ProjectApplication;
import com.inhalink.domain.ProjectPost;
import com.inhalink.domain.User;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProjectApplicationRepository extends JpaRepository<ProjectApplication, Long> {
    List<ProjectApplication> findByProjectPostId(Long postId);

    boolean existsByApplicantAndProjectPost(User applicant, ProjectPost projectPost);

    List<ProjectApplication> findByApplicantStudentIdOrderByCreatedAtDesc(String studentId);
}