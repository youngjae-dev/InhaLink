package com.inhalink.repository;

import com.inhalink.domain.MealPost;
import com.inhalink.domain.enums.PostStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MealPostRepository extends JpaRepository<MealPost, Long> {
    List<MealPost> findByStatusOrderByCreatedAtDesc(PostStatus status);
    List<MealPost> findByWriterStudentIdOrderByCreatedAtDesc(String studentId);
}
