package com.inhalink.dto.response;

import com.inhalink.domain.ChatRoom;
import lombok.Getter;

import java.util.List;

@Getter
public class ChatRoomResponse {
    private final Long id;
    private final String name;
    private final String creatorStudentId;
    private final List<String> memberNames;

    public ChatRoomResponse(ChatRoom room) {
        this.id = room.getId();
        this.name = room.getName();
        this.creatorStudentId = room.getCreatorStudentId();
        this.memberNames = room.getMembers().stream()
                .map(m -> m.getUser().getName())
                .toList();
    }
}
