import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Sparkles, Download, Trash2, X, Loader2, Maximize, MousePointer2, Zap, Quote, Copy, Check, AlertCircle, BookOpen, Target, FlipHorizontal, ArrowDownToLine, ArrowRightToLine, Focus, Info, Image as ImageIcon } from 'lucide-react';

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
// ⚡ 如果您需要真正的联网搜索，请务必在火山引擎创建一个"智能体"，开启"联网搜索"插件，并将该智能体的 Endpoint ID 填入下方！
const DOUBAO_TEXT_MODEL = "ep-20260510220258-bx5rk"; // <-- 记得改成真实的模型ID！

// ==========================================
// 📦 全局缓存
// ==========================================
const cache = {
  relatedWords: new Map(),
  creativeIdeas: new Map(),
  connections: new Map(),
  convergences: new Map(),
  imagePrompts: new Map(),
  news: new Map() 
};

// ==========================================
// 🤖 统一的豆包API调用函数 
// ==========================================
// 超时时间放宽至 30 秒，防止正常的大段文本生成被误杀
const callDoubaoAPI = async (endpoint, payload, timeout = 30000) => {
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
        throw new Error("Vercel云端10秒限制拦截！由于模型生成太慢导致超时。强烈建议在火山后台换成 doubao-lite 模型。");
      }
      if (response.status === 429) {
        throw new Error("并发请求被限流，请稍等几秒钟再试。");
      }
      
      const errorText = await response.text();
      let errorMsg = `API被拒绝 (状态码: ${response.status})`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) {
          errorMsg = `豆包报错: ${errorJson.error.message}`;
        }
      } catch (e) {}
      throw new Error(errorMsg);
    }

    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') throw new Error("大模型响应超时，请检查网络，或尝试换用更快的 Lite 模型。");
    console.error("网络请求底层错误:", error);
    throw error;
  }
};

// ==========================================
// 🧠 AI 功能实现
// ==========================================

const generateRelatedWords = async (word, mode = 'default') => {
  const cacheKey = `${mode}_${word}`;
  if (cache.relatedWords.has(cacheKey)) return cache.relatedWords.get(cacheKey);

  let systemPrompt = "";
  if (mode === 'default') {
    systemPrompt = `发散“${word}”的7个网感词。严格输出纯JSON数组，格式:[{"w":"中文词","e":"英文"}]。不要任何markdown标记。`;
  } else if (mode === 'reverse') {
    systemPrompt = `“${word}”的7个反差/反常识/对立词。严格输出纯JSON数组:[{"w":"词","e":"英文"}]。不要任何markdown标记。`;
  } else if (mode === 'vertical') {
    systemPrompt = `“${word}”的7个向下垂直细分词。严格输出纯JSON数组:[{"w":"词","e":"英文"}]。不要任何markdown标记。`;
  } else if (mode === 'horizontal') {
    systemPrompt = `“${word}”的7个同类平行概念。严格输出纯JSON数组:[{"w":"词","e":"英文"}]。不要任何markdown标记。`;
  }

  const payload = {
    model: DOUBAO_TEXT_MODEL,
    messages: [{ role: "user", content: systemPrompt }],
    temperature: 0.8,
    max_tokens: 150
  };

  try {
    const result = await callDoubaoAPI("/chat/completions", payload, 15000);
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
  }, 15000);
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
  }, 15000);
  const data = result.choices[0].message.content;
  cache.connections.set(key, data);
  return data;
};

const generateConvergence = async (goal, allWordsStr) => {
  const prompt = `目标：“${goal}”。\n从以下词汇筛选最核心要素并分2类：${allWordsStr}。\n直接输出排版美观的聚类结果，拒绝废话，限150字内。`;
  
  const result = await callDoubaoAPI("/chat/completions", {
    model: DOUBAO_TEXT_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.5,
    max_tokens: 250 
  }, 20000);
  return result.choices[0].message.content;
};

