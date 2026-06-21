package com.inhalink.domain.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ApplicationStatus {
    PENDING("대기 중"),
    ACCEPTED("수락됨"),
    REJECTED("거절됨"),
    CANCELLED("모집취소");

    private final String description; // 상태에 대한 한글 설명
}