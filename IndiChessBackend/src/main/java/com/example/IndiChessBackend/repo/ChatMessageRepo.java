package com.example.IndiChessBackend.repo;

import com.example.IndiChessBackend.model.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepo extends JpaRepository<ChatMessage, Long> {

    List<ChatMessage> findByMatch_IdOrderByCreatedAtAsc(Long matchId);
}
