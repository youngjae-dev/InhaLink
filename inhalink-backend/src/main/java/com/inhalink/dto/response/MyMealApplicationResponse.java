package com.inhalink.dto.response;

import com.inhalink.domain.MealApplication;
import lombok.Getter;

@Getter
public class MyMealApplicationResponse {
    private final Long applicationId;
    private final Long postId;
    private final String postTitle;
    private final String location;
    private final String postStatus;
    private final String applicationStatus;
    private final String writerName;

    public MyMealApplicationResponse(MealApplication app) {
        this.applicationId = app.getId();
        this.postId = app.getMealPost().getId();
        this.postTitle = app.getMealPost().getTitle();
        this.location = app.getMealPost().getLocation();
        this.postStatus = app.getMealPost().getStatus().name();
        this.applicationStatus = app.getStatus().name();
        this.writerName = app.getMealPost().getWriter().getName();
    }
}
