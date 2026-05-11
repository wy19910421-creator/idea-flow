import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Sparkles, Download, Trash2, History, X, Loader2, Maximize, MousePointer2, Zap, Quote, Copy, Check, AlertCircle, BookOpen, Target, FlipHorizontal, ArrowDownToLine, ArrowRightToLine, Focus, Info, Image as ImageIcon } from 'lucide-react';

// ==========================================
// 🌌 二进制树画布动画组件
// ==========================================
const BinaryTreeCanvas = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let points = [];
    let growth = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initTree();
    };

    const buildTree = (x, y, len, angle, depth, arr, rootX, rootY) => {
      if (depth === 0) return;
      const endX = x + len * Math.cos(angle);
      const endY = y + len * Math.sin(angle);
      
      const steps = Math.floor(len / 16); 
      for(let i=0; i<=steps; i++){
        const px = x + (endX - x) * (i/steps);
        const py = y + (endY - y) * (i/steps);
        const distance = Math.sqrt(Math.pow(px - rootX, 2) + Math.pow(py - rootY, 2));
        
        arr.push({
          x: px,
          y: py,
          char: Math.random() > 0.5 ? '1' : '0',
          baseAlpha: 0.2 + (depth / 10) * 0.8,
          distance: distance
        });
      }
      
      buildTree(endX, endY, len * 0.78, angle - 0.4 + (Math.random()*0.15-0.075), depth - 1, arr, rootX, rootY);
      buildTree(endX, endY, len * 0.78, angle + 0.4 + (Math.random()*0.15-0.075), depth - 1, arr, rootX, rootY);
    };

    const initTree = () => {
      points = [];
      growth = 0;
      const rootX = canvas.width / 2;
      const rootY = canvas.height;
      buildTree(rootX, rootY, Math.min(canvas.width, canvas.height) / 4.5, -Math.PI / 2, 8, points, rootX, rootY);
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#34d399';

      growth += 8;

      for(let i=0; i<points.length; i++) {
        const p = points[i];
        if (p.distance < growth) {
          if (Math.random() < 0.05) {
            p.char = p.char === '1' ? '0' : '1';
          }
          const alpha = p.baseAlpha * (0.6 + Math.random() * 0.4);
          ctx.fillStyle = `rgba(52, 211, 153, ${alpha})`;
          ctx.fillText(p.char, p.x, p.y);
        }
      }
      animationFrameId = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', resize);
    resize();
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
};

// ==========================================
// 🚀 火山引擎豆包 API 配置
// ==========================================
const DOUBAO_API_URL = "/doubao-api";
const DOUBAO_API_KEY = "ark-39bf3f1b-08bc-4f29-b3ad-a4315e8b9153-f639d";

// 🔴 必改项：此处必须填入豆包的【文本对话模型】 Endpoint ID
// ⚡ 强烈建议：为了体验秒出、防止 Vercel 504 超时，请务必在后台创建一个 "doubao-lite-4k" 模型填入下方！
const DOUBAO_TEXT_MODEL = "ep-20260510220258-bx5rk"; // <-- 记得改成真实的对话模型ID！


// ==========================================
// 📦 全局缓存
// ==========================================
const cache = {
  relatedWords: new Map(),
  creativeIdeas: new Map(),
  connections: new Map(),
  convergences: new Map(),
  imagePrompts: new Map()
};

// ==========================================
// 🤖 统一的豆包API调用函数 (新增精准超时拦截)
// ==========================================
const callDoubaoAPI = async (endpoint, payload, timeout = 60000) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(`${DOUBAO_API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DOUBAO_API_KEY}`
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 504) {
        throw new Error("Vercel云端10秒限制拦截！请在火山后台把模型换成更快的 doubao-lite 试试。");
      }
      if (response.status === 429) {
        throw new Error("并发请求太多被限流啦，请稍微等几秒钟再试哦。");
      }
      
      const errorText = await response.text();
      let errorMsg = `API被拒绝 (状态码: ${response.status})`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) errorMsg = `豆包报错: ${errorJson.error.message}`;
      } catch (e) {}
      throw new Error(errorMsg);
    }

    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') throw new Error("请求超过了等待时间，网络可能卡住了");
    console.error("网络请求底层错误:", error);
    throw error;
  }
};

// ==========================================
// 🧠 AI 功能实现 (极限压缩防超时版)
// ==========================================
const generateRelatedWords = async (word, mode = 'default') => {
  const cacheKey = `${mode}_${word}`;
  if (cache.relatedWords.has(cacheKey)) return cache.relatedWords.get(cacheKey);

  let systemPrompt = "";
  if (mode === 'default') {
    systemPrompt = `发散“${word}”的7个网感词。严格JSON数组:[{"w":"词","e":"英文"}]`;
  } else if (mode === 'reverse') {
    systemPrompt = `“${word}”的7个反差/反常识/对立词。严格JSON数组:[{"w":"词","e":"英文"}]`;
  } else if (mode === 'vertical') {
    systemPrompt = `“${word}”的7个向下垂直细分词。严格JSON数组:[{"w":"词","e":"英文"}]`;
  } else if (mode === 'horizontal') {
    systemPrompt = `“${word}”的7个同类平行概念。严格JSON数组:[{"w":"词","e":"英文"}]`;
  }

  const payload = {
    model: DOUBAO_TEXT_MODEL,
    messages: [{ role: "user", content: systemPrompt }],
    temperature: 0.8,
    max_tokens: 150, 
    response_format: { type: "json_object" }
  };

  try {
    const result = await callDoubaoAPI("/chat/completions", payload);
    let jsonStr = result.choices[0].message.content;
    jsonStr = jsonStr.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    const data = JSON.parse(jsonStr);
    let rawArray = Array.isArray(data) ? data : (data.words || data.result || Object.values(data)[0]);
    
    if (!Array.isArray(rawArray) || rawArray.length === 0) {
      throw new Error("AI 返回了无法解析的错误格式数据");
    }

    const arrayData = rawArray.map(item => ({
      word: item.w || item.word || item.中文 || "未知",
      en: item.e || item.en || item.英文 || "unknown"
    }));

    cache.relatedWords.set(cacheKey, arrayData);
    return arrayData;
  } catch (error) {
    console.error(`解析或生成错误 (${mode}):`, error);
    throw error;
  }
};

