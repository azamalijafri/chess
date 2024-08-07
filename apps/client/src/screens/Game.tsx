import { ChessBoard } from "../components/chessboard";
import {
  GAME_OVER,
  INIT_GAME,
  MOVE,
  OPPONENT_ID,
  SEED_MOVES,
  TIMER_UPDATE,
} from "../constants/messages";
import { useEffect, useMemo, useState } from "react";
import { Chess } from "chess.js";
import { useNavigate, useParams } from "react-router-dom";
import { useSocket } from "@/context/socketContext";
import { useModal } from "@/store";
import { MoveRight } from "lucide-react";
import { useAuth } from "@/context/authContext";
import axios from "axios";
import { User } from "@prisma/client";

export const Game = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const socket = useSocket();
  const { user } = useAuth();
  const chess = useMemo(() => new Chess(), []);
  const [board, setBoard] = useState(chess.board());
  const [opponent, setOpponent] = useState<User | null>(null);
  const [opponentLoading, setOpponentLoading] = useState(true);
  const [moves, setMoves] = useState<
    { from: string; to: string; player: "b" | "w" }[]
  >([]);
  const [playerColor, setPlayerColor] = useState<"black" | "white" | null>(
    null
  );
  const [whiteTimer, setWhiteTimer] = useState<number>(600);
  const [blackTimer, setBlackTimer] = useState<number>(600);

  const moveSound = useMemo(() => new Audio("/sounds/move.mp3"), []);

  const { openModal } = useModal();

  const fetchOpponentDetails = async (id: string) => {
    try {
      const res = await axios.get(`/api/user/info/${id}`);
      setOpponent(res.data.user);
      setOpponentLoading(false);
    } catch (error) {
      console.log(error);
      return alert("something went wrong");
    }
  };

  useEffect(() => {
    if (!socket) {
      console.log("Socket is not connected yet");
      return;
    }

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type != TIMER_UPDATE)
        console.log("Received message:", message);

      switch (message.type) {
        case SEED_MOVES: {
          const moves = message?.payload?.moves;

          if (moves) {
            for (const move of moves) {
              chess.move({ from: move.from, to: move.to });
            }
            setBoard(chess.board());
            setMoves(moves.reverse());
          }

          break;
        }
        case MOVE: {
          const move = message.payload.move;
          console.log("Received move:", move);
          chess.move({ from: move.from, to: move.to });
          setBoard(chess.board());
          moveSound.play();
          setMoves((prev) => [move, ...prev]);
          break;
        }
        case TIMER_UPDATE: {
          const { whiteTimer, blackTimer } = message.payload;
          setWhiteTimer(whiteTimer);
          setBlackTimer(blackTimer);
          break;
        }
        case GAME_OVER: {
          const winner: "black" | "white" = message.payload.winner;
          openModal("game-over", { winningPlayer: winner });
          console.log("Game over message received");
          break;
        }
        case OPPONENT_ID: {
          const id = message.payload.opponentId;
          fetchOpponentDetails(id);
          break;
        }
        default: {
          console.log("Unknown message type:", message.type);
        }
      }
    };

    return () => {
      socket.onmessage = null;
    };
  }, [socket, chess, moveSound, openModal]);

  useEffect(() => {
    const color = localStorage.getItem("color");
    if (!color || (color !== "black" && color !== "white")) {
      navigate("/", { replace: true });
    } else {
      setPlayerColor(color);
    }

    if (user?.id)
      socket?.send(
        JSON.stringify({ type: INIT_GAME, payload: { playerId: user?.id } })
      );

    socket?.send(JSON.stringify({ type: SEED_MOVES, payload: { gameId } }));

    socket?.send(
      JSON.stringify({
        type: OPPONENT_ID,
        payload: { gameId: gameId, playerId: user?.id },
      })
    );
  }, [gameId, navigate, socket, user?.id]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="grid grid-cols-4 w-full lg:w-4/5 mx-auto gap-y-10 lg:gap-y-0 items-center">
      <div className="relative w-full col-span-3 lg:col-span-2 justify-center flex flex-col gap-4">
        <div className="flex gap-4 items-center">
          <img
            src={opponent?.displayPicture as string}
            alt="opponent-image"
            className="size-8 object-cover"
          />
          <span className="text-sm text-white">
            {opponentLoading ? "Loading" : opponent?.name}
          </span>
          <span className="text-white font-bold">
            {playerColor == "white"
              ? formatTime(blackTimer)
              : formatTime(whiteTimer)}
          </span>
        </div>
        <div
          className={`${playerColor === "black" && "rotate-180 self-start"}`}
        >
          <ChessBoard
            board={board}
            socket={socket}
            playerColor={playerColor}
            chess={chess}
          />
        </div>
        <div className="flex gap-4 items-center">
          <img
            src={user?.displayPicture as string}
            alt="user-image"
            className="size-8 object-cover"
          />
          <span className="text-sm text-white"> {user?.name}</span>
          <span className="text-white font-bold">
            {playerColor === "white"
              ? formatTime(whiteTimer)
              : formatTime(blackTimer)}
          </span>
        </div>
      </div>
      <div className="col-span-3 lg:col-span-2 h-full max-h-[calc(100vh-15rem)] bg-[#28282B]">
        <div className="flex flex-col gap-3 px-44 mx-auto p-4 max-h-[calc(100vh-15rem)] overflow-y-auto">
          {moves.map((move, index) => (
            <div
              key={index}
              className={`flex items-center font-bold justify-between ${move.player == "w" ? "text-white" : "text-[#739552]"}`}
            >
              <span>{move.from}</span>
              <MoveRight />
              <span>{move.to}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