const generateConvergenceImagePrompt = async (goal, wordsStr) => {
  const cacheKey = `${goal}_${wordsStr}`;
  if (cache.imagePrompts.has(cacheKey)) return cache.imagePrompts.get(cacheKey);

  const prompt = `你是一位顶级的原画师和AI绘画提示词专家。请为目标：“${goal}”及关联词“${wordsStr}”写一段【极度详细、画面感极强】的中英双语配图提示词。

要求必须包含且细致描述以下8个维度（拒绝粗糙，要像摄影指导一样给出细节）：
1. 主体 (Subject)：不要只说“一个人”，要描述他的神态、动作、穿着特征。
2. 风格 (Style)：如 Cyberpunk, Photorealistic, Oil painting, Studio Ghibli 等。
3. 光影 (Lighting)：如 伦勃朗光, 赛博朋克霓虹光, 柔和丁达尔光效 等。
4. 材质 (Material)：如 粗糙的亚麻布, 泛着冷光的金属, 晶莹剔透的玻璃。
5. 构图 (Composition)：如 黄金分割, 对称构图, 仰视特写。
6. 配色 (Color Palette)：明确主色调和点缀色。
7. 质感 (Texture)：如 8k分辨率, 电影级画质, 极其细腻的皮肤纹理。
8. 环境 (Environment)：环境背景的详细布局。

格式要求：
- 前半部分为中文解析。
- 结尾必须单独用 <english_prompt> 标签包裹一段纯英文完整 Prompt。不能有任何多余废话。`;

  const result = await callDoubaoAPI("/chat/completions", {
    model: DOUBAO_TEXT_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 800
  }, 30000); 
  const data = result.choices[0].message.content.trim();
  cache.imagePrompts.set(cacheKey, data);
  return data;
};

