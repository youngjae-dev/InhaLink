package com.inhalink.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import com.inhalink.domain.enums.ActivityMethod;
import com.inhalink.domain.enums.PostCategory;
import com.inhalink.domain.enums.PostStatus;

@Entity
@Table(name = "project_posts")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ProjectPost extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "writer_student_id")
    private User writer;

    @Column(nullable = false)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PostCategory category; // 공모전 / 팀플 / 프로젝트

    @Column(nullable = false, length = 200)
    private String projectName; // 프로젝트 or 공모전 이름

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content; // 상세 내용

    @Column(nullable = false)
    private int maxMembers; // 총 모집 인원

    @Column(nullable = false)
    private LocalDateTime deadline; // 모집 마감일

    @Column
    private LocalDateTime teamFormationDate; // 팀 결성 희망일

    @Column(columnDefinition = "TEXT")
    private String preferredQualifications; // 우대사항

    @Column(columnDefinition = "TEXT")
    private String message; // 하고 싶은 말

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ActivityMethod activityMethod; // 온라인 / 오프라인 / 병행

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PostStatus status;

    @Builder(access = AccessLevel.PRIVATE)
    private ProjectPost(User writer, String title, PostCategory category, String projectName,
                        String content, int maxMembers, LocalDateTime deadline,
                        LocalDateTime teamFormationDate, String preferredQualifications,
                        String message, ActivityMethod activityMethod, PostStatus status) {
        this.writer = writer;
        this.title = title;
        this.category = category;
        this.projectName = projectName;
        this.content = content;
        this.maxMembers = maxMembers;
        this.deadline = deadline;
        this.teamFormationDate = teamFormationDate;
        this.preferredQualifications = preferredQualifications;
        this.message = message;
        this.activityMethod = activityMethod;
        this.status = status;
    }

    public static ProjectPost createNewPost(User writer, String title, PostCategory category,
                                            String projectName, String content, int maxMembers,
                                            LocalDateTime deadline, LocalDateTime teamFormationDate,
                                            String preferredQualifications, String message,
                                            ActivityMethod activityMethod) {
        return ProjectPost.builder()
                .writer(writer)
                .title(title)
                .category(category)
                .projectName(projectName)
                .content(content)
                .maxMembers(maxMembers)
                .deadline(deadline)
                .teamFormationDate(teamFormationDate)
                .preferredQualifications(preferredQualifications)
                .message(message)
                .activityMethod(activityMethod)
                .status(PostStatus.RECRUITING)
                .build();
    }

    public void close() {
        if (this.status == PostStatus.CLOSED) {
            throw new IllegalStateException("이미 마감된 게시글입니다.");
        }
        this.status = PostStatus.CLOSED;
    }

    public void update(String title, PostCategory category, String projectName, String content,
                       int maxMembers, LocalDateTime deadline, LocalDateTime teamFormationDate,
                       String preferredQualifications, String message, ActivityMethod activityMethod) {
        this.title = title;
        this.category = category;
        this.projectName = projectName;
        this.content = content;
        this.maxMembers = maxMembers;
        this.deadline = deadline;
        this.teamFormationDate = teamFormationDate;
        this.preferredQualifications = preferredQualifications;
        this.message = message;
        this.activityMethod = activityMethod;
    }
}