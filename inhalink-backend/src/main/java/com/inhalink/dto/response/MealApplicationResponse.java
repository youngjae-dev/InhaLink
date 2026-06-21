package com.inhalink.dto.response;

import com.inhalink.domain.MealApplication;
import lombok.Getter;

@Getter
public class MealApplicationResponse {
    private final Long id;
    private final String applicantStudentId;
    private final String applicantName;
    private final String applicantDepartment;
    private final String applicantContact;
    private final String status;

    public MealApplicationResponse(MealApplication app) {
        this.id = app.getId();
        this.applicantStudentId = app.getApplicant().getStudentId();
        this.applicantName = app.getApplicant().getName();
        this.applicantDepartment = app.getApplicant().getDepartment();
        this.applicantContact = app.getApplicant().getContact();
        this.status = app.getStatus().name();
    }
}
