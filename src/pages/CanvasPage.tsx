import { useState, useRef, useEffect, useCallback } from 'react';
import { LayoutGrid, Image as ImageIcon, Type, Video, Trash2, Download, Plus, Move, Layers, Undo, Redo, Grid3X3, ZoomIn, ZoomOut } from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { CanvasElement } from '@/types';

interface Tool {
  id: string;
  icon: typeof Move;
  label: string;
}

const tools: Tool[] = [
  { id: 'select', icon: Move, label: '选择' },
  { id: 'image', icon: ImageIcon, label: '图片' },
  { id: 'text', icon: Type, label: '文字' },
  { id: 'video', icon: Video, label: '视频' },
];

const sampleImages = [
  'https://neeko-copilot.bytedance.net/api/text2image?prompt=abstract%20art%20colorful&image_size=square',
  'https://neeko-copilot.bytedance.net/api/text2image?prompt=landscape%20mountains&image_size=square',
  'https://neeko-copilot.bytedance.net/api/text2image?prompt=city%20night&image_size=square',
  'https://neeko-copilot.bytedance.net/api/text2image?prompt=nature%20forest&image_size=square',
];

export default function CanvasPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const [tool, setTool] = useState('select');
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, clientX: 0, clientY: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [textInput, setTextInput] = useState('');
  const [history, setHistory] = useState<CanvasElement[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const { canvasElements, addCanvasElement, updateCanvasElement, deleteCanvasElement, setCanvasElements } = useStore();

  const selectedElement = canvasElements.find((el) => el.id === selectedElementId);

  const saveToHistory = useCallback(() => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...canvasElements]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [canvasElements, history, historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setCanvasElements([...history[newIndex]]);
    }
  }, [history, historyIndex, setCanvasElements]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setCanvasElements([...history[newIndex]]);
    }
  }, [history, historyIndex, setCanvasElements]);

  useEffect(() => {
    const imageUrls = canvasElements
      .filter((el) => el.type === 'image')
      .map((el) => el.content);

    imageUrls.forEach((url) => {
      if (!imageCacheRef.current.has(url)) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = url;
        img.onload = () => {
          imageCacheRef.current.set(url, img);
        };
        img.onerror = () => {
          console.error(`Failed to load image: ${url}`);
        };
        imageCacheRef.current.set(url, img);
      }
    });
  }, [canvasElements]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const gridSize = 20 * scale;
    ctx.strokeStyle = 'rgba(124, 58, 237, 0.1)';
    ctx.lineWidth = 1;

    const startX = -panOffset.x % gridSize;
    const startY = -panOffset.y % gridSize;

    for (let x = startX; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    for (let y = startY; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    canvasElements.forEach((element) => {
      ctx.save();
      ctx.translate(element.x * scale + panOffset.x, element.y * scale + panOffset.y);
      ctx.rotate((element.rotation * Math.PI) / 180);
      ctx.globalAlpha = element.opacity;

      if (element.type === 'image') {
        const img = imageCacheRef.current.get(element.content);
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, -element.width / 2 * scale, -element.height / 2 * scale, element.width * scale, element.height * scale);
        }
      } else if (element.type === 'text') {
        ctx.fillStyle = '#f8fafc';
        ctx.font = '24px "DM Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(element.content, 0, 0);
      }

      ctx.restore();
    });

    if (selectedElementId) {
      const element = canvasElements.find((el) => el.id === selectedElementId);
      if (element) {
        drawSelection(ctx, element);
      }
    }
  // drawSelection 是同文件内绘制辅助函数，加入依赖会导致画布重绘链路不必要变化。
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasElements, scale, panOffset, selectedElementId]);

  const drawSelection = (ctx: CanvasRenderingContext2D, element: CanvasElement) => {
    ctx.save();
    ctx.translate(element.x * scale + panOffset.x, element.y * scale + panOffset.y);
    ctx.rotate((element.rotation * Math.PI) / 180);
    
    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(
      -element.width / 2 * scale,
      -element.height / 2 * scale,
      element.width * scale,
      element.height * scale
    );

    const handleSize = 10;
    ctx.fillStyle = '#7c3aed';
    ctx.fillRect(
      -element.width / 2 * scale - handleSize / 2,
      -element.height / 2 * scale - handleSize / 2,
      handleSize,
      handleSize
    );
    ctx.fillRect(
      element.width / 2 * scale - handleSize / 2,
      -element.height / 2 * scale - handleSize / 2,
      handleSize,
      handleSize
    );
    ctx.fillRect(
      -element.width / 2 * scale - handleSize / 2,
      element.height / 2 * scale - handleSize / 2,
      handleSize,
      handleSize
    );
    ctx.fillRect(
      element.width / 2 * scale - handleSize / 2,
      element.height / 2 * scale - handleSize / 2,
      handleSize,
      handleSize
    );

    ctx.restore();
  };

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeCanvas = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      draw();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [draw]);

  const getCanvasCoords = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - panOffset.x) / scale,
      y: (e.clientY - rect.top - panOffset.y) / scale,
    };
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.button !== 0) return;

    const coords = getCanvasCoords(e);
    
    if (tool === 'select') {
      let found = false;
      for (let i = canvasElements.length - 1; i >= 0; i--) {
        const element = canvasElements[i];
        const halfWidth = element.width / 2;
        const halfHeight = element.height / 2;
        
        if (
          coords.x >= element.x - halfWidth &&
          coords.x <= element.x + halfWidth &&
          coords.y >= element.y - halfHeight &&
          coords.y <= element.y + halfHeight
        ) {
          setSelectedElementId(element.id);
          setDragStart({ x: e.clientX - element.x * scale - panOffset.x, y: e.clientY - element.y * scale - panOffset.y });
          setIsDragging(true);
          found = true;
          break;
        }
      }
      if (!found) {
        setSelectedElementId(null);
      }
    } else if (tool === 'image') {
      saveToHistory();
      const newElement: CanvasElement = {
        id: `elem-${Date.now()}`,
        type: 'image',
        x: coords.x,
        y: coords.y,
        width: 200,
        height: 200,
        rotation: 0,
        zIndex: canvasElements.length,
        content: sampleImages[Math.floor(Math.random() * sampleImages.length)],
        opacity: 1,
      };
      addCanvasElement(newElement);
      setSelectedElementId(newElement.id);
    } else if (tool === 'text') {
      saveToHistory();
      const newElement: CanvasElement = {
        id: `elem-${Date.now()}`,
        type: 'text',
        x: coords.x,
        y: coords.y,
        width: 150,
        height: 50,
        rotation: 0,
        zIndex: canvasElements.length,
        content: textInput || '双击编辑文字',
        opacity: 1,
      };
      addCanvasElement(newElement);
      setSelectedElementId(newElement.id);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPanOffset({
        x: panStart.x + (e.clientX - panStart.clientX),
        y: panStart.y + (e.clientY - panStart.clientY),
      });
    } else if (isDragging && selectedElementId) {
      const element = canvasElements.find((el) => el.id === selectedElementId);
      if (element) {
        const newX = (e.clientX - dragStart.x - panOffset.x) / scale;
        const newY = (e.clientY - dragStart.y - panOffset.y) / scale;
        updateCanvasElement(selectedElementId, { x: newX, y: newY });
      }
    }
  };

  const handleMouseUp = () => {
    if (isDragging && selectedElementId) {
      saveToHistory();
    }
    setIsDragging(false);
    setIsPanning(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      setIsPanning(true);
      setPanStart({ x: panOffset.x, y: panOffset.y, clientX: e.clientX, clientY: e.clientY });
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(3, scale * delta));
    setScale(newScale);
  };

  const handleDelete = () => {
    if (selectedElementId) {
      saveToHistory();
      deleteCanvasElement(selectedElementId);
      setSelectedElementId(null);
    }
  };

  const handleExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'canvas-export.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  const handleClear = () => {
    saveToHistory();
    setCanvasElements([]);
    setSelectedElementId(null);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTextInput(e.target.value);
  };

  return (
    <div className="min-h-screen flex">
      <div className="w-20 glassmorphism border-r border-primary-600/30 flex flex-col items-center py-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-600/20 to-accent-600/20 flex items-center justify-center mb-6">
          <LayoutGrid className="w-6 h-6 text-primary-400" />
        </div>
        
        <div className="flex-1 flex flex-col gap-2">
          {tools.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTool(t.id)}
                title={t.label}
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                  tool === t.id
                    ? 'bg-primary-600 text-white button-glow'
                    : 'text-dark-300 hover:bg-primary-600/20 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
              </button>
            );
          })}
        </div>

        <div className="border-t border-primary-600/30 mt-4 pt-4 flex flex-col gap-2">
          <button
            onClick={() => setScale(scale * 1.2)}
            title="放大"
            className="w-12 h-12 rounded-xl flex items-center justify-center text-dark-300 hover:bg-primary-600/20 hover:text-white transition-all"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <span className="text-xs text-dark-400 text-center">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale(scale * 0.8)}
            title="缩小"
            className="w-12 h-12 rounded-xl flex items-center justify-center text-dark-300 hover:bg-primary-600/20 hover:text-white transition-all"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="h-16 glassmorphism border-b border-primary-600/30 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-2 rounded-lg text-dark-300 hover:bg-primary-600/20 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title="撤销"
            >
              <Undo className="w-5 h-5" />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-2 rounded-lg text-dark-300 hover:bg-primary-600/20 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title="重做"
            >
              <Redo className="w-5 h-5" />
            </button>
            <button
              onClick={() => setPanOffset({ x: 0, y: 0 })}
              className="p-2 rounded-lg text-dark-300 hover:bg-primary-600/20 hover:text-white transition-all"
              title="重置视图"
            >
              <Grid3X3 className="w-5 h-5" />
            </button>

            <div className="w-px h-8 bg-primary-600/30 mx-4"></div>

            {tool === 'text' && (
              <input
                type="text"
                value={textInput}
                onChange={handleTextChange}
                placeholder="输入文字内容..."
                className="px-4 py-2 rounded-lg bg-dark-900/50 border border-primary-600/30 text-dark-100 placeholder-dark-400 focus:outline-none focus:border-primary-500"
              />
            )}
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleDelete}
              disabled={!selectedElementId}
              className="p-2 rounded-lg text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title="删除"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={handleClear}
              className="p-2 rounded-lg text-dark-300 hover:bg-primary-600/20 hover:text-white transition-all"
              title="清空画布"
            >
              <Plus className="w-5 h-5 rotate-45" />
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-500 transition-all flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              导出
            </button>
          </div>
        </div>

        <div className="flex-1 flex">
          <div
            ref={containerRef}
            className="flex-1 overflow-hidden relative"
          >
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onMouseDown={handleMouseDown}
              onWheel={handleWheel}
              className="cursor-crosshair"
            />
            
            {selectedElement && (
              <div className="absolute top-4 right-4 glassmorphism rounded-xl p-4 w-64">
                <h4 className="font-medium text-dark-200 mb-4 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary-400" />
                  属性面板
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-dark-400 mb-1">位置 X</label>
                    <input
                      type="number"
                      value={Math.round(selectedElement.x)}
                      onChange={(e) => {
                        saveToHistory();
                        updateCanvasElement(selectedElementId!, { x: Number(e.target.value) });
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-dark-900/50 border border-primary-600/30 text-dark-100 text-sm focus:outline-none focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-dark-400 mb-1">位置 Y</label>
                    <input
                      type="number"
                      value={Math.round(selectedElement.y)}
                      onChange={(e) => {
                        saveToHistory();
                        updateCanvasElement(selectedElementId!, { y: Number(e.target.value) });
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-dark-900/50 border border-primary-600/30 text-dark-100 text-sm focus:outline-none focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-dark-400 mb-1">宽度</label>
                    <input
                      type="number"
                      value={selectedElement.width}
                      onChange={(e) => {
                        saveToHistory();
                        updateCanvasElement(selectedElementId!, { width: Number(e.target.value) });
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-dark-900/50 border border-primary-600/30 text-dark-100 text-sm focus:outline-none focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-dark-400 mb-1">高度</label>
                    <input
                      type="number"
                      value={selectedElement.height}
                      onChange={(e) => {
                        saveToHistory();
                        updateCanvasElement(selectedElementId!, { height: Number(e.target.value) });
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-dark-900/50 border border-primary-600/30 text-dark-100 text-sm focus:outline-none focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-dark-400 mb-1">旋转: {selectedElement.rotation}°</label>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={selectedElement.rotation}
                      onChange={(e) => updateCanvasElement(selectedElementId!, { rotation: Number(e.target.value) })}
                      className="w-full h-2 bg-dark-700 rounded-full appearance-none cursor-pointer accent-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-dark-400 mb-1">透明度: {Math.round(selectedElement.opacity * 100)}%</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={selectedElement.opacity}
                      onChange={(e) => updateCanvasElement(selectedElementId!, { opacity: Number(e.target.value) })}
                      className="w-full h-2 bg-dark-700 rounded-full appearance-none cursor-pointer accent-primary-500"
                    />
                  </div>
                  {selectedElement.type === 'text' && (
                    <div>
                      <label className="block text-xs text-dark-400 mb-1">文字内容</label>
                      <input
                        type="text"
                        value={selectedElement.content}
                        onChange={(e) => updateCanvasElement(selectedElementId!, { content: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-dark-900/50 border border-primary-600/30 text-dark-100 text-sm focus:outline-none focus:border-primary-500"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="w-64 glassmorphism border-l border-primary-600/30 p-4 overflow-y-auto">
            <h4 className="font-medium text-dark-200 mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary-400" />
              图层管理
            </h4>
            
            {canvasElements.length > 0 ? (
              <div className="space-y-2">
                {[...canvasElements].reverse().map((element, index) => (
                  <div
                    key={element.id}
                    onClick={() => setSelectedElementId(element.id)}
                    className={`p-3 rounded-xl cursor-pointer transition-all duration-300 ${
                      selectedElementId === element.id
                        ? 'bg-primary-600/30 border border-primary-500/50'
                        : 'bg-dark-900/30 hover:bg-primary-600/20 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        element.type === 'image' ? 'bg-blue-500/20' : 'bg-green-500/20'
                      }`}>
                        {element.type === 'image' && <ImageIcon className="w-4 h-4 text-blue-400" />}
                        {element.type === 'text' && <Type className="w-4 h-4 text-green-400" />}
                        {element.type === 'video' && <Video className="w-4 h-4 text-red-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-dark-100 truncate">
                          {element.type === 'image' ? '图片' : element.type === 'text' ? '文字' : '视频'}
                        </p>
                        <p className="text-xs text-dark-400">图层 {canvasElements.length - index}</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          saveToHistory();
                          deleteCanvasElement(element.id);
                          if (selectedElementId === element.id) {
                            setSelectedElementId(null);
                          }
                        }}
                        className="text-dark-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <LayoutGrid className="w-12 h-12 text-dark-500 mx-auto mb-4" />
                <p className="text-dark-400 text-sm">画布为空</p>
                <p className="text-dark-500 text-xs mt-1">选择工具添加元素</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
