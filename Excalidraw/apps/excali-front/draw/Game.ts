import { Tool } from "@/components/Canvas";
import { getExistingShapes } from "./http";
import { v4 as uuidv4 } from 'uuid';

type Shape = ({
    id: string;
} & (
    {
        type: "rect";
        x: number;
        y: number;
        width: number;
        height: number;
    } | {
        type: "circle";
        centerX: number;
        centerY: number;
        radius: number;
    } | {
        type: "pencil";
        points: { x: number; y: number }[];
    } | {
        type: "diamond";
        x: number;
        y: number;
        width: number;
        height: number;
    } | {
        type: "text";
        x: number;
        y: number;
        text: string;
    } | {
        type: "arrow";
        x1: number;
        y1: number;
        x2: number;
        y2: number;
    }
));

export class Game {

    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private existingShapes: Shape[]
    private roomId: string;
    private clicked: boolean;
    private startX = 0;
    private startY = 0;
    private selectedTool: Tool = "rect";

    private pencilPoints: { x: number; y: number }[] = [];

    socket: WebSocket;

    constructor(canvas: HTMLCanvasElement, roomId: string, socket: WebSocket) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d")!;
        this.existingShapes = [];
        this.roomId = roomId;
        this.socket = socket;
        this.clicked = false;
        this.init();
        this.initHandlers();
        this.initMouseHandlers();
    }
    
    destroy() {
        this.canvas.removeEventListener("mousedown", this.mouseDownHandler)

        this.canvas.removeEventListener("mouseup", this.mouseUpHandler)

        this.canvas.removeEventListener("mousemove", this.mouseMoveHandler)
    }

    setTool(tool: "circle" | "pencil" | "rect" | "eraser" | "diamond" | "text" | "arrow") {
        this.selectedTool = tool;
    }

    async init() {
        // Only load shapes that exist in the database (not erased)
        const allShapes = await getExistingShapes(this.roomId);
        this.existingShapes = allShapes;
        this.clearCanvas();
    }

    initHandlers() {
        this.socket.onmessage = (event) => {
            const message = JSON.parse(event.data);

            if (message.type == "chat") {
                const parsedShape = JSON.parse(message.message)
                this.existingShapes.push(parsedShape.shape)
                this.clearCanvas();
            } else if (message.type === "delete") {
                // Remove shape by id
                this.existingShapes = this.existingShapes.filter(s => s.id !== message.id);
                this.clearCanvas();
            }
        }
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = "rgba(0, 0, 0)"
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.existingShapes.map((shape) => {
            if (shape.type === "rect") {
                this.ctx.strokeStyle = "rgba(255, 255, 255)"
                this.ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
            } else if (shape.type === "circle") {
                this.ctx.beginPath();
                this.ctx.arc(shape.centerX, shape.centerY, Math.abs(shape.radius), 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.closePath();                
            } else if (shape.type === "pencil") {
                this.ctx.beginPath();
                for (let i = 0; i < shape.points.length - 1; i++) {
                    const p1 = shape.points[i];
                    const p2 = shape.points[i + 1];
                    this.ctx.moveTo(p1.x, p1.y);
                    this.ctx.lineTo(p2.x, p2.y);
                }
                this.ctx.stroke();
                this.ctx.closePath();
            } else if (shape.type === "diamond") {
                this.ctx.beginPath();
                const halfWidth = shape.width / 2;
                const halfHeight = shape.height / 2;
                this.ctx.moveTo(shape.x + halfWidth, shape.y);
                this.ctx.lineTo(shape.x + shape.width, shape.y + halfHeight);
                this.ctx.lineTo(shape.x + halfWidth, shape.y + shape.height);
                this.ctx.lineTo(shape.x, shape.y + halfHeight);
                this.ctx.closePath();
                this.ctx.stroke();
            } else if (shape.type === "text") {
                this.ctx.fillStyle = "rgba(255, 255, 255)";
                this.ctx.font = "20px Arial";
                this.ctx.fillText(shape.text, shape.x, shape.y + 20); // +20 for baseline alignment
            } else if (shape.type === "arrow") {
                this.drawArrow(shape.x1, shape.y1, shape.x2, shape.y2);
            }
        })
    }

    drawArrow(x1: number, y1: number, x2: number, y2: number) {
        const ctx = this.ctx;
        ctx.save();
        ctx.strokeStyle = "white";
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        // Arrowhead
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const headlen = 16;
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - headlen * Math.cos(angle - Math.PI / 7), y2 - headlen * Math.sin(angle - Math.PI / 7));
        ctx.lineTo(x2 - headlen * Math.cos(angle + Math.PI / 7), y2 - headlen * Math.sin(angle + Math.PI / 7));
        ctx.lineTo(x2, y2);
        ctx.lineTo(x2 - headlen * Math.cos(angle - Math.PI / 7), y2 - headlen * Math.sin(angle - Math.PI / 7));
        ctx.fill();
        ctx.restore();
    }

    mouseDownHandler = (e: MouseEvent) => {
        this.clicked = true
        this.startX = e.clientX
        this.startY = e.clientY
        if (this.selectedTool === "pencil") {
            this.pencilPoints = [{ x: e.clientX, y: e.clientY }];
        } else if (this.selectedTool === "eraser") {
            this.eraseShapeAt(e.clientX, e.clientY);
        } else if (this.selectedTool === "text") {
            // Do nothing here; Canvas handles text input overlay
            return;
        }
    }
    // Allow Canvas to call this for inline text
    onTextToolClick: (x: number, y: number) => void = () => {};

    addTextShape(x: number, y: number, text: string) {
        const shape: Shape = {
            id: uuidv4(),
            type: "text",
            x,
            y,
            text
        };
        this.existingShapes.push(shape);
        this.socket.send(JSON.stringify({
            type: "chat",
            message: JSON.stringify({ shape }),
            roomId: this.roomId
        }));
        this.clearCanvas();
    }

    mouseUpHandler = (e: MouseEvent) => {
        this.clicked = false
        const width = e.clientX - this.startX;
        const height = e.clientY - this.startY;

        const selectedTool = this.selectedTool;
        let shape: Shape | null = null;
        if (selectedTool === "rect") {
            shape = {
                id: uuidv4(),
                type: "rect",
                x: this.startX,
                y: this.startY,
                height,
                width
            }
        } else if (selectedTool === "circle") {
            const radius = Math.max(width, height) / 2;
            shape = {
                id: uuidv4(),
                type: "circle",
                radius: radius,
                centerX: this.startX + radius,
                centerY: this.startY + radius,
            }
        } else if (selectedTool === "pencil") {
            if (this.pencilPoints.length > 1) {
                shape = {
                    id: uuidv4(),
                    type: "pencil",
                    points: [...this.pencilPoints]
                }
            }
            this.pencilPoints = [];
        } else if (selectedTool === "diamond") {
            shape = {
                id: uuidv4(),
                type: "diamond",
                x: this.startX,
                y: this.startY,
                width: Math.abs(width),
                height: Math.abs(height),
            }
        } else if (selectedTool === "text") {
            // Do nothing here; Canvas handles text input overlay
            return;
        } else if (selectedTool === "arrow") {
            shape = {
                id: uuidv4(),
                type: "arrow",
                x1: this.startX,
                y1: this.startY,
                x2: e.clientX,
                y2: e.clientY,
            }
        }
        // Don't add shape for eraser
        if (!shape) {
            return;
        }
        this.existingShapes.push(shape);
        this.socket.send(JSON.stringify({
            type: "chat",
            message: JSON.stringify({
                shape
            }),
            roomId: this.roomId
        }))
    }
    mouseMoveHandler = (e: MouseEvent) => {
        if (this.clicked) {
            const width = e.clientX - this.startX;
            const height = e.clientY - this.startY;
            this.clearCanvas();
            this.ctx.strokeStyle = "rgba(255, 255, 255)"
            const selectedTool = this.selectedTool;
            if (selectedTool === "rect") {
                this.ctx.strokeRect(this.startX, this.startY, width, height);   
            } else if (selectedTool === "circle") {
                const radius = Math.max(width, height) / 2;
                const centerX = this.startX + radius;
                const centerY = this.startY + radius;
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, Math.abs(radius), 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.closePath();                
            } else if (selectedTool === "pencil") {
                this.pencilPoints.push({ x: e.clientX, y: e.clientY });
                this.ctx.beginPath();
                for (let i = 0; i < this.pencilPoints.length - 1; i++) {
                    const p1 = this.pencilPoints[i];
                    const p2 = this.pencilPoints[i + 1];
                    this.ctx.moveTo(p1.x, p1.y);
                    this.ctx.lineTo(p2.x, p2.y);
                }
                this.ctx.stroke();
                this.ctx.closePath();
            } else if (selectedTool === "eraser") {
                this.eraseShapeAt(e.clientX, e.clientY);
            } else if (selectedTool === "diamond") {
                this.ctx.beginPath();
                const halfWidth = Math.abs(width) / 2;
                const halfHeight = Math.abs(height) / 2;
                const x = this.startX;
                const y = this.startY;
                this.ctx.moveTo(x + halfWidth, y);
                this.ctx.lineTo(x + Math.abs(width), y + halfHeight);
                this.ctx.lineTo(x + halfWidth, y + Math.abs(height));
                this.ctx.lineTo(x, y + halfHeight);
                this.ctx.closePath();
                this.ctx.stroke();
            } else if (selectedTool === "text") {
                this.ctx.fillStyle = "rgba(255, 255, 255)";
                this.ctx.font = "20px Arial";
                this.ctx.fillText("Sample Text", this.startX, this.startY);
            } else if (selectedTool === "arrow") {
                this.drawArrow(this.startX, this.startY, e.clientX, e.clientY);
            }
        }
    }

    eraseShapeAt(x: number, y: number) {
        // Remove the first shape under the cursor (rect, circle, pencil, diamond, text, arrow)
        for (let i = this.existingShapes.length - 1; i >= 0; i--) {
            const shape = this.existingShapes[i];
            let erased = false;
            if (shape.type === "rect") {
                if (
                    x >= shape.x &&
                    x <= shape.x + shape.width &&
                    y >= shape.y &&
                    y <= shape.y + shape.height
                ) {
                    erased = true;
                }
            } else if (shape.type === "circle") {
                const dx = x - shape.centerX;
                const dy = y - shape.centerY;
                if (Math.sqrt(dx * dx + dy * dy) <= Math.abs(shape.radius)) {
                    erased = true;
                }
            } else if (shape.type === "pencil") {
                for (let j = 0; j < shape.points.length; j++) {
                    const p = shape.points[j];
                    if (Math.abs(x - p.x) < 8 && Math.abs(y - p.y) < 8) { // 8px tolerance
                        erased = true;
                        break;
                    }
                }
            } else if (shape.type === "diamond") {
                // Diamond is a rotated square, so use bounding box for simplicity
                if (
                    x >= shape.x &&
                    x <= shape.x + shape.width &&
                    y >= shape.y &&
                    y <= shape.y + shape.height
                ) {
                    erased = true;
                }
            } else if (shape.type === "text") {
                // Assume text is 40px wide, 24px tall (match minWidth/minHeight in Canvas.tsx)
                if (
                    x >= shape.x &&
                    x <= shape.x + 40 &&
                    y >= shape.y &&
                    y <= shape.y + 24
                ) {
                    erased = true;
                }
            } else if (shape.type === "arrow") {
                // Erase if close to the arrow line
                const dist = pointToSegmentDistance(x, y, shape.x1, shape.y1, shape.x2, shape.y2);
                if (dist < 8) {
                    erased = true;
                }
            }
            if (erased) {
                const deletedId = shape.id;
                this.existingShapes.splice(i, 1);
                this.clearCanvas();
                // Send delete message to server/other clients
                this.socket.send(JSON.stringify({
                    type: "delete",
                    id: deletedId,
                    roomId: this.roomId
                }));
                break;
            }
        }
    }
    initMouseHandlers() {
        this.canvas.addEventListener("mousedown", this.mouseDownHandler)

        this.canvas.addEventListener("mouseup", this.mouseUpHandler)

        this.canvas.addEventListener("mousemove", this.mouseMoveHandler)    

    }
}

// Helper for arrow erasing
function pointToSegmentDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = -1;
    if (len_sq !== 0) param = dot / len_sq;
    let xx, yy;
    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }
    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
}