const generateCreativeIdea = async (words) => {
  const key = words.sort().join(',');
  if (cache.creativeIdeas.has(key)) return cache.creativeIdeas.get(key);

  const prompt = `用“${words.join(', ')}”写100字小红书爆款文案。拒绝废话，直接输出内容。`;
  
  const result = await callDoubaoAPI("/chat/completions", {
    model: DOUBAO_TEXT_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.8,
    max_tokens: 200 
  });
  const data = result.choices[0].message.content;
  cache.creativeIdeas.set(key, data);
  return data;
};

const generateCrossoverInsight = async (words) => {
  const key = words.sort().join(',');
  if (cache.connections.has(key)) return cache.connections.get(key);

  const prompt = `强制跨界关联：${words.join(', ')}。输出3个极具颠覆性的产品或营销点子，100字内，拒绝废话。`;
  
  const result = await callDoubaoAPI("/chat/completions", {
    model: DOUBAO_TEXT_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.9,
    max_tokens: 200 
  });
  const data = result.choices[0].message.content;
  cache.connections.set(key, data);
  return data;
};

// 目标收敛模式（策略分类）
const generateConvergence = async (goal, allWordsStr) => {
  const prompt = `目标：“${goal}”。\n从以下词库筛选最核心词汇并分2类：${allWordsStr}。\n直接输出美观排版的聚类结果，不用废话，控制在200字内。`;
  
  const result = await callDoubaoAPI("/chat/completions", {
    model: DOUBAO_TEXT_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.5,
    max_tokens: 250 
  });
  return result.choices[0].message.content;
};

// 目标收敛模式（文生图高维提示词）
const generateConvergenceImagePrompt = async (goal, wordsStr) => {
  const cacheKey = `${goal}_${wordsStr}`;
  if (cache.imagePrompts.has(cacheKey)) return cache.imagePrompts.get(cacheKey);

  const prompt = `为“${goal}”及关联词“${wordsStr}”写中英双语配图提示词。
须包含8个维度：主体,风格,光影,材质,构图,配色,质感,环境(仅输出词组)。
结尾用<english_prompt>包裹纯英文完整Prompt。拒绝废话！`;

  const result = await callDoubaoAPI("/chat/completions", {
    model: DOUBAO_TEXT_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.6,
    max_tokens: 400 
  });
  const data = result.choices[0].message.content.trim();
  cache.imagePrompts.set(cacheKey, data);
  return data;
};


