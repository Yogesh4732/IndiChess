package com.example.IndiChessBackend.service;

import com.example.IndiChessBackend.model.ChatMessage;
import com.example.IndiChessBackend.model.DTO.ChatMessageDTO;
import com.example.IndiChessBackend.model.Match;
import com.example.IndiChessBackend.model.User;
import com.example.IndiChessBackend.repo.ChatMessageRepo;
import com.example.IndiChessBackend.repo.MatchRepo;
import com.example.IndiChessBackend.repo.UserRepo;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatMessageRepo chatMessageRepo;
    private final MatchRepo matchRepo;
    private final UserRepo userRepo;

    @Transactional
    public ChatMessageDTO saveChatMessage(Long matchId, String username, String messageText) {
        if (messageText == null || messageText.trim().isEmpty()) {
            throw new IllegalArgumentException("Message cannot be empty");
        }

        Optional<Match> matchOpt = matchRepo.findById(matchId);
        if (matchOpt.isEmpty()) {
            throw new IllegalArgumentException("Match not found: " + matchId);
        }

        // UserRepo#findByUsername returns a User (not Optional) in this project,
        // so we need a null check instead of Optional.orElseThrow.
        User sender = userRepo.findByUsername(username);
        if (sender == null) {
            throw new IllegalArgumentException("User not found: " + username);
        }

        ChatMessage chatMessage = new ChatMessage();
        chatMessage.setMatch(matchOpt.get());
        chatMessage.setSender(sender);
        chatMessage.setMessage(messageText.trim());

        ChatMessage saved = chatMessageRepo.save(chatMessage);

        return new ChatMessageDTO(
                saved.getId(),
                saved.getMatch().getId(),
                saved.getSender().getUsername(),
                saved.getMessage(),
                saved.getCreatedAt(),
                "CHAT_MESSAGE"
        );
    }

    @Transactional(readOnly = true)
    public List<ChatMessageDTO> getChatHistory(Long matchId) {
        List<ChatMessage> messages = chatMessageRepo.findByMatch_IdOrderByCreatedAtAsc(matchId);
        return messages.stream()
                .map(m -> new ChatMessageDTO(
                        m.getId(),
                        m.getMatch().getId(),
                        m.getSender().getUsername(),
                        m.getMessage(),
                        m.getCreatedAt(),
                        "CHAT_MESSAGE"
                ))
                .collect(Collectors.toList());
    }
}
