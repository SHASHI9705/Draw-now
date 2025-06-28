import { useEffect, useRef, useState } from "react";
import { IconButton } from "./IconButton";
import { Circle, Pencil, RectangleHorizontalIcon, Eraser, Diamond, Type, ArrowRight } from "lucide-react";
import { Game } from "@/draw/Game";

export type Tool = "circle" | "rect" | "pencil" | "eraser" | "diamond" | "text" | "arrow";

export function Canvas({
    roomId,
    socket
}: {
    socket: WebSocket;
    roomId: string;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const [game, setGame] = useState<Game>();
    const [selectedTool, setSelectedTool] = useState<Tool>("circle")
    const [textInput, setTextInput] = useState<{ x: number, y: number, value: string } | null>(null);

    useEffect(() => {
        game?.setTool(selectedTool);
    }, [selectedTool, game]);

    useEffect(() => {
        if (canvasRef.current) {
            const g = new Game(canvasRef.current, roomId, socket);
            setGame(g);

            // Patch Game to allow text input
            g.onTextToolClick = (x: number, y: number) => {
                setTextInput({ x, y, value: "" });
            };

            return () => {
                g.destroy();
            }
        }
    }, [canvasRef]);

    useEffect(() => {
        if (textInput && textAreaRef.current) {
            textAreaRef.current.focus();
        }
    }, [textInput]);

    // Auto-size textarea to content
    useEffect(() => {
        if (textAreaRef.current) {
            textAreaRef.current.style.height = 'auto';
            textAreaRef.current.style.height = textAreaRef.current.scrollHeight + 'px';
        }
    }, [textInput?.value]);

    // Handle placing text on Enter or blur
    const handleTextInputDone = () => {
        if (textInput && textInput.value.trim() && game) {
            game.addTextShape(textInput.x, textInput.y, textInput.value.trim());
        }
        setTextInput(null);
    };

    return <div style={{
        height: "100vh",
        overflow: "hidden",
        position: "relative",
        cursor: selectedTool === "text" && !textInput ? "text" : undefined
    }}>
        <canvas ref={canvasRef} width={window.innerWidth} height={window.innerHeight}
            style={{
                display: "block",
                position: "relative",
                left: 0,
                top: 0,
                zIndex: 1,
                pointerEvents: textInput ? "none" : "auto",
                cursor: selectedTool === "text" && !textInput ? "text" : undefined
            }}
            onMouseDown={e => {
                if (selectedTool === "text" && game && !textInput) {
                    const rect = canvasRef.current!.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    setTextInput({ x, y, value: "" });
                }
            }}
        ></canvas>
        {textInput && (
            <textarea
                ref={textAreaRef}
                autoFocus
                rows={1}
                style={{
                    position: "absolute",
                    left: textInput.x,
                    top: textInput.y - 4, // offset for baseline alignment
                    fontSize: 20,
                    color: "white",
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    zIndex: 10,
                    padding: 0,
                    minWidth: 40,
                    minHeight: 24,
                    resize: "none",
                    fontFamily: 'Arial', // match canvas font
                    lineHeight: 1.2,
                    caretColor: "white", // ensure caret is visible
                }}
                value={textInput.value}
                onChange={e => setTextInput({ ...textInput, value: e.target.value })}
                onBlur={handleTextInputDone}
                onKeyDown={e => {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        handleTextInputDone();
                    }
                }}
            />
        )}
        <Topbar setSelectedTool={setSelectedTool} selectedTool={selectedTool} />
    </div>
}

function Topbar({selectedTool, setSelectedTool}: {
    selectedTool: Tool,
    setSelectedTool: (s: Tool) => void
}) {
    return <div style={{
            position: "fixed",
            top: 10,
            left: 10,
            zIndex: 10
        }}>
            <div className="flex gap-t">
                <IconButton 
                    onClick={() => {
                        setSelectedTool("pencil")
                    }}
                    activated={selectedTool === "pencil"}
                    icon={<Pencil />}
                />
                <IconButton onClick={() => {
                    setSelectedTool("rect")
                }} activated={selectedTool === "rect"} icon={<RectangleHorizontalIcon />} ></IconButton>
                <IconButton onClick={() => {
                    setSelectedTool("circle")
                }} activated={selectedTool === "circle"} icon={<Circle />}></IconButton>
                <IconButton onClick={() => {
                    setSelectedTool("diamond")
                }} activated={selectedTool === "diamond"} icon={<Diamond />} />
                <IconButton onClick={() => {
                    setSelectedTool("text")
                }} activated={selectedTool === "text"} icon={<Type />} />
                <IconButton onClick={() => {
                    setSelectedTool("arrow")
                }} activated={selectedTool === "arrow"} icon={<ArrowRight />} />
                <IconButton onClick={() => {
                    setSelectedTool("eraser")
                }} activated={selectedTool === "eraser"} icon={<Eraser />} />
            </div>
        </div>
}