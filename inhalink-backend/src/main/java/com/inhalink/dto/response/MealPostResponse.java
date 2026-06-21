package com.inhalink.dto.response;

import com.inhalink.domain.MealPost;
import lombok.Getter;
import java.time.LocalDateTime;

@Getter
public class MealPostResponse {
    private final Long id;
    private final String writerStudentId;
    private final String writerName;
    private final String title;
    private final String location;
    private final LocalDateTime mealTime;
    private final int maxMembers;
    private final String content;
    private final String status;
    private final LocalDateTime createdAt;

    public MealPostResponse(MealPost post) {
        this.id = post.getId();
        this.writerStudentId = post.getWriter().getStudentId();
        this.writerName = post.getWriter().getName();
        this.title = post.getTitle();
        this.location = post.getLocation();
        this.mealTime = post.getMealTime();
        this.maxMembers = post.getMaxMembers();
        this.content = post.getContent();
        this.status = post.getStatus().name();
        this.createdAt = post.getCreatedAt();
    }
}
