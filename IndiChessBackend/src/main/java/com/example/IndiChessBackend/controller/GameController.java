package com.example.IndiChessBackend.controller;
import com.example.IndiChessBackend.model.DTO.*;
import com.example.IndiChessBackend.service.GameService;
import com.example.IndiChessBackend.service.ChatService;
import lombok.RequiredArgsConstructor;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.web.bind.annotation.*;
import java.util.ArrayList;

import java.security.Principal;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/games")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000", allowCredentials = "true")
public class GameController {

    private final GameService gameService;
    private final ChatService chatService;

    // REST endpoint to get game details
    @GetMapping("/{matchId}")
    public ResponseEntity<GameDTO> getGame(@PathVariable Long matchId,
                                           @CookieValue(value = "JWT", required = false) String token,
                                           HttpServletRequest request) {
        try {
            GameDTO game = gameService.getGameDetails(matchId, request); // Pass the real request!
            return ResponseEntity.ok(game);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    // WebSocket endpoint for making moves
    @MessageMapping("/game/{matchId}/move")
    @SendTo("/topic/moves/{matchId}")
    public MoveDTO handleMove(@DestinationVariable Long matchId,
                              @Payload MoveRequest moveRequest,
                              Principal principal) {
        try {
            System.out.println("Received move for game " + matchId + " from " + principal.getName());
            return gameService.processMove(matchId, moveRequest, principal);
        } catch (Exception e) {
            System.err.println("Error processing move: " + e.getMessage());
            MoveDTO errorMove = new MoveDTO();
            errorMove.setMatchId(matchId);
            errorMove.setMoveNotation("ERROR: " + e.getMessage());
            return errorMove;
        }
    }

    // WebSocket endpoint for player joining
    @MessageMapping("/game/{matchId}/join")
    @SendTo("/topic/game/{matchId}")
    public GameStatusDTO handlePlayerJoin(@DestinationVariable Long matchId,
                                          @Payload JoinRequest joinRequest,
                                          Principal principal) {
        try {
            System.out.println("Player " + principal.getName() + " joining game " + matchId);
            return gameService.handlePlayerJoin(matchId, joinRequest, principal);
        } catch (Exception e) {
            System.err.println("Error handling player join: " + e.getMessage());
            GameStatusDTO errorStatus = new GameStatusDTO();
            errorStatus.setMatchId(matchId);
            errorStatus.setStatus("ERROR: " + e.getMessage());
            return errorStatus;
        }
    }

    // WebSocket endpoint for resigning
    @MessageMapping("/game/{matchId}/resign")
    @SendTo("/topic/game-state/{matchId}")
    public Map<String, Object> handleResign(@DestinationVariable Long matchId,
                                            Principal principal) {
        try {
            System.out.println("Player " + principal.getName() + " resigning from game " + matchId);
            gameService.handleResignation(matchId, principal.getName());

            Map<String, Object> response = new HashMap<>();
            response.put("type", "RESIGNATION");
            response.put("player", principal.getName());
            response.put("matchId", matchId);
            response.put("timestamp", System.currentTimeMillis());
            response.put("status", "GAME_OVER");
            response.put("result", principal.getName() + " resigned");
            return response;
        } catch (Exception e) {
            System.err.println("Error handling resignation: " + e.getMessage());
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            return error;
        }
    }

    // WebSocket endpoint for draw offer
    @MessageMapping("/game/{matchId}/draw")
    @SendToUser("/queue/draw-offers")
    public Map<String, Object> handleDrawOffer(@DestinationVariable Long matchId,
                                               Principal principal) {
        try {
            System.out.println("Player " + principal.getName() + " offering draw in game " + matchId);
            gameService.handleDrawOffer(matchId, principal.getName());

            Map<String, Object> response = new HashMap<>();
            response.put("type", "DRAW_OFFER_SENT");
            response.put("matchId", matchId);
            response.put("timestamp", System.currentTimeMillis());
            return response;
        } catch (Exception e) {
            System.err.println("Error handling draw offer: " + e.getMessage());
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            return error;
        }
    }

    // WebSocket endpoint for accepting draw
    @MessageMapping("/game/{matchId}/draw/accept")
    @SendTo("/topic/game-state/{matchId}")
    public Map<String, Object> handleDrawAccept(@DestinationVariable Long matchId,
                                                Principal principal) {
        try {
            System.out.println("Player " + principal.getName() + " accepting draw in game " + matchId);
            gameService.markDraw(matchId);

            Map<String, Object> response = new HashMap<>();
            response.put("type", "DRAW_ACCEPTED");
            response.put("player", principal.getName());
            response.put("matchId", matchId);
            response.put("timestamp", System.currentTimeMillis());
            response.put("status", "GAME_OVER");
            response.put("result", "Draw agreed");
            return response;
        } catch (Exception e) {
            System.err.println("Error handling draw accept: " + e.getMessage());
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            return error;
        }
    }

    // WebSocket endpoint for chat messages (now persisted)
    @MessageMapping("/game/{matchId}/chat")
    @SendTo("/topic/chat/{matchId}")
    public ChatMessageDTO handleChatMessage(@DestinationVariable Long matchId,
                                            @Payload Map<String, String> chatMessage,
                                            Principal principal) {
        try {
            System.out.println("Chat message from " + principal.getName() + " in game " + matchId);
            String messageText = chatMessage.get("message");
            return chatService.saveChatMessage(matchId, principal.getName(), messageText);
        } catch (Exception e) {
            System.err.println("Error handling chat message: " + e.getMessage());
            // For WebSocket errors, you can either throw or return a DTO with error info.
            ChatMessageDTO errorDto = new ChatMessageDTO();
            errorDto.setType("CHAT_ERROR");
            errorDto.setMessage("Error: " + e.getMessage());
            return errorDto;
        }
    }

    // REST endpoint to fetch chat history for a match
    @GetMapping("/{matchId}/chat")
    public ResponseEntity<java.util.List<ChatMessageDTO>> getChatHistory(@PathVariable Long matchId) {
        try {
            java.util.List<ChatMessageDTO> history = chatService.getChatHistory(matchId);
            return ResponseEntity.ok(history);
        } catch (Exception e) {
            System.err.println("Error fetching chat history: " + e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    // REST endpoint to check game status
    @GetMapping("/{matchId}/status")
    public ResponseEntity<Map<String, Object>> getGameStatus(@PathVariable Long matchId) {
        try {
            Map<String, Object> status = new HashMap<>();
            status.put("matchId", matchId);
            status.put("isActive", true);
            status.put("timestamp", System.currentTimeMillis());
            return ResponseEntity.ok(status);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    // REST endpoint to get move history
    @GetMapping("/{matchId}/moves")
    public ResponseEntity<java.util.List<MoveHistoryDTO>> getMoveHistory(@PathVariable Long matchId) {
        try {
            java.util.List<MoveHistoryDTO> history = gameService.getMoveHistory(matchId);
            return ResponseEntity.ok(history);
        } catch (Exception e) {
            System.err.println("Error fetching move history: " + e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }
}
