package com.inhalink.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import java.time.LocalDateTime;

@Getter
public class MealPostCreateRequest {

    @NotBlank
    private String title;

    @NotBlank
    private String location;

    @NotNull
    private LocalDateTime mealTime;

    @Min(2)
    private int maxMembers;

    private String content;
}
