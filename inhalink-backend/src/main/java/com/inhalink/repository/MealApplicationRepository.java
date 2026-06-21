package com.inhalink.repository;

import com.inhalink.domain.MealApplication;
import com.inhalink.domain.MealPost;
import com.inhalink.domain.User;
import com.inhalink.domain.enums.ApplicationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MealApplicationRepository extends JpaRepository<MealApplication, Long> {
    List<MealApplication> findByMealPostId(Long mealPostId);
    boolean existsByApplicantAndMealPost(User applicant, MealPost mealPost);
    List<MealApplication> findByApplicantStudentIdOrderByCreatedAtDesc(String studentId);
    List<MealApplication> findByMealPostIdAndStatus(Long mealPostId, ApplicationStatus status);
}
