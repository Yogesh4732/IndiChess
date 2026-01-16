package com.example.IndiChessBackend.model.DTO;

import com.example.IndiChessBackend.model.PieceColor;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MoveHistoryDTO {
    private int ply;
    private int moveNumber;
    private PieceColor color;
    private String san;
    private String fenBefore;
    private String fenAfter;
    private LocalDateTime createdAt;
}
