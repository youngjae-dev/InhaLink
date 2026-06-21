package com.inhalink.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "chat_rooms")
@Getter
@NoArgsConstructor
public class ChatRoom extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    private String creatorStudentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id")
    private ProjectPost post;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "meal_post_id")
    private MealPost mealPost;

    @OneToMany(mappedBy = "chatRoom", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ChatRoomMember> members = new ArrayList<>();

    @OneToMany(mappedBy = "chatRoom", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ChatMessage> messages = new ArrayList<>();

    public static ChatRoom create(String name, ProjectPost post, String creatorStudentId) {
        ChatRoom room = new ChatRoom();
        room.name = name;
        room.post = post;
        room.creatorStudentId = creatorStudentId;
        return room;
    }

    public static ChatRoom createDirect(String name, MealPost mealPost, String creatorStudentId) {
        ChatRoom room = new ChatRoom();
        room.name = name;
        room.mealPost = mealPost;
        room.creatorStudentId = creatorStudentId;
        return room;
    }

    public void clearPost() { this.post = null; }
    public void clearMealPost() { this.mealPost = null; }
}