// 🌟 真正通过豆包大模型实现检索 (需在火山控制台为模型开启搜索插件)
const fetchConvergenceNews = async (goal, wordsStr) => {
  const cacheKey = `${goal}_news`;
  if (cache.news.has(cacheKey)) return cache.news.get(cacheKey);

  const prompt = `如果你具备联网搜索能力，请立刻在互联网上搜索关于“${goal}”的最新行业资讯、新闻报道或真实市场案例。结合关键词语：“${wordsStr}”。
要求：
1. 总结出3条关键信息，必须是客观真实的互联网资讯。
2. 请务必在回复中附上新闻的真实参考来源（媒体名称或链接）。
3. 使用专业的中文进行回复，排版清晰。`;

  try {
    const result = await callDoubaoAPI("/chat/completions", {
      model: DOUBAO_TEXT_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
      max_tokens: 500
    }, 25000); 
    
    const data = result.choices[0].message.content.trim();
    // 豆包 API 通常直接将搜索来源整合在回答文本中
    const output = { text: data, sources: [] }; 
    cache.news.set(cacheKey, output);
    return output;
  } catch (error) {
    console.error("Real News Fetch Error:", error);
    return { text: "资讯获取失败。请确保您在火山引擎控制台中为当前填入的模型开启了【联网搜索】插件能力，或者检查网络连接。\n" + error.message, sources: [], error: true };
  }
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
// 🎨 节点组件
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

  const [isTipsVisible, setIsTipsVisible] = useState(true);

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
  const [convergenceNews, setConvergenceNews] = useState(null); 
  const [convergenceStatus, setConvergenceStatus] = useState({ step: 0, text: '' }); 
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
        parent.isSelected = false;

        const count = relatedData.length;
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
      setError(`发散失败: ${err.message}`);
      setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, isLoading: false, isSelected: false } : n));
    }
  };

  const activeLinks = useMemo(() => {
    return nodes.filter(n => n.parentId).map(n => ({ source: n.parentId, target: n.id }));
  }, [nodes]);

  const toggleSelectNode = (id) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, isSelected: !n.isSelected } : n));
  };

  const handleNodePointerDown = (e, node) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
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
      
      if (!wasMoved && !wasLongPressed) {
        if (!node.isExpanded) expandNode(node.id, node.text, 'default');
      }
    }
  };

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
      setError(`创意生成失败: ${err.message}`);
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

  // ========== 🚀 终极防超时串行收敛逻辑 (通过豆包大模型拉取资讯) ==========
  const handleRunConvergence = async () => {
    if (!convergenceGoal.trim()) return;
    
    setError(null);
    setGeneratedConvergence('');
    setConvergencePrompt('');
    setConvergenceNews(null);

    const selectedNodes = nodes.filter(n => n.isSelected);
    const targetNodes = selectedNodes.length > 0 ? selectedNodes : nodes;
    
    // ⚠️ 极其重要的字数熔断：强制最多截取 10 个词发给豆包
    const maxWords = 10;
    const allWordsStr = targetNodes.slice(0, maxWords).map(n => n.text).join('、');
    
    try {
      // 步骤 1：策略聚类 (阻塞 UI，必须等待完成)
      setConvergenceStatus({ step: 1, text: '正在提取核心策略...' });
      const strategyResult = await generateConvergence(convergenceGoal.trim(), allWordsStr);
      setGeneratedConvergence(strategyResult);
      
      // 步骤 2：生成高维提示词 (非阻塞 UI)
      setConvergenceStatus({ step: 2, text: '生成极详配图提示词...' });
      try {
        const promptResult = await generateConvergenceImagePrompt(convergenceGoal.trim(), allWordsStr);
        setConvergencePrompt(promptResult);
      } catch (promptErr) {
        console.error("提示词生成失败:", promptErr);
        setConvergencePrompt(`❌ 提示词请求中断: ${promptErr.message}`);
      }

      // 步骤 3：获取真实互联网资讯 (通过豆包模型搜索插件进行)
      setConvergenceStatus({ step: 3, text: '检索全网行业资讯...' });
      try {
        const newsResult = await fetchConvergenceNews(convergenceGoal.trim(), allWordsStr);
        setConvergenceNews(newsResult);
      } catch (newsErr) {
        console.error("资讯获取失败:", newsErr);
        setConvergenceNews({ text: `❌ 资讯获取失败: ${newsErr.message}`, sources: [], error: true });
      }

      setConvergenceStatus({ step: 4, text: '完成' });

    } catch (err) {
      setError(`收敛聚合失败: ${err.message}`);
      setConvergenceStatus({ step: 0, text: '' });
    }
  };

  const clearCanvas = () => {
    setNodes([]);
    setIsInputCenter(true);
    setError(null);
    setTransform({ x: window.innerWidth / 2, y: window.innerHeight / 2, scale: 1 });
  };

  const selectedCount = nodes.filter(n => n.isSelected).length;
  const activeNodesCount = selectedCount > 0 ? selectedCount : nodes.length;

  // 复制提示词功能
  const copyPromptToClipboard = () => {
    if (!convergencePrompt) return;
    // 提取英文提示词部分
    const englishPromptMatch = convergencePrompt.match(/<english_prompt>([\s\S]*?)<\/english_prompt>/);
    const textToCopy = englishPromptMatch ? englishPromptMatch[1].trim() : convergencePrompt;
    
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        setIsPromptCopied(true);
        setTimeout(() => setIsPromptCopied(false), 2000);
      })
      .catch(() => setError("复制失败，请手动复制"));
  };

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
      {/* 📖 左上角 TIPS 指南框 */}
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
      
      {!isInputCenter && !isTipsVisible && (
        <button 
          onClick={() => setIsTipsVisible(true)}
          className="absolute top-6 left-6 z-20 flex items-center justify-center p-3 bg-[#1a0f2e]/70 hover:bg-[#1a0f2e] backdrop-blur-xl border border-white/10 border-l-[4px] border-l-emerald-500 rounded-r-xl rounded-l-sm shadow-xl text-emerald-400 transition-all hover:scale-105"
          title="显示操作指南"
        >
          <BookOpen size={18} />
        </button>
      )}

      {/* ========================================== */}
      {/* 🎯 中央输入框 (初始状态) */}
      {/* ========================================== */}
      {isInputCenter && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 w-full max-w-2xl px-6">
          <div className="bg-[#1a0f2e]/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-[0_0_60px_rgba(0,0,0,0.5)]">
            <div className="flex justify-center mb-6">
              <Sparkles size={48} className="text-emerald-400 animate-pulse" />
            </div>
            <h1 className="text-center text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-300">
              创意脑暴可视化工具
            </h1>
            <p className="text-center text-white/60 mb-8 text-sm">
              输入核心关键词，开启AI驱动的创意发散与收敛
            </p>
            <form onSubmit={handleInitialSubmit} className="relative">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="输入核心关键词（例如：元宇宙、可持续时尚、AI营销）"
                className="w-full bg-white/5 border border-white/10 focus:border-emerald-400/50 rounded-full py-4 px-6 text-lg placeholder:text-white/30 outline-none transition-all"
              />
              <button 
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full py-2 px-6 font-bold transition-all hover:shadow-[0_0_20px_rgba(52,211,153,0.5)]"
              >
                开始发散
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 🎛️ 顶部操作栏 */}
      {/* ========================================== */}
      {!isInputCenter && (
        <div className="absolute top-6 right-6 z-30 flex items-center gap-3">
          {/* 多维发散按钮组 */}
          <div className="flex items-center gap-2 bg-[#1a0f2e]/70 backdrop-blur-xl border border-white/10 rounded-xl p-1">
            <button 
              onClick={() => handleSpecificExpand('reverse')}
              disabled={selectedCount !== 1}
              className="px-3 py-2 text-sm rounded-lg transition-all hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
              title="反差/反常识发散"
            >
              <FlipHorizontal size={14} className="text-rose-400" />
              <span>反差</span>
            </button>
            <button 
              onClick={() => handleSpecificExpand('vertical')}
              disabled={selectedCount !== 1}
              className="px-3 py-2 text-sm rounded-lg transition-all hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
              title="垂直细分发散"
            >
              <ArrowDownToLine size={14} className="text-sky-400" />
              <span>垂直</span>
            </button>
            <button 
              onClick={() => handleSpecificExpand('horizontal')}
              disabled={selectedCount !== 1}
              className="px-3 py-2 text-sm rounded-lg transition-all hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
              title="平行概念发散"
            >
              <ArrowRightToLine size={14} className="text-violet-400" />
              <span>平行</span>
            </button>
          </div>

          {/* 功能按钮组 */}
          <div className="flex items-center gap-2 bg-[#1a0f2e]/70 backdrop-blur-xl border border-white/10 rounded-xl p-1">
            <button 
              onClick={handleGenerateIdea}
              disabled={activeNodesCount === 0}
              className="px-3 py-2 text-sm rounded-lg transition-all hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
              title="生成创意文案"
            >
              <Quote size={14} className="text-amber-400" />
              <span>创意</span>
            </button>
            <button 
              onClick={handleCrossoverInsight}
              disabled={selectedCount < 2}
              className="px-3 py-2 text-sm rounded-lg transition-all hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
              title="跨界碰撞 (需选≥2个词)"
            >
              <Zap size={14} className="text-orange-400" />
              <span>跨界</span>
            </button>
            <button 
              onClick={() => setIsConvergenceModalOpen(true)}
              disabled={activeNodesCount === 0}
              className="px-3 py-2 text-sm rounded-lg transition-all hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
              title="策略收敛"
            >
              <Target size={14} className="text-blue-400" />
              <span>收敛</span>
            </button>
            <button 
              onClick={clearCanvas}
              className="px-3 py-2 text-sm rounded-lg transition-all hover:bg-white/10 flex items-center gap-1.5 text-red-400/80 hover:text-red-400"
              title="清空画布"
            >
              <Trash2 size={14} />
              <span>清空</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 🎭 创意生成弹窗 */}
      {/* ========================================== */}
      {isIdeaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1a0f2e]/95 border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-emerald-400 flex items-center gap-2">
                <Quote size={20} /> 创意文案生成
              </h3>
              <button onClick={() => setIsIdeaModalOpen(false)} className="text-white/40 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="border-t border-white/10 pt-4">
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 size={32} className="text-emerald-400 animate-spin mb-4" />
                  <p className="text-white/60">AI 正在激发创意...</p>
                </div>
              ) : (
                <div className="bg-white/5 rounded-xl p-4 text-white/90 min-h-[150px] whitespace-pre-line">
                  {generatedIdea || "暂无内容"}
                </div>
              )}
            </div>
            <div className="flex justify-end mt-4">
              <button 
                onClick={() => setIsIdeaModalOpen(false)}
                className="px-4 py-2 bg-emerald-500/80 hover:bg-emerald-500 rounded-lg transition-all"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* ⚡ 跨界碰撞弹窗 */}
      {/* ========================================== */}
      {isInsightModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1a0f2e]/95 border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-orange-400 flex items-center gap-2">
                <Zap size={20} /> 跨界创意碰撞
              </h3>
              <button onClick={() => setIsInsightModalOpen(false)} className="text-white/40 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="border-t border-white/10 pt-4">
              {isGeneratingInsight ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 size={32} className="text-orange-400 animate-spin mb-4" />
                  <p className="text-white/60">AI 正在跨界碰撞...</p>
                </div>
              ) : (
                <div className="bg-white/5 rounded-xl p-4 text-white/90 min-h-[150px] whitespace-pre-line">
                  {generatedInsight || "暂无内容"}
                </div>
              )}
            </div>
            <div className="flex justify-end mt-4">
              <button 
                onClick={() => setIsInsightModalOpen(false)}
                className="px-4 py-2 bg-orange-500/80 hover:bg-orange-500 rounded-lg transition-all"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 🎯 策略收敛弹窗 */}
      {/* ========================================== */}
      {isConvergenceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#1a0f2e]/95 border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-auto shadow-2xl">
            <div className="sticky top-0 bg-[#1a0f2e]/95 backdrop-blur-xl border-b border-white/10 p-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xl font-bold text-blue-400 flex items-center gap-2">
                  <Target size={20} /> 策略收敛聚合
                </h3>
                <button onClick={() => setIsConvergenceModalOpen(false)} className="text-white/40 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={convergenceGoal}
                  onChange={(e) => setConvergenceGoal(e.target.value)}
                  placeholder="输入收敛目标（例如：打造爆款短视频、设计创新产品）"
                  className="flex-1 bg-white/5 border border-white/10 focus:border-blue-400/50 rounded-lg py-2 px-4 text-sm placeholder:text-white/30 outline-none transition-all"
                />
                <button 
                  onClick={handleRunConvergence}
                  disabled={!convergenceGoal.trim()}
                  className="px-4 py-2 bg-blue-500/80 hover:bg-blue-500 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {convergenceStatus.step > 0 ? (
                    <>
                      <Loader2 size={16} className={`animate-spin ${convergenceStatus.step === 4 ? 'hidden' : ''}`} />
                      <span>{convergenceStatus.text}</span>
                    </>
                  ) : (
                    <span>开始收敛</span>
                  )}
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* 策略聚类结果 */}
              {generatedConvergence && (
                <div className="space-y-2">
                  <h4 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
                    <Info size={18} /> 核心策略聚类
                  </h4>
                  <div className="bg-white/5 rounded-xl p-4 text-white/90 whitespace-pre-line">
                    {generatedConvergence}
                  </div>
                </div>
              )}

              {/* AI绘画提示词 */}
              {convergencePrompt && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-amber-400 flex items-center gap-2">
                      <ImageIcon size={18} /> 高维配图提示词
                    </h4>
                    <button 
                      onClick={copyPromptToClipboard}
                      className="text-sm flex items-center gap-1.5 text-white/70 hover:text-white transition-colors"
                    >
                      {isPromptCopied ? (
                        <><Check size={14} /> 已复制</>
                      ) : (
                        <><Copy size={14} /> 复制英文</>
                      )}
                    </button>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 text-white/90 whitespace-pre-line max-h-[300px] overflow-auto">
                    {convergencePrompt}
                  </div>
                </div>
              )}

              {/* 行业资讯 */}
              {convergenceNews && (
                <div className="space-y-2">
                  <h4 className="text-lg font-semibold text-sky-400 flex items-center gap-2">
                    <BookOpen size={18} /> 行业最新资讯
                  </h4>
                  <div className={`bg-white/5 rounded-xl p-4 text-white/90 whitespace-pre-line ${convergenceNews.error ? 'text-red-400/80' : ''}`}>
                    {convergenceNews.text}
                  </div>
                </div>
              )}

              {/* 空状态 */}
              {!generatedConvergence && !convergencePrompt && !convergenceNews && convergenceStatus.step === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-white/40">
                  <Target size={48} className="mb-4 opacity-50" />
                  <p>输入收敛目标并点击"开始收敛"，AI将为您：</p>
                  <ul className="mt-2 text-sm list-disc list-inside text-center">
                    <li>提取核心策略并聚类</li>
                    <li>生成高维度AI绘画提示词</li>
                    <li>检索全网最新行业资讯</li>
                  </ul>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-[#1a0f2e]/95 backdrop-blur-xl border-t border-white/10 p-4 flex justify-end">
              <button 
                onClick={() => setIsConvergenceModalOpen(false)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 🖱️ 右下角全屏按钮 */}
      {/* ========================================== */}
      {!isInputCenter && (
        <button
          onClick={() => {
            if (document.fullscreenElement) {
              document.exitFullscreen();
            } else {
              document.documentElement.requestFullscreen();
            }
          }}
          className="absolute bottom-6 right-6 z-30 p-3 bg-[#1a0f2e]/70 backdrop-blur-xl border border-white/10 rounded-full shadow-xl text-white/80 hover:text-white hover:bg-[#1a0f2e] transition-all"
          title="全屏/退出全屏"
        >
          <Maximize size={20} />
        </button>
      )}
    </div>
  );
}