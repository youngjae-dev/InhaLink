package com.inhalink.controller;

import com.inhalink.dto.request.ChatMessageRequest;
import com.inhalink.dto.response.ApiResponse;
import com.inhalink.dto.response.ChatMessageResponse;
import com.inhalink.dto.response.ChatRoomResponse;
import com.inhalink.service.ChatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Chat API", description = "채팅방 관련 API")
@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    // ── REST: 내 채팅방 목록 ───────────────────────────────
    @Operation(summary = "내 채팅방 목록 조회")
    @GetMapping("/rooms")
    public ResponseEntity<ApiResponse<List<ChatRoomResponse>>> getMyRooms(Authentication auth) {
        String studentId = (String) auth.getPrincipal();
        return ResponseEntity.ok(ApiResponse.success("조회 성공", chatService.getMyRooms(studentId)));
    }

    // ── REST: 채팅방 메시지 내역 조회 ─────────────────────
    @Operation(summary = "채팅방 메시지 내역 조회")
    @GetMapping("/rooms/{roomId}/messages")
    public ResponseEntity<ApiResponse<List<ChatMessageResponse>>> getMessages(
            @PathVariable Long roomId) {
        return ResponseEntity.ok(ApiResponse.success("조회 성공", chatService.getMessages(roomId)));
    }

    // ── REST: 채팅방 삭제 (방장만) ────────────────────────
    @Operation(summary = "채팅방 삭제 (방장만 가능)")
    @DeleteMapping("/rooms/{roomId}")
    public ResponseEntity<ApiResponse<Void>> deleteRoom(
            @PathVariable Long roomId, Authentication auth) {
        chatService.deleteRoom(roomId, (String) auth.getPrincipal());
        return ResponseEntity.ok(ApiResponse.success("채팅방이 삭제되었습니다.", null));
    }

    // ── WebSocket: 메시지 송신 ─────────────────────────────
    // 클라이언트: /app/chat/{roomId} 로 전송
    // 구독자:     /topic/chat/{roomId} 로 수신
    @MessageMapping("/chat/{roomId}")
    @SendTo("/topic/chat/{roomId}")
    public ChatMessageResponse sendMessage(
            @DestinationVariable Long roomId,
            ChatMessageRequest req) {
        return chatService.saveMessage(roomId, req);
    }
}
