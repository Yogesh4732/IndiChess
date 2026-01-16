package com.example.IndiChessBackend.model.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageDTO {
    private Long id;
    private Long matchId;
    private String from;
    private String message;
    private LocalDateTime timestamp;
    private String type = "CHAT_MESSAGE";
}