// ==========================================
// 🖱️ 画布平移缩放钩子
// ==========================================
const usePanZoom = (containerRef) => {
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const isDragging = useRef(false);
  const lastPan = useRef({ x: 0, y: 0 });

  const onPointerDown = useCallback((e) => {
    if (e.target.id === 'canvas-bg' || e.button === 1) {
      isDragging.current = true;
      lastPan.current = { x: e.clientX, y: e.clientY };
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  }, []);

  const onPointerMove = useCallback((e) => {
    if (isDragging.current) {
      const dx = e.clientX - lastPan.current.x;
      const dy = e.clientY - lastPan.current.y;
      setTransform(t => ({ ...t, x: t.x + dx, y: t.y + dy }));
      lastPan.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const onPointerUp = useCallback((e) => {
    isDragging.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  }, []);

  const onWheel = useCallback((e) => {
    if (e.ctrlKey) e.preventDefault();
    setTransform(t => {
      const zoomSensitivity = 0.001;
      const delta = -e.deltaY * zoomSensitivity;
      let newScale = t.scale * Math.exp(delta);
      newScale = Math.min(Math.max(newScale, 0.1), 3);

      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const newX = mouseX - (mouseX - t.x) * (newScale / t.scale);
        const newY = mouseY - (mouseY - t.y) * (newScale / t.scale);
        return { x: newX, y: newY, scale: newScale };
      }
      return { ...t, scale: newScale };
    });
  }, [containerRef]);

  return { transform, isDragging, onPointerDown, onPointerMove, onPointerUp, onWheel, setTransform };
};

// ==========================================
// 📱 移动端长按钩子
// ==========================================
const useLongPress = (callback, ms = 500) => {
  const timeout = useRef();
  const start = useCallback((e) => {
    if (e.type === 'mousedown' && e.button !== 0) return; 
    timeout.current = setTimeout(() => callback(e), ms);
  }, [callback, ms]);
  const clear = useCallback(() => {
    timeout.current && clearTimeout(timeout.current);
  }, []);
  return {
    onMouseDown: start,
    onMouseUp: clear,
    onMouseLeave: clear,
    onTouchStart: start,
    onTouchEnd: clear,
  };
};

// ==========================================
// 🎨 节点组件 (支持自由拖拽排版)
// ==========================================
const Node = ({ node, isDragging, onPointerDown, onPointerMove, onPointerUp, onRightClick, onPreload }) => {
  const { id, text, en, x, y, isRoot, isSelected, isLoading, size } = node;

  let nodeClasses = `absolute rounded-full flex flex-col items-center justify-center text-center cursor-pointer select-none group z-10 backdrop-blur-md border shadow-xl `;
  
  if (isSelected) {
    nodeClasses += "bg-gradient-to-br from-amber-500/40 to-amber-600/20 border-amber-400/60 shadow-amber-500/40 text-amber-100 z-20 ";
  } else if (isRoot) {
    nodeClasses += "bg-gradient-to-br from-emerald-500/40 to-teal-600/20 border-emerald-400/50 shadow-[0_0_30px_rgba(52,211,153,0.3)] text-white z-20 ";
  } else {
    nodeClasses += "bg-white/10 border-white/20 hover:bg-white/15 text-white/90 hover:border-white/40 ";
  }

  // 如果没有处于拖拽中，才增加动画过渡，保证拖拽时顺滑跟随
  if (!isDragging) {
    nodeClasses += "transition-all duration-300 ease-out ";
  }

  const scale = isRoot ? 1.3 : (isSelected ? 1.15 : 1);
  const transformStyle = `translate(-50%, -50%) scale(${scale})`;

  return (
    <div 
      id={id} 
      className={nodeClasses} 
      style={{ left: x, top: y, width: size, height: size, transform: transformStyle }} 
      onPointerDown={(e) => onPointerDown(e, node)}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => onPointerUp(e, node)}
      onContextMenu={onRightClick}
      onMouseEnter={() => !node.isExpanded && !node.isLoading && onPreload(node.text)}
    >
      {isLoading && (
        <>
          <div className="absolute inset-0 rounded-full border-[3px] border-emerald-400/0 border-t-emerald-400/80 animate-spin" />
          <div className="absolute inset-0 rounded-full bg-emerald-400/20 animate-pulse" />
        </>
      )}
      <div className="flex flex-col items-center justify-center p-4 w-full h-full relative z-10 pointer-events-none">
        <span className={`font-bold leading-tight ${isRoot ? 'text-xl' : 'text-base'} line-clamp-3`}>{text}</span>
        <span className={`text-xs mt-1 opacity-60 font-medium tracking-wide truncate max-w-full ${isSelected ? 'text-amber-200' : ''}`}>{en}</span>
      </div>
    </div>
  );
};

// ==========================================
// 🎨 主应用组件
// ==========================================
export default function BrainstormApp() {
  const containerRef = useRef(null);
  const { transform, isDragging: isCanvasDragging, onPointerDown: onCanvasPointerDown, onPointerMove: onCanvasPointerMove, onPointerUp: onCanvasPointerUp, onWheel, setTransform } = usePanZoom(containerRef);
  
  const [nodes, setNodes] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isInputCenter, setIsInputCenter] = useState(true);
  const [error, setError] = useState(null);

  // 状态：控制左侧操作指南手册的显示/隐藏
  const [isTipsVisible, setIsTipsVisible] = useState(true);

  // 节点拖拽相关状态
  const [draggedNodeId, setDraggedNodeId] = useState(null);
  const nodeDragInfo = useRef({ id: null, startX: 0, startY: 0, nodeStartX: 0, nodeStartY: 0, moved: false, longPressed: false });
  const longPressTimeout = useRef(null);

  const [isIdeaModalOpen, setIsIdeaModalOpen] = useState(false);
  const [generatedIdea, setGeneratedIdea] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const [isInsightModalOpen, setIsInsightModalOpen] = useState(false);
  const [generatedInsight, setGeneratedInsight] = useState('');
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);

  // 收敛模式状态
  const [isConvergenceModalOpen, setIsConvergenceModalOpen] = useState(false);
  const [convergenceGoal, setConvergenceGoal] = useState('');
  const [generatedConvergence, setGeneratedConvergence] = useState('');
  const [convergencePrompt, setConvergencePrompt] = useState('');
  const [isGeneratingConvergence, setIsGeneratingConvergence] = useState(false);
  const [isPromptCopied, setIsPromptCopied] = useState(false);

  const inputRef = useRef(null);
  useEffect(() => {
    if (isInputCenter && inputRef.current) inputRef.current.focus();
  }, [isInputCenter]);

  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setTransform({ x: rect.width / 2, y: rect.height / 2, scale: 1 });
    }
  }, []);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const preloadRelatedWords = useCallback((word) => {
    if (!cache.relatedWords.has(`default_${word}`)) generateRelatedWords(word, 'default').catch(() => {});
  }, []);

  const addNode = (id, text, en, x, y, parentId = null, isRoot = false) => {
    const newNode = {
      id, text, en, x, y, parentId, isRoot, 
      isSelected: false, isExpanded: false, isLoading: false,
      size: Math.max(100, Math.min(200, 80 + text.length * 15)) 
    };
    setNodes(prev => [...prev, newNode]);
    return newNode;
  };

  const handleInitialSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const rootWord = inputValue.trim();
    setInputValue('');
    setIsInputCenter(false);
    setError(null);
    
    // Determine position for the new root node
    let newX = 0;
    let newY = 0;

    if (nodes.length > 0) {
      const centerX = (window.innerWidth / 2 - transform.x) / transform.scale;
      const centerY = (window.innerHeight / 2 - transform.y) / transform.scale;
      newX = centerX + (Math.random() * 80 - 40);
      newY = centerY + (Math.random() * 80 - 40);
    } else {
      setNodes([]); 
    }
    
    const rootId = `node-${Date.now()}`;
    addNode(rootId, rootWord, "Root Concept", newX, newY, null, true);
    await expandNode(rootId, rootWord, 'default');
  };

  // 支持多种发散模式的核心扩展函数
  const expandNode = async (nodeId, word, mode = 'default') => {
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, isLoading: true } : n));
    try {
      const relatedData = await generateRelatedWords(word, mode);
      setNodes(prev => {
        const currentNodes = [...prev];
        const parentIndex = currentNodes.findIndex(n => n.id === nodeId);
        if (parentIndex === -1) return currentNodes;
        
        const parent = currentNodes[parentIndex];
        parent.isLoading = false;
        parent.isExpanded = true;
        parent.isSelected = false; // 扩展后自动取消选中，体验更好

        const count = relatedData.length;
        // 反向模式和层级模式，稍微加大扩散半径，避免与原词重叠太紧密
        const radius = mode === 'default' ? 250 : 300;
        let startAngle = 0;
        let angleRange = Math.PI * 2;

        if (parent.parentId) {
          const grandParent = currentNodes.find(n => n.id === parent.parentId);
          if (grandParent) {
            const angleFromParent = Math.atan2(parent.y - grandParent.y, parent.x - grandParent.x);
            startAngle = angleFromParent - Math.PI / 2;
            angleRange = Math.PI; 
          }
        }

        // 为了不同模式稍微偏移起始角度，避免重叠
        const modeOffset = mode === 'reverse' ? 0.3 : (mode === 'vertical' ? 0.6 : (mode === 'horizontal' ? 0.9 : 0));

        relatedData.forEach((data, index) => {
          const angle = startAngle + modeOffset + (angleRange / count) * index + (angleRange / count) / 2;
          const r = radius + (Math.random() * 50 - 25); 
          const childX = parent.x + Math.cos(angle) * r;
          const childY = parent.y + Math.sin(angle) * r;
          const childId = `node-${Date.now()}-${index}-${mode}`;
          
          currentNodes.push({
            id: childId, text: data.word, en: data.en, x: childX, y: childY, parentId: nodeId, isRoot: false,
            isSelected: false, isExpanded: false, isLoading: false,
            size: Math.max(90, Math.min(180, 70 + data.word.length * 15))
          });
        });
        return currentNodes;
      });
    } catch (err) {
      setError(`发散节点失败: ${err.message}`);
      setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, isLoading: false, isSelected: false } : n));
    }
  };

  const activeLinks = useMemo(() => {
    return nodes.filter(n => n.parentId).map(n => ({ source: n.parentId, target: n.id }));
  }, [nodes]);

  const toggleSelectNode = (id) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, isSelected: !n.isSelected } : n));
  };

  // --- 节点指针事件：支持拖拽和移动端长按 ---
  const handleNodePointerDown = (e, node) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return; // 只响应左键和触屏
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    
    nodeDragInfo.current = {
      id: node.id,
      startX: e.clientX,
      startY: e.clientY,
      nodeStartX: node.x,
      nodeStartY: node.y,
      moved: false,
      longPressed: false
    };
    setDraggedNodeId(node.id);

    // 移动端长按模拟右键选择
    longPressTimeout.current = setTimeout(() => {
      nodeDragInfo.current.longPressed = true;
      toggleSelectNode(node.id);
    }, 500);
  };

  const handleNodePointerMove = (e) => {
    if (nodeDragInfo.current.id) {
      e.stopPropagation();
      const dx = (e.clientX - nodeDragInfo.current.startX) / transform.scale;
      const dy = (e.clientY - nodeDragInfo.current.startY) / transform.scale;
      
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        nodeDragInfo.current.moved = true;
        if (longPressTimeout.current) {
          clearTimeout(longPressTimeout.current);
          longPressTimeout.current = null;
        }
      }

      setNodes(prev => prev.map(n => 
        n.id === nodeDragInfo.current.id 
        ? { ...n, x: nodeDragInfo.current.nodeStartX + dx, y: nodeDragInfo.current.nodeStartY + dy } 
        : n
      ));
    }
  };

  const handleNodePointerUp = (e, node) => {
    if (nodeDragInfo.current.id === node.id) {
      e.stopPropagation();
      e.currentTarget.releasePointerCapture(e.pointerId);
      
      if (longPressTimeout.current) {
        clearTimeout(longPressTimeout.current);
        longPressTimeout.current = null;
      }
      
      const wasMoved = nodeDragInfo.current.moved;
      const wasLongPressed = nodeDragInfo.current.longPressed;
      
      setDraggedNodeId(null);
      nodeDragInfo.current = { id: null, startX: 0, startY: 0, nodeStartX: 0, nodeStartY: 0, moved: false, longPressed: false };
      
      // 没有拖动且没有长按，视为普通发散（左键）
      if (!wasMoved && !wasLongPressed) {
        if (!node.isExpanded) expandNode(node.id, node.text, 'default');
      }
    }
  };

  // --- 特定模式触发器 ---
  const handleSpecificExpand = (mode) => {
    const selected = nodes.filter(n => n.isSelected);
    if (selected.length !== 1) return;
    expandNode(selected[0].id, selected[0].text, mode);
  };

  const handleGenerateIdea = async () => {
    const selectedWords = nodes.filter(n => n.isSelected).map(n => n.text);
    const rootWords = nodes.filter(n => n.isRoot).map(n => n.text);
    if (selectedWords.length === 0 && rootWords.length === 0) return;
    const wordsToUse = selectedWords.length > 0 ? selectedWords : rootWords;
    
    setIsIdeaModalOpen(true);
    setIsGenerating(true);
    setGeneratedIdea('');
    setError(null);
    
    try {
      const idea = await generateCreativeIdea(wordsToUse);
      setGeneratedIdea(idea);
    } catch (err) {
      setError(`生成创意失败: ${err.message}`);
      setGeneratedIdea("获取内容失败。");
      setIsIdeaModalOpen(false);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCrossoverInsight = async () => {
    const selectedWords = nodes.filter(n => n.isSelected).map(n => n.text);
    if (selectedWords.length < 2) return; 
    
    setIsInsightModalOpen(true);
    setIsGeneratingInsight(true);
    setGeneratedInsight('');
    setError(null);
    
    try {
      const insight = await generateCrossoverInsight(selectedWords);
      setGeneratedInsight(insight);
    } catch (err) {
      setError(`跨界碰撞失败: ${err.message}`);
      setGeneratedInsight("获取内容失败。");
      setIsInsightModalOpen(false);
    } finally {
      setIsGeneratingInsight(false);
    }
  };

  // ========== 🚀 终极优化的收敛聚合逻辑 (串行防超时，强制降频) ==========
  const handleRunConvergence = async () => {
    if (!convergenceGoal.trim()) return;
    setIsGeneratingConvergence(true);
    setError(null);
    setGeneratedConvergence('');
    setConvergencePrompt('');

    // 优先使用选中的词语，如果没有选中则使用全图词语
    const selectedNodes = nodes.filter(n => n.isSelected);
    const targetNodes = selectedNodes.length > 0 ? selectedNodes : nodes;
    
    // ⚠️ 极其重要的字数熔断：如果画布上有成百上千个词，AI并发必死。
    // 我们强制最多只截取前 12 个核心词汇发送给大模型，极大降低处理时长。
    const maxWords = 12;
    const allWordsStr = targetNodes.slice(0, maxWords).map(n => n.text).join('、');
    
    try {
      // 步骤 1：先串行生成策略（必须等这步完全成功，才开始下一步）
      const strategyResult = await generateConvergence(convergenceGoal.trim(), allWordsStr);
      setGeneratedConvergence(strategyResult);
      setIsGeneratingConvergence(false); // ✅ 第一阶段结束，解除界面的转圈锁定

      // 步骤 2：策略出来后，后台再去安全地请求高维配图提示词
      try {
        const promptResult = await generateConvergenceImagePrompt(convergenceGoal.trim(), allWordsStr);
        setConvergencePrompt(promptResult);
      } catch (promptErr) {
        console.error("提示词生成失败:", promptErr);
        setConvergencePrompt(`❌ 提示词请求被阻断或超时: ${promptErr.message}`);
      }

    } catch (err) {
      // 如果步骤 1 就挂了，捕获错误
      setError(`收敛聚合失败: ${err.message}`);
      setIsGeneratingConvergence(false);
    }
  };

  const clearCanvas = () => {
    setNodes([]);
    setIsInputCenter(true);
    setError(null);
    setTransform({ x: window.innerWidth / 2, y: window.innerHeight / 2, scale: 1 });
  };

  const selectedCount = nodes.filter(n => n.isSelected).length;
  // 选中的节点数文本提示
  const activeNodesCount = selectedCount > 0 ? selectedCount : nodes.length;

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#160B2A] text-white selection:bg-emerald-500/30 font-sans">
      {/* 🔴 全局错误提示横幅 */}
      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-4 bg-red-500/90 backdrop-blur-md border border-red-400/50 rounded-full shadow-[0_0_40px_rgba(239,68,68,0.5)] transition-all animate-[bounce_0.5s_ease-out]">
          <AlertCircle size={20} className="text-white" />
          <span className="font-bold text-white tracking-wide">{error}</span>
          <button onClick={() => setError(null)} className="ml-2 text-white/70 hover:text-white transition-colors bg-white/10 p-1.5 rounded-full">
            <X size={16} />
          </button>
        </div>
      )}
      
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#2a164b] via-[#160b2a] to-[#0f071e] pointer-events-none -z-10" />
      
      <div className={`absolute inset-0 transition-opacity duration-1000 ease-in-out pointer-events-none z-0 ${isInputCenter ? 'opacity-100' : 'opacity-0'}`}>
        <BinaryTreeCanvas />
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-amber-500/10 blur-[120px] rounded-full" />
      </div>

      <div id="canvas-bg" ref={containerRef} className="absolute inset-0 cursor-grab active:cursor-grabbing z-10" onPointerDown={onCanvasPointerDown} onPointerMove={onCanvasPointerMove} onPointerUp={onCanvasPointerUp} onPointerCancel={onCanvasPointerUp} onWheel={onWheel}>
        <div style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, transformOrigin: '0 0', transition: isCanvasDragging.current ? 'none' : 'transform 0.1s ease-out' }} className="absolute top-0 left-0">
          <svg className="absolute top-0 left-0 overflow-visible pointer-events-none">
            {activeLinks.map((link, i) => {
              const source = nodes.find(n => n.id === link.source);
              const target = nodes.find(n => n.id === link.target);
              if (!source || !target) return null;
              
              // 拖拽时取消连线的动画延迟，使其丝滑跟随
              const isLineDragging = draggedNodeId === link.source || draggedNodeId === link.target;
              
              return (
                <g key={`${link.source}-${link.target}`}>
                  <line x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke={target.isSelected ? "rgba(245, 158, 11, 0.4)" : "rgba(255, 255, 255, 0.15)"} strokeWidth={target.isSelected ? 3 : 1.5} className={isLineDragging ? "" : "transition-all duration-300 ease-out"} />
                  {source.isLoading && <line x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke="rgba(16, 185, 129, 0.5)" strokeWidth="2" strokeDasharray="4 8" className="animate-[dash_1s_linear_infinite]" />}
                </g>
              );
            })}
          </svg>
          {nodes.map(node => (
            <Node 
              key={node.id} 
              node={node} 
              isDragging={draggedNodeId === node.id}
              onPointerDown={handleNodePointerDown}
              onPointerMove={handleNodePointerMove}
              onPointerUp={handleNodePointerUp}
              onRightClick={(e) => { e.preventDefault(); toggleSelectNode(node.id); }} 
              onPreload={preloadRelatedWords} 
            />
          ))}
        </div>
      </div>

      {/* ========================================== */}
      {/* 📖 左上角 TIPS 指南框 (书本外框样式，带关闭) */}
      {/* ========================================== */}
      <div className={`absolute top-6 left-6 z-20 transition-all duration-700 ease-in-out ${isInputCenter ? 'opacity-0 translate-y-4 pointer-events-none' : (isTipsVisible ? 'opacity-90 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-4 pointer-events-none')}`}>
        <div className="bg-[#1a0f2e]/70 backdrop-blur-xl border border-white/10 border-l-[6px] border-l-emerald-500 rounded-r-2xl rounded-l-sm p-5 shadow-2xl shadow-black/50 min-w-[300px] relative">
          <button 
            onClick={() => setIsTipsVisible(false)} 
            className="absolute top-4 right-4 text-white/40 hover:text-white/80 transition-colors"
            title="关闭指南"
          >
            <X size={16} />
          </button>
          
          <h3 className="text-emerald-400 font-bold mb-4 flex items-center gap-2 text-sm tracking-widest uppercase border-b border-emerald-500/20 pb-2 pr-6">
            <BookOpen size={16} /> 操作指南手册
          </h3>
          <ul className="text-sm text-white/80 space-y-3 font-medium pointer-events-none">
            <li className="flex items-center gap-3 group">
              <div className="p-1.5 bg-white/5 rounded-md border border-white/10 group-hover:bg-white/10 transition-colors"><MousePointer2 size={14} className="text-emerald-400"/></div>
              <span><b className="text-white">左键点击：</b> 标准关联发散</span>
            </li>
            <li className="flex items-center gap-3 group">
              <div className="p-1.5 bg-white/5 rounded-md border border-white/10 group-hover:bg-white/10 transition-colors"><MousePointer2 size={14} className="text-indigo-400"/></div>
              <span><b className="text-white">左键拖拽：</b> 自由移动词语</span>
            </li>
            <li className="flex items-center gap-3 group">
              <div className="p-1.5 bg-white/5 rounded-md border border-white/10 group-hover:bg-white/10 transition-colors"><MousePointer2 size={14} className="text-amber-400"/></div>
              <span><b className="text-white">右键点击：</b> 选择/取消词语</span>
            </li>
            <li className="flex items-center gap-3 group">
              <div className="p-1.5 bg-white/5 rounded-md border border-white/10 group-hover:bg-white/10 transition-colors"><Focus size={14} className="text-rose-400"/></div>
              <span><b className="text-white">选中1个词：</b> 开启顶部多维发散</span>
            </li>
            <li className="flex items-center gap-3 group">
              <div className="p-1.5 bg-white/5 rounded-md border border-white/10 group-hover:bg-white/10 transition-colors"><Zap size={14} className="text-orange-400"/></div>
              <span><b className="text-white">多选关联词：</b> 开启跨界碰撞/收敛</span>
            </li>
          </ul>
        </div>
      </div>
      
      {/* 恢复指南按钮（当指南隐藏时显示） */}
      {!isInputCenter && !isTipsVisible && (
        <button 
          onClick={() => setIsTipsVisible(true)}
          className="absolute top-6 left-6 z-20 flex items-center justify-center p-3 bg-[#1a0f2e]/70 hover:bg-[#1a0f2e] backdrop-blur-xl border border-white/10 border-l-[4px] border-l-emerald-500 rounded-r-xl rounded-l-sm shadow-xl text-emerald-400 transition-all hover:scale-105"
          title="显示操作指南"
        >
          <BookOpen size={20} />
        </button>
      )}

      {/* ========================================== */}
      {/* 顶部右侧导航按钮 (根据选中状态动态切换，带 Tooltip) */}
      {/* ========================================== */}
      <div className="absolute top-0 right-0 w-full p-6 flex justify-end items-start pointer-events-none z-20">
        <div className="flex flex-wrap justify-end gap-3 pointer-events-auto max-w-[70vw]">
          <button onClick={clearCanvas} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 rounded-full text-sm font-medium transition-all text-white/80 hover:text-white">
            <Trash2 size={16} /> <span className="hidden sm:inline">清空画布</span>
          </button>

          {nodes.length > 0 && (
            <div className="relative group">
              <button onClick={() => setIsConvergenceModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-cyan-500 hover:to-blue-400 text-white shadow-lg shadow-cyan-500/20 backdrop-blur-md border border-white/20 rounded-full text-sm font-bold transition-all peer">
                <Target size={16} /> <span className="hidden sm:inline">收敛聚合</span>
              </button>
              <div className="absolute top-full right-0 mt-2 w-64 p-3 bg-[#1e1136]/90 backdrop-blur-xl border border-cyan-500/30 rounded-xl shadow-xl text-sm text-white/90 font-medium opacity-0 translate-y-2 pointer-events-none transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0 z-50">
                <div className="flex items-start gap-2">
                  <Info size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                  <div>根据目标整理所选词语，并生成<span className="text-cyan-300">高维配图提示词</span>。<br/><span className="text-white/50 text-xs mt-1 block">提示：基于您右键选中的 {selectedCount > 0 ? selectedCount : '所有'} 个词汇</span></div>
                </div>
              </div>
            </div>
          )}

          {selectedCount === 1 && (
            <>
              <div className="h-8 w-px bg-white/20 my-auto mx-2 hidden sm:block"></div>
              
              {/* 反常识发散 Button & Tooltip */}
              <div className="relative group">
                <button onClick={() => handleSpecificExpand('reverse')} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-pink-500 hover:to-rose-400 text-white shadow-lg shadow-rose-500/20 backdrop-blur-md border border-white/20 rounded-full text-sm font-bold transition-all peer">
                  <FlipHorizontal size={16} /> <span className="hidden sm:inline">反向模式</span>
                </button>
                <div className="absolute top-full right-0 mt-2 w-64 p-3 bg-[#1e1136]/90 backdrop-blur-xl border border-rose-500/30 rounded-xl shadow-xl text-sm text-white/90 font-medium opacity-0 translate-y-2 pointer-events-none transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0">
                  <div className="flex items-start gap-2">
                    <Info size={16} className="text-rose-400 shrink-0 mt-0.5" />
                    <div>生成与该词<span className="text-rose-300">对立面、反常识</span>的概念。<br/><span className="text-white/50 text-xs mt-1 block">例："夏天" → "羽绒服" "冰雕"</span></div>
                  </div>
                </div>
              </div>

              {/* 纵向深入 Button & Tooltip */}
              <div className="relative group">
                <button onClick={() => handleSpecificExpand('vertical')} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-indigo-500 hover:to-purple-400 text-white shadow-lg shadow-purple-500/20 backdrop-blur-md border border-white/20 rounded-full text-sm font-bold transition-all peer">
                  <ArrowDownToLine size={16} /> <span className="hidden sm:inline">纵向深入</span>
                </button>
                <div className="absolute top-full right-0 mt-2 w-64 p-3 bg-[#1e1136]/90 backdrop-blur-xl border border-purple-500/30 rounded-xl shadow-xl text-sm text-white/90 font-medium opacity-0 translate-y-2 pointer-events-none transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0 z-50">
                  <div className="flex items-start gap-2">
                    <Info size={16} className="text-purple-400 shrink-0 mt-0.5" />
                    <div>挖掘该词的<span className="text-purple-300">底层、更细分具体</span>的节点。<br/><span className="text-white/50 text-xs mt-1 block">例："猫" → "蓝金渐层" "幼猫喂养"</span></div>
                  </div>
                </div>
              </div>

              {/* 横向扩展 Button & Tooltip */}
              <div className="relative group">
                <button onClick={() => handleSpecificExpand('horizontal')} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-blue-500 hover:to-indigo-400 text-white shadow-lg shadow-blue-500/20 backdrop-blur-md border border-white/20 rounded-full text-sm font-bold transition-all peer">
                  <ArrowRightToLine size={16} /> <span className="hidden sm:inline">横向扩展</span>
                </button>
                <div className="absolute top-full right-0 mt-2 w-64 p-3 bg-[#1e1136]/90 backdrop-blur-xl border border-indigo-500/30 rounded-xl shadow-xl text-sm text-white/90 font-medium opacity-0 translate-y-2 pointer-events-none transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0 z-50">
                  <div className="flex items-start gap-2">
                    <Info size={16} className="text-indigo-400 shrink-0 mt-0.5" />
                    <div>寻找与该词<span className="text-indigo-300">同父类的平行概念</span>。<br/><span className="text-white/50 text-xs mt-1 block">例："猫" → "狗" "兔子" "仓鼠"</span></div>
                  </div>
                </div>
              </div>
            </>
          )}

          {selectedCount >= 2 && (
            <div className="relative group">
              <button onClick={handleCrossoverInsight} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-400 hover:from-orange-400 hover:to-amber-300 text-white shadow-lg shadow-amber-500/20 backdrop-blur-md border border-white/20 rounded-full text-sm font-bold transition-all peer">
                <Zap size={16} /> <span className="hidden sm:inline">跨界碰撞</span>
              </button>
              <div className="absolute top-full right-0 mt-2 w-72 p-3 bg-[#1e1136]/90 backdrop-blur-xl border border-amber-500/30 rounded-xl shadow-xl text-sm text-white/90 font-medium opacity-0 translate-y-2 pointer-events-none transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0 z-50">
                <div className="flex items-start gap-2">
                  <Info size={16} className="text-amber-400 shrink-0 mt-0.5" />
                  <div>将选中词语<span className="text-amber-300">跨领域强制关联</span>，碰撞颠覆性点子。<br/><span className="text-white/50 text-xs mt-1 block">例："咖啡"+"航天" → "零重力咖啡杯"</span></div>
                </div>
              </div>
            </div>
          )}

          {nodes.length > 0 && (
            <button onClick={handleGenerateIdea} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-white shadow-lg shadow-emerald-500/20 backdrop-blur-md border border-white/20 rounded-full text-sm font-bold transition-all">
              <Sparkles size={16} /> <span className="hidden sm:inline">导出创意</span>
            </button>
          )}
        </div>
      </div>

      {/* 中心/底部输入框 */}
      <div className={`absolute w-full flex justify-center pointer-events-none transition-all duration-700 ease-in-out z-30 ${isInputCenter ? 'top-[60%] -translate-y-1/2' : 'bottom-8'}`}>
        <form onSubmit={handleInitialSubmit} className={`pointer-events-auto relative group flex items-center bg-[#1a0f2e]/60 backdrop-blur-xl border p-2 transition-all duration-700 ${isInputCenter ? 'w-[90%] max-w-xl rounded-[3rem] border-emerald-400/50 glowing-capsule' : 'w-[90%] max-w-md rounded-full border-white/20 shadow-emerald-500/10'}`}>
          <input ref={inputRef} type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="输入起始词或短句，开启发散..." className="w-full bg-transparent border-none outline-none text-white px-8 py-4 placeholder:text-white/50 text-lg font-medium" />
          <button type="submit" className={`absolute right-3 p-4 rounded-full transition-colors flex items-center justify-center ${isInputCenter ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_15px_rgba(52,211,153,0.8)]' : 'bg-emerald-500/80 hover:bg-emerald-400 text-white p-3 right-2'}`}>
            <Sparkles size={isInputCenter ? 24 : 20} />
          </button>
        </form>
      </div>

      {/* ========================================== */}
      {/* 🎯 目标收敛模态框 (包含文生图提示词生成，彻底防并发超时) */}
      {/* ========================================== */}
      {isConvergenceModalOpen && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-cyan-500/30 rounded-3xl w-full max-w-6xl shadow-[0_0_80px_rgba(6,182,212,0.15)] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5 shrink-0">
              <h3 className="text-xl font-bold flex items-center gap-3 text-cyan-400"><Target size={24} /> 目标收敛与高维提示词提取</h3>
              <button onClick={() => {setIsConvergenceModalOpen(false); setGeneratedConvergence(''); setConvergencePrompt(''); setConvergenceGoal('');}} className="text-white/50 hover:text-white transition-colors p-2 bg-white/5 rounded-full hover:bg-white/10"><X size={20} /></button>
            </div>
            
            <div className="p-6 md:p-8 overflow-y-auto max-h-[80vh] flex flex-col gap-6">
              {!generatedConvergence && !isGeneratingConvergence ? (
                <>
                  <div className="bg-cyan-500/10 border border-cyan-500/20 p-4 rounded-xl text-cyan-100 text-sm">
                    AI 将基于您指定的 <b>{activeNodesCount}</b> 个关联词汇，围绕目标进行策略聚类，<b>并同步生成包含 8 大维度细节的中英双语「概念配图提示词」</b>。
                  </div>
                  <div className="flex flex-col gap-3">
                    <label className="text-white/80 font-medium">您的最终业务/创意目标是什么？</label>
                    <textarea 
                      value={convergenceGoal}
                      onChange={(e) => setConvergenceGoal(e.target.value)}
                      placeholder="例如：为一家宠物咖啡馆策划六一儿童节的营销活动..."
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50 transition-colors resize-none h-32"
                    />
                  </div>
                  <div className="flex justify-end pt-2">
                    <button onClick={handleRunConvergence} disabled={!convergenceGoal.trim()} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                      <Focus size={18} /> 开始聚类收敛
                    </button>
                  </div>
                </>
              ) : isGeneratingConvergence ? (
                <div className="flex flex-col items-center justify-center py-20 text-cyan-400 gap-5">
                  <Loader2 className="animate-spin" size={50} />
                  <p className="animate-pulse text-lg">正在极速提取核心策略并整理分类 (1/2)...</p>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row gap-8">
                  {/* 左侧：策略收敛 */}
                  <div className="flex-1 flex flex-col gap-4">
                    <div className="text-cyan-400 font-medium pb-2 border-b border-white/10 flex items-center gap-2">
                      <Focus size={18} /> 
                      策略提取：<span className="text-white truncate" title={convergenceGoal}>“{convergenceGoal}”</span>
                    </div>
                    <div className="text-white/90 leading-loose whitespace-pre-wrap text-sm font-medium h-full max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                      {generatedConvergence}
                    </div>
                  </div>

                  {/* 中间分割线 */}
                  <div className="w-px bg-white/10 hidden md:block"></div>

                  {/* 右侧：高维提示词（异步渐进加载） */}
                  <div className="flex-1 flex flex-col gap-4">
                    <div className="flex justify-between items-center pb-2 border-b border-white/10">
                      <div className="text-purple-400 font-medium flex items-center gap-2">
                        <ImageIcon size={18} /> 高维概念配图提示词 (Prompt)
                      </div>
                      {convergencePrompt && !convergencePrompt.includes("生成中") && !convergencePrompt.includes("❌") && (
                        <button onClick={() => {
                          const cleanPrompt = convergencePrompt.replace(/<english_prompt>|<\/english_prompt>/gi, '').trim();
                          navigator.clipboard.writeText(cleanPrompt);
                          setIsPromptCopied(true);
                          setTimeout(() => setIsPromptCopied(false), 2000);
                        }} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 rounded-lg transition-all text-xs font-bold">
                          {isPromptCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                          {isPromptCopied ? <span className="text-emerald-400">已复制纯英文版</span> : '一键复制英文 Prompt'}
                        </button>
                      )}
                    </div>
                    
                    {convergencePrompt ? (
                      convergencePrompt.includes("❌") ? (
                        <div className="flex-1 bg-red-500/5 rounded-xl border border-red-500/20 flex flex-col gap-3 items-center justify-center min-h-[200px] p-4 text-center">
                          <AlertCircle className="text-red-400" size={32} />
                          <span className="text-red-400/80 text-sm">{convergencePrompt}</span>
                        </div>
                      ) : (
                        <div className="font-mono text-xs text-white/80 bg-black/40 p-4 rounded-xl leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto custom-scrollbar border border-white/5">
                          {convergencePrompt.replace(/<english_prompt>|<\/english_prompt>/gi, '\n==============================\n【提供给绘图 AI 的纯英文版】\n==============================\n')}
                        </div>
                      )
                    ) : (
                      <div className="flex-1 bg-white/5 animate-pulse rounded-xl border border-white/5 flex flex-col gap-3 items-center justify-center min-h-[200px]">
                        <Loader2 className="animate-spin text-purple-400/50" size={24} />
                        <span className="text-white/30 text-sm">策略已就绪，正在后台排队生成 8大维度双语提示词 (2/2)...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* 底部按钮 */}
            {generatedConvergence && (
              <div className="p-6 border-t border-white/5 bg-white/5 flex justify-end">
                <button onClick={() => {setGeneratedConvergence(''); setConvergencePrompt(''); setConvergenceGoal('');}} className="px-5 py-2 bg-black/30 hover:bg-black/50 text-white/80 rounded-xl transition-all font-medium text-sm border border-white/10">
                  重新输入目标
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 创意文案模态框 */}
      {isIdeaModalOpen && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1e1136] border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5"><h3 className="text-xl font-bold flex items-center gap-2 text-amber-400"><Sparkles size={20} /> 创意文案生成</h3><button onClick={() => setIsIdeaModalOpen(false)} className="text-white/50 hover:text-white transition-colors"><X size={24} /></button></div>
            <div className="p-8 overflow-y-auto flex-1 text-white/90 leading-relaxed whitespace-pre-wrap text-lg">
              {isGenerating ? <div className="flex flex-col items-center justify-center py-12 text-emerald-400 gap-4"><Loader2 className="animate-spin" size={40} /><p className="animate-pulse">AI正在将您的灵感火花串联...</p></div> : <p>{generatedIdea}</p>}
            </div>
            {!isGenerating && <div className="p-6 border-t border-white/5 bg-black/20 flex justify-end gap-3"><button onClick={() => navigator.clipboard.writeText(generatedIdea)} className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors font-medium"><Download size={18} /> 复制文案</button></div>}
          </div>
        </div>
      )}

      {/* 跨界碰撞模态框 */}
      {isInsightModalOpen && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#2a1325] border border-orange-500/20 rounded-3xl w-full max-w-md shadow-[0_0_50px_rgba(249,115,22,0.15)] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5"><h3 className="text-xl font-bold flex items-center gap-2 text-orange-400"><Zap size={20} /> 颠覆性跨界碰撞</h3><button onClick={() => setIsInsightModalOpen(false)} className="text-white/50 hover:text-white transition-colors"><X size={24} /></button></div>
            <div className="p-8 overflow-y-auto text-white/90 leading-relaxed whitespace-pre-wrap text-base font-medium">
              {isGeneratingInsight ? <div className="flex flex-col items-center justify-center py-8 text-orange-400 gap-4"><Loader2 className="animate-spin" size={40} /><p className="animate-pulse">正在寻找词语间的颠覆性联系...</p></div> : <div className="border-l-4 border-orange-500/50 pl-4 py-2"><p>{generatedInsight}</p></div>}
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes dash { to { stroke-dashoffset: -12; } }
        @keyframes capsule-glow { 0%, 100% { box-shadow: 0 0 30px rgba(52,211,153,0.3), inset 0 0 20px rgba(52,211,153,0.1); border-color: rgba(52,211,153,0.4); } 50% { box-shadow: 0 0 60px rgba(52,211,153,0.7), inset 0 0 40px rgba(52,211,153,0.3); border-color: rgba(52,211,153,0.9); } }
        .glowing-capsule { animation: capsule-glow 3s ease-in-out infinite; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.3); }
      `}} />
    </div>
  );
}