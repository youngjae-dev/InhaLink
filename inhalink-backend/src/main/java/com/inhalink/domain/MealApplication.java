package com.inhalink.domain;

import com.inhalink.domain.enums.ApplicationStatus;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
        name = "meal_applications",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "unique_applicant_per_meal_post",
                        columnNames = {"applicant_student_id", "meal_post_id"}
                )
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MealApplication extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "applicant_student_id")
    private User applicant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "meal_post_id")
    private MealPost mealPost;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ApplicationStatus status;

    @Builder(access = AccessLevel.PRIVATE)
    private MealApplication(User applicant, MealPost mealPost, ApplicationStatus status) {
        this.applicant = applicant;
        this.mealPost = mealPost;
        this.status = status;
    }

    public static MealApplication applyToPost(User applicant, MealPost mealPost) {
        return MealApplication.builder()
                .applicant(applicant)
                .mealPost(mealPost)
                .status(ApplicationStatus.PENDING)
                .build();
    }

    public void accept() { this.status = ApplicationStatus.ACCEPTED; }
    public void reject() { this.status = ApplicationStatus.REJECTED; }
}
