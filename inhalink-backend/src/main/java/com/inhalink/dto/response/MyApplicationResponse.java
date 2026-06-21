package com.inhalink.dto.response;

import com.inhalink.domain.ProjectApplication;
import lombok.Getter;

@Getter
public class MyApplicationResponse {
    private final Long applicationId;
    private final Long postId;
    private final String postTitle;
    private final String projectName;
    private final String categoryDescription;
    private final String postStatus;
    private final String applicationStatus;
    private final String writerName;

    public MyApplicationResponse(ProjectApplication app) {
        this.applicationId = app.getId();
        this.postId = app.getProjectPost().getId();
        this.postTitle = app.getProjectPost().getTitle();
        this.projectName = app.getProjectPost().getProjectName();
        this.categoryDescription = app.getProjectPost().getCategory().getDescription();
        this.postStatus = app.getProjectPost().getStatus().name();
        this.applicationStatus = app.getStatus().name();
        this.writerName = app.getProjectPost().getWriter().getName();
    }
}
