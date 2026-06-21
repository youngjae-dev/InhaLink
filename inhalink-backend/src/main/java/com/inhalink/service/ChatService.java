package com.inhalink.service;

import com.inhalink.domain.*;
import com.inhalink.dto.request.ChatMessageRequest;
import com.inhalink.dto.response.ChatMessageResponse;
import com.inhalink.dto.response.ChatRoomResponse;
import com.inhalink.exception.UserNotFoundException;
import com.inhalink.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatRoomRepository chatRoomRepository;
    private final ChatRoomMemberRepository chatRoomMemberRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;
    private final ProjectPostRepository projectPostRepository;
    private final MealPostRepository mealPostRepository;

    // 채팅방 생성 (모집글 확정 시 또는 직접 호출)
    @Transactional
    public ChatRoomResponse createRoom(String name, List<String> studentIds, ProjectPost post) {
        String creatorId = studentIds.isEmpty() ? null : studentIds.get(0);
        ChatRoom room = post != null
                ? ChatRoom.create(name, post, creatorId)
                : ChatRoom.createDirect(name, creatorId);
        chatRoomRepository.save(room);

        for (String studentId : studentIds) {
            User user = userRepository.findById(studentId)
                    .orElseThrow(UserNotFoundException::new);
            chatRoomMemberRepository.save(ChatRoomMember.of(room, user));
        }

        return new ChatRoomResponse(chatRoomRepository.findById(room.getId()).orElseThrow());
    }

    @Transactional
    public ChatRoomResponse createRoomDirect(String name, List<String> studentIds) {
        return createRoom(name, studentIds, null);
    }

    // 모집글 연관 채팅방 전체 삭제 (모집글 삭제 시 호출)
    @Transactional
    public void deleteRoomsByPostId(Long postId) {
        chatRoomRepository.deleteAll(chatRoomRepository.findByPostId(postId));
    }

    // 채팅방 삭제 (방장만 가능) + 연결된 모집글도 삭제
    @Transactional
    public void deleteRoom(Long roomId, String studentId) {
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("채팅방이 존재하지 않습니다."));
        if (!studentId.equals(room.getCreatorStudentId())) {
            throw new org.springframework.security.access.AccessDeniedException("방장만 채팅방을 삭제할 수 있습니다.");
        }
        Long postId = room.getPost() != null ? room.getPost().getId() : null;
        chatRoomRepository.delete(room);
        if (postId != null) {
            projectPostRepository.findById(postId).ifPresent(projectPostRepository::delete);
        }
    }

    // 내 채팅방 목록 조회
    @Transactional(readOnly = true)
    public List<ChatRoomResponse> getMyRooms(String studentId) {
        return chatRoomRepository.findByMemberStudentId(studentId).stream()
                .map(ChatRoomResponse::new)
                .toList();
    }

    // 채팅방 메시지 내역 조회
    @Transactional(readOnly = true)
    public List<ChatMessageResponse> getMessages(Long roomId) {
        return chatMessageRepository.findByChatRoomIdOrderByCreatedAtAsc(roomId).stream()
                .map(ChatMessageResponse::new)
                .toList();
    }

    // 메시지 저장 (WebSocket 수신 시 호출)
    @Transactional
    public ChatMessageResponse saveMessage(Long roomId, ChatMessageRequest req) {
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("채팅방이 존재하지 않습니다."));
        User sender = userRepository.findById(req.getSenderStudentId())
                .orElseThrow(UserNotFoundException::new);

        ChatMessage msg = ChatMessage.of(room, sender, req.getContent());
        chatMessageRepository.save(msg);
        return new ChatMessageResponse(msg);
    }
}
