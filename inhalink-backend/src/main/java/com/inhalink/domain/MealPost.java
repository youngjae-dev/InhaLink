package com.inhalink.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import com.inhalink.domain.enums.PostStatus;

@Entity
@Table(name = "meal_posts")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MealPost extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "writer_student_id")
    private User writer;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(nullable = false, length = 100)
    private String location;

    @Column(nullable = false)
    private LocalDateTime mealTime;

    @Column(nullable = false)
    private int maxMembers;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PostStatus status;

    @Builder(access = AccessLevel.PRIVATE)
    private MealPost(User writer, String title, String location, LocalDateTime mealTime,
                     int maxMembers, String content) {
        this.writer = writer;
        this.title = title;
        this.location = location;
        this.mealTime = mealTime;
        this.maxMembers = maxMembers;
        this.content = content;
        this.status = PostStatus.RECRUITING;
    }

    public static MealPost create(User writer, String title, String location,
                                   LocalDateTime mealTime, int maxMembers, String content) {
        return MealPost.builder()
                .writer(writer).title(title).location(location)
                .mealTime(mealTime).maxMembers(maxMembers).content(content)
                .build();
    }

    public void close() {
        if (this.status == PostStatus.CLOSED) {
            throw new IllegalStateException("이미 마감된 게시글입니다.");
        }
        this.status = PostStatus.CLOSED;
    }
}
