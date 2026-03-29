import { useRef, useEffect, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';

export type DrawTool = 'pen' | 'eraser' | 'line' | 'rectangle' | 'circle' | 'text';

interface DrawData {
  tool: DrawTool;
  color: string;
  lineWidth: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  text?: string;
}

export const useWhiteboard = (socket: Socket | null, roomId: string) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<DrawTool>('pen');
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(2);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const getContext = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext('2d');
  }, []);

  const drawOnCanvas = useCallback((drawData: DrawData) => {
    const ctx = getContext();
    if (!ctx) return;

    ctx.strokeStyle = drawData.color;
    ctx.lineWidth = drawData.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (drawData.tool) {
      case 'pen':
        ctx.beginPath();
        ctx.moveTo(drawData.startX, drawData.startY);
        ctx.lineTo(drawData.endX, drawData.endY);
        ctx.stroke();
        break;

      case 'eraser':
        ctx.clearRect(
          drawData.endX - drawData.lineWidth / 2,
          drawData.endY - drawData.lineWidth / 2,
          drawData.lineWidth,
          drawData.lineWidth
        );
        break;

      case 'line':
        ctx.beginPath();
        ctx.moveTo(drawData.startX, drawData.startY);
        ctx.lineTo(drawData.endX, drawData.endY);
        ctx.stroke();
        break;

      case 'rectangle':
        ctx.strokeRect(
          drawData.startX,
          drawData.startY,
          drawData.endX - drawData.startX,
          drawData.endY - drawData.startY
        );
        break;

      case 'circle':
        const radius = Math.sqrt(
          Math.pow(drawData.endX - drawData.startX, 2) +
          Math.pow(drawData.endY - drawData.startY, 2)
        );
        ctx.beginPath();
        ctx.arc(drawData.startX, drawData.startY, radius, 0, 2 * Math.PI);
        ctx.stroke();
        break;

      case 'text':
        if (drawData.text) {
          ctx.font = `${drawData.lineWidth * 10}px Arial`;
          ctx.fillStyle = drawData.color;
          ctx.fillText(drawData.text, drawData.startX, drawData.startY);
        }
        break;
    }
  }, [getContext]);

  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setStartPos({ x, y });
  }, []);

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const drawData: DrawData = {
      tool,
      color,
      lineWidth,
      startX: startPos.x,
      startY: startPos.y,
      endX: x,
      endY: y
    };

    if (tool === 'pen' || tool === 'eraser') {
      drawOnCanvas(drawData);
      setStartPos({ x, y });

      if (socket) {
        socket.emit('whiteboard-draw', { roomId, drawData });
      }
    }
  }, [isDrawing, tool, color, lineWidth, startPos, socket, roomId, drawOnCanvas]);

  const stopDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (tool !== 'pen' && tool !== 'eraser') {
      const drawData: DrawData = {
        tool,
        color,
        lineWidth,
        startX: startPos.x,
        startY: startPos.y,
        endX: x,
        endY: y
      };

      drawOnCanvas(drawData);

      if (socket) {
        socket.emit('whiteboard-draw', { roomId, drawData });
      }
    }

    setIsDrawing(false);
  }, [isDrawing, tool, color, lineWidth, startPos, socket, roomId, drawOnCanvas]);

  const clearCanvas = useCallback(() => {
    const ctx = getContext();
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (socket) {
      socket.emit('whiteboard-clear', { roomId });
    }
  }, [socket, roomId, getContext]);

  useEffect(() => {
    if (!socket) return;

    socket.on('whiteboard-update', (drawData: DrawData) => {
      drawOnCanvas(drawData);
    });

    socket.on('whiteboard-cleared', () => {
      const ctx = getContext();
      const canvas = canvasRef.current;
      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    });

    return () => {
      socket.off('whiteboard-update');
      socket.off('whiteboard-cleared');
    };
  }, [socket, drawOnCanvas, getContext]);

  return {
    canvasRef,
    tool,
    setTool,
    color,
    setColor,
    lineWidth,
    setLineWidth,
    startDrawing,
    draw,
    stopDrawing,
    clearCanvas
  };
};
