package com.inhalink.repository;

import com.inhalink.domain.ChatRoom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ChatRoomRepository extends JpaRepository<ChatRoom, Long> {

    @Query("SELECT DISTINCT cr FROM ChatRoom cr JOIN cr.members m WHERE m.user.studentId = :studentId")
    List<ChatRoom> findByMemberStudentId(@Param("studentId") String studentId);

    List<ChatRoom> findByPostId(Long postId);
}
