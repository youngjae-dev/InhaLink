package com.inhalink.domain;

import com.inhalink.domain.enums.ApplicationStatus;
import jakarta.persistence.*;
import lombok.*;

@Entity
// 서버 로직은 아주 찰나의 순간에 동시에 두 요청이 들어오면
// 둘 다 "지원 내역 없음"으로 판단해버릴 위험이 있다.
// 이를 DB 수준에서 "한 명의 유저는 하나의 글에 한 번만 존재해야 한다"고 방지하는 것입니다.
// 따라서, 복합 유니크 제약 조건을 추가
@Table(
        name = "project_applications",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "unique_applicant_per_post",
                        columnNames = {"applicant_student_id", "post_id"} // FK로 설정한 컬럼명들
                )
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ProjectApplication extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; // 지원 ID (PK)

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "applicant_student_id")
    private User applicant; // 지원자 (FK)

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id")
    private ProjectPost projectPost; // 지원한 글 (FK)

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ApplicationStatus status;

    // 나중에 속성 추가 시 이 자리에 작성
    // private String githubUrl;
    // private String portfolioUrl;

    // 1. private 빌더로 외부 접근 차단
    @Builder(access = AccessLevel.PRIVATE)
    private ProjectApplication(User applicant, ProjectPost projectPost, ApplicationStatus status) {
        this.applicant = applicant;
        this.projectPost = projectPost;
        this.status = status;
    }

    // 2. 정적 팩토리 메서드: 생성 시 무조건 'PENDING(대기 중)' 상태로 고정
    public static ProjectApplication applyToPost(User applicant, ProjectPost projectPost) {
        return ProjectApplication.builder()
                .applicant(applicant)
                .projectPost(projectPost)
                .status(ApplicationStatus.PENDING)
                .build();
    }

    public void accept() { this.status = ApplicationStatus.ACCEPTED; }
    public void reject() { this.status = ApplicationStatus.REJECTED; }
    public void cancel() { this.status = ApplicationStatus.CANCELLED; }
}