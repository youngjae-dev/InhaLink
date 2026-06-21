package com.inhalink.repository;

import com.inhalink.domain.MealApplication;
import com.inhalink.domain.MealPost;
import com.inhalink.domain.User;
import com.inhalink.domain.enums.ApplicationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MealApplicationRepository extends JpaRepository<MealApplication, Long> {
    List<MealApplication> findByMealPostId(Long mealPostId);
    boolean existsByApplicantAndMealPost(User applicant, MealPost mealPost);
    List<MealApplication> findByApplicantStudentIdOrderByCreatedAtDesc(String studentId);
    List<MealApplication> findByMealPostIdAndStatus(Long mealPostId, ApplicationStatus status);

    @Modifying
    @Query("UPDATE MealApplication a SET a.status = :status WHERE a.mealPost.id = :postId")
    void updateStatusByPostId(@Param("postId") Long postId, @Param("status") ApplicationStatus status);

    @Modifying
    @Query("DELETE FROM MealApplication a WHERE a.mealPost.id = :postId")
    void deleteByMealPostId(@Param("postId") Long postId);
}
