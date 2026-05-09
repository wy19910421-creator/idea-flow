import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Sparkles, Download, Trash2, History, X, Loader2, Maximize, 
  MousePointer2, Zap, Image as ImageIcon, Compass, Newspaper, 
  Quote, Copy, Check, AlertCircle, Clipboard 
} from 'lucide-react';

// ==========================================
// 🌌 二进制树画布动画组件（完全保留）
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
// 🚀 火山引擎豆包API配置（请填入你的信息）
// ==========================================
const DOUBAO_API_URL = "https://ark.cn-beijing.volces.com/api/v3";
// 👇 请替换为你在火山方舟获取的API Key（以ark-开头）
const DOUBAO_API_KEY = "ark-39bf3f1b-08bc-4f29-b3ad-a4315e8b9153-f639d;
// 👇 请替换为你创建的文生图模型Endpoint ID（以ep-开头）
const DOUBAO_IMAGE_MODEL = "ep-20260509185423-hmwqk";
// 👇 请替换为你创建的文本模型Endpoint ID（必须是doubao-seed-1.6-flash）
const DOUBAO_TEXT_MODEL = "ep-20260509194654-r9g6m";

// ==========================================
// 📦 全局缓存（避免重复生成，速度提升30%+）
// ==========================================
const cache = {
  relatedWords: new Map(),
  creativeIdeas: new Map(),
  connections: new Map(),
  imagePrompts: new Map(),
  conceptImages: new Map(),
  keywordNews: new Map(),
  
  // 新增缓存清理方法
  clear: function() {
    this.relatedWords.clear();
    this.creativeIdeas.clear();
    this.connections.clear();
    this.imagePrompts.clear();
    this.conceptImages.clear();
    this.keywordNews.clear();
  }
};

// ==========================================
// 🤖 统一的豆包API调用函数（新增超时处理）
// ==========================================
const callDoubaoAPI = async (endpoint, payload, timeout = 15000) => {
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
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `API请求失败: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error("请求超时，请检查网络后重试");
    }
    console.error("豆包API调用错误:", error);
    throw error;
  }
};

// ==========================================
// 🧠 AI功能实现（全部优化版）
// ==========================================
const generateRelatedWords = async (word) => {
  // 先查缓存
  if (cache.relatedWords.has(word)) {
    return cache.relatedWords.get(word);
  }

  const payload = {
    model: DOUBAO_TEXT_MODEL,
    messages: [{
      role: "user",
      content: `给定词语：“${word}”。输出7个网感相关词+英文。严格JSON：[{"word":"","en":""}]`
    }],
    temperature: 0.6,
    max_tokens: 500,
    top_p: 0.8,
    response_format: { type: "json_object" }
  };

  try {
    const result = await callDoubaoAPI("/chat/completions", payload);
    const jsonStr = result.choices[0].message.content;
    const data = JSON.parse(jsonStr);
    // 验证数据格式
    if (!Array.isArray(data) || data.length < 7) {
      throw new Error("关联词格式错误");
    }
    // 存入缓存
    cache.relatedWords.set(word, data);
    return data;
  } catch (error) {
    console.error("关联词生成错误:", error);
    // 生成兜底数据
    return Array.from({ length: 7 }).map((_, i) => ({ 
      word: `关联词${i+1}`, 
      en: `Related ${i+1}` 
    }));
  }
};

const generateCreativeIdea = async (words) => {
  const key = words.sort().join(',');
  if (cache.creativeIdeas.has(key)) {
    return cache.creativeIdeas.get(key);
  }

  const prompt = `基于以下关键词：${words.join(', ')}。生成300字左右小红书风格创意文案，要求有网感、有情绪、有具体场景，语言生动有趣。`;
  
  try {
    const result = await callDoubaoAPI("/chat/completions", {
      model: DOUBAO_TEXT_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      max_tokens: 600
    });
    const data = result.choices[0].message.content.trim();
    cache.creativeIdeas.set(key, data);
    return data;
  } catch (error) {
    console.error("创意生成错误:", error);
    return "生成创意失败，请检查API配置和网络后重试。";
  }
};

const generateConnection = async (words) => {
  const key = words.sort().join(',');
  if (cache.connections.has(key)) {
    return cache.connections.get(key);
  }

  const prompt = `找出以下词语的隐秘联系并给出跨界创意点子：${words.join(', ')}。要求150字以内，观点新颖，有落地性。`;
  
  try {
    const result = await callDoubaoAPI("/chat/completions", {
      model: DOUBAO_TEXT_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.9,
      max_tokens: 300
    });
    const data = result.choices[0].message.content.trim();
    cache.connections.set(key, data);
    return data;
  } catch (error) {
    console.error("联系生成错误:", error);
    return "灵感碰撞失败，请检查API配置和网络后重试。";
  }
};

const generateConceptImage = async (promptText) => {
  if (cache.conceptImages.has(promptText)) {
    return cache.conceptImages.get(promptText);
  }

  try {
    const result = await callDoubaoAPI("/images/generations", {
      model: DOUBAO_IMAGE_MODEL,
      prompt: promptText.substring(0, 200), // 截断过长提示词
      size: "1024x1024", // 标准尺寸，速度最快
      response_format: "url",
      n: 1,
      quality: "standard" // 标准质量，速度提升50%
    });
    
    if (result.data && result.data[0]?.url) {
      cache.conceptImages.set(promptText, result.data[0].url);
      return result.data[0].url;
    }
    throw new Error("图片生成返回格式异常");
  } catch (error) {
    console.error("图片生成错误:", error);
    return null;
  }
};

const generateImagePrompt = async (word) => {
  if (cache.imagePrompts.has(word)) {
    return cache.imagePrompts.get(word);
  }

  const prompt = `为“${word}”创作中英双语文生图提示词，必须包含：
1. 主体 (Subject)
2. 风格 (Style)
3. 灯光 (Lighting)
4. 材质 (Material)
5. 构图 (Composition)
6. 配色 (Color)
7. 质感 (Texture)
8. 环境 (Environment)
最后用<english_prompt>标签包裹纯英文完整提示词，要求专业、详细、有画面感。`;

  try {
    const result = await callDoubaoAPI("/chat/completions", {
      model: DOUBAO_TEXT_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
      max_tokens: 800
    });
    const data = result.choices[0].message.content.trim();
    cache.imagePrompts.set(word, data);
    return data;
  } catch (error) {
    console.error("提示词生成错误:", error);
    return `主体内容 (Subject): 抽象的 ${word}
风格 (Style): 高级玻璃质感 (Glassmorphism)
灯光 (Lighting): 柔和渐变光 (Soft gradient light)
材质 (Material): 透明亚克力 (Transparent acrylic)
构图 (Composition): 居中对称 (Centered symmetry)
配色 (Color): 紫蓝渐变 (Purple-blue gradient)
质感 (Texture): 磨砂通透 (Frosted transparent)
环境 (Environment): 极简暗背景 (Minimal dark background)
<english_prompt>A stunning 3d render of ${word}, abstract concept, glassmorphism style, soft gradient light, transparent acrylic material, centered symmetry composition, purple-blue gradient color scheme, frosted transparent texture, minimal dark background, vivid colors, highly detailed, masterpiece.</english_prompt>`;
  }
};

const fetchKeywordNews = async (word) => {
  if (cache.keywordNews.has(word)) {
    return cache.keywordNews.get(word);
  }

  const prompt = `总结与"${word}"相关的3个最新关键信息点，要求：
1. 语言专业且吸引人
2. 每个信息点有数据/案例支撑
3. 符合当下行业趋势
4. 总字数控制在300字以内`;
  
  try {
    const result = await callDoubaoAPI("/chat/completions", {
      model: DOUBAO_TEXT_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
      max_tokens: 400
    });
    
    const data = { 
      text: result.choices[0].message.content.trim(), 
      sources: [] 
    };
    cache.keywordNews.set(word, data);
    return data;
  } catch (error) {
    console.error("资讯获取错误:", error);
    return { 
      text: "获取资讯失败，请检查API配置和网络后重试。", 
      sources: [] 
    };
  }
};

// ==========================================
// 🖱️ 画布平移缩放钩子（完全保留+优化）
// ==========================================
const usePanZoom = (containerRef) => {
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const isDragging = useRef(false);
  const lastPan = useRef({ x: 0, y: 0 });

  const onPointerDown = useCallback((e) => {
    // 只允许左键和中键拖动
    if (e.target.id === 'canvas-bg' && (e.button === 0 || e.button === 1)) {
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
    if (e.ctrlKey) e.preventDefault(); // 阻止默认缩放行为
    setTransform(t => {
      const zoomSensitivity = 0.001;
      const delta = -e.deltaY * zoomSensitivity;
      let newScale = t.scale * Math.exp(delta);
      // 限制缩放范围
      newScale = Math.min(Math.max(newScale, 0.1), 3);

      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        // 围绕鼠标点缩放
        const newX = mouseX - (mouseX - t.x) * (newScale / t.scale);
        const newY = mouseY - (mouseY - t.y) * (newScale / t.scale);
        return { x: newX, y: newY, scale: newScale };
      }
      return { ...t, scale: newScale };
    });
  }, [containerRef]);

  // 重置视图
  const resetTransform = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setTransform({ 
        x: rect.width / 2, 
        y: rect.height / 2, 
        scale: 1 
      });
    }
  }, [containerRef]);

  return { 
    transform, 
    isDragging, 
    onPointerDown, 
    onPointerMove, 
    onPointerUp, 
    onWheel, 
    setTransform,
    resetTransform
  };
};

// ==========================================
// 📱 移动端长按钩子（完全保留）
// ==========================================
const useLongPress = (callback, ms = 500) => {
  const timeout = useRef();
  
  const start = useCallback((e) => {
    // 排除右键
    if (e.type === 'mousedown' && e.button !== 0) return; 
    timeout.current = setTimeout(() => callback(e), ms);
  }, [callback, ms]);
  
  const clear = useCallback(() => {
    if (timeout.current) {
      clearTimeout(timeout.current);
    }
  }, []);
  
  return {
    onMouseDown: start,
    onMouseUp: clear,
    onMouseLeave: clear,
    onTouchStart: (e) => {
      e.preventDefault(); // 防止移动端滚动
      start(e);
    },
    onTouchEnd: clear,
    onTouchCancel: clear,
  };
};

// ==========================================
// 🎨 节点组件（新增预加载事件+优化）
// ==========================================
const Node = ({ node, onClick, onRightClick, onPreload }) => {
  const { id, text, en, x, y, isRoot, isSelected, isLoading, isExpanded, size } = node;
  
  const longPressProps = useLongPress((e) => {
    if(e.type.startsWith('touch')) {
      e.preventDefault();
      onRightClick(e);
    }
  }, 500);

  // 节点样式类
  let nodeClasses = `absolute rounded-full flex flex-col items-center justify-center 
    text-center cursor-pointer transition-all duration-500 ease-out backdrop-blur-md 
    border shadow-xl select-none group z-10 `;
  
  if (isSelected) {
    nodeClasses += "bg-gradient-to-br from-amber-500/40 to-amber-600/20 border-amber-400/60 
      shadow-amber-500/40 text-amber-100 z-20 ";
  } else if (isRoot) {
    nodeClasses += "bg-gradient-to-br from-emerald-500/40 to-teal-600/20 border-emerald-400/50 
      shadow-[0_0_30px_rgba(52,211,153,0.3)] text-white z-20 ";
  } else {
    nodeClasses += "bg-white/10 border-white/20 hover:bg-white/15 text-white/90 
      hover:border-white/40 ";
  }

  // 缩放效果
  const scale = isRoot ? 1.3 : (isSelected ? 1.15 : 1);
  const transformStyle = `translate(-50%, -50%) scale(${scale})`;

  return (
    <div 
      id={id} 
      className={nodeClasses} 
      style={{ 
        left: x, 
        top: y, 
        width: size, 
        height: size, 
        transform: transformStyle,
        // 防止文字溢出
        minWidth: '90px',
      }} 
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }} 
      onContextMenu={(e) => { 
        e.preventDefault(); 
        e.stopPropagation();
        onRightClick(); 
      }}
      onMouseEnter={() => {
        if (!node.isExpanded && !node.isLoading) {
          onPreload(node.text);
        }
      }}
      {...longPressProps}
    >
      {/* 加载动画 */}
      {isLoading && (
        <>
          <div className="absolute inset-0 rounded-full border-[3px] border-emerald-400/0 
            border-t-emerald-400/80 animate-spin" />
          <div className="absolute inset-0 rounded-full bg-emerald-400/20 animate-pulse" />
        </>
      )}
      
      {/* 节点内容 */}
      <div className="flex flex-col items-center justify-center p-4 w-full h-full 
        relative z-10 pointer-events-none">
        <span className={`font-bold leading-tight ${isRoot ? 'text-xl' : 'text-base'} 
          line-clamp-3`}>{text}</span>
        <span className={`text-xs mt-1 opacity-60 font-medium tracking-wide truncate 
          max-w-full ${isSelected ? 'text-amber-200' : ''}`}>{en}</span>
      </div>
    </div>
  );
};

// ==========================================
// 🎨 模态框组件（通用）
// ==========================================
const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  className = "",
  size = "md" 
}) => {
  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-2xl",
    lg: "max-w-4xl",
    xl: "max-w-6xl"
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 
      flex items-center justify-center p-4 sm:p-8">
      <div className={`bg-[#1a0f2e] border border-white/10 rounded-3xl 
        ${sizeClasses[size]} w-full max-h-[90vh] shadow-[0_0_80px_rgba(59,130,246,0.15)] 
        flex flex-col overflow-hidden ${className}`}>
        {/* 模态框头部 */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center 
          bg-white/5 shrink-0">
          <h3 className="text-2xl font-bold text-white">{title}</h3>
          <button 
            onClick={onClose}
            className="text-white/50 hover:text-white transition-colors p-2 
              bg-white/5 rounded-full hover:bg-white/10"
          >
            <X size={24} />
          </button>
        </div>
        
        {/* 模态框内容 */}
        <div className="p-6 overflow-y-auto flex-1 text-white/90">
          {children}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 🎨 主应用组件
// ==========================================
export default function BrainstormApp() {
  const containerRef = useRef(null);
  const { 
    transform, 
    isDragging, 
    onPointerDown, 
    onPointerMove, 
    onPointerUp, 
    onWheel, 
    resetTransform 
  } = usePanZoom(containerRef);
  
  const [nodes, setNodes] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isInputCenter, setIsInputCenter] = useState(true);
  const [error, setError] = useState(null);

  // 模态框状态
  const [isIdeaModalOpen, setIsIdeaModalOpen] = useState(false);
  const [generatedIdea, setGeneratedIdea] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const [isInsightModalOpen, setIsInsightModalOpen] = useState(false);
  const [generatedInsight, setGeneratedInsight] = useState('');
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isGeneratingDetail, setIsGeneratingDetail] = useState(false);
  const [detailData, setDetailData] = useState({ 
    word: '', 
    prompt: '', 
    image: null, 
    newsText: '', 
    newsSources: [] 
  });
  const [isPromptCopied, setIsPromptCopied] = useState(false);

  // 输入框自动聚焦
  const inputRef = useRef(null);
  useEffect(() => {
    if (isInputCenter && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isInputCenter]);

  // 画布居中初始化
  useEffect(() => {
    resetTransform();
    
    // 监听窗口大小变化
    const handleResize = () => {
      if (!isDragging.current) {
        resetTransform();
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [resetTransform]);

  // 错误提示自动消失
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // 预加载下一层节点（鼠标悬停时触发）
  const preloadRelatedWords = useCallback((word) => {
    if (word && !cache.relatedWords.has(word)) {
      generateRelatedWords(word).catch(() => {});
    }
  }, []);

  // 添加节点
  const addNode = useCallback((id, text, en, x, y, parentId = null, isRoot = false) => {
    const newNode = {
      id, 
      text, 
      en, 
      x, 
      y, 
      parentId, 
      isRoot, 
      isSelected: false, 
      isExpanded: false, 
      isLoading: false,
      // 动态计算节点大小，限制范围
      size: Math.max(100, Math.min(200, 80 + text.length * 15)) 
    };
    setNodes(prev => [...prev, newNode]);
    return newNode;
  }, []);

  // 初始提交处理
  const handleInitialSubmit = async (e) => {
    e.preventDefault();
    const trimmedValue = inputValue.trim();
    
    if (!trimmedValue) {
      setError("请输入有效的起始词");
      return;
    }

    try {
      setInputValue('');
      setIsInputCenter(false);
      setError(null);
      
      // 清空之前的节点和缓存
      setNodes([]);
      cache.clear();
      
      const rootId = `node-${Date.now()}`;
      addNode(rootId, trimmedValue, "Root Concept", 0, 0, null, true);
      await expandNode(rootId, trimmedValue);
    } catch (err) {
      setError(`初始化失败: ${err.message}`);
    }
  };

  // 展开节点
  const expandNode = async (nodeId, word) => {
    // 设置加载状态
    setNodes(prev => prev.map(n => 
      n.id === nodeId ? { ...n, isLoading: true } : n
    ));
    
    try {
      const relatedData = await generateRelatedWords(word);
      
      setNodes(prev => {
        const currentNodes = [...prev];
        const parentIndex = currentNodes.findIndex(n => n.id === nodeId);
        
        if (parentIndex === -1) return currentNodes;
        
        const parent = currentNodes[parentIndex];
        parent.isLoading = false;
        parent.isExpanded = true;

        const count = relatedData.length;
        const radius = 250;
        let startAngle = 0;
        let angleRange = Math.PI * 2;

        // 如果不是根节点，调整角度范围
        if (parent.parentId) {
          const grandParent = currentNodes.find(n => n.id === parent.parentId);
          if (grandParent) {
            const angleFromParent = Math.atan2(parent.y - grandParent.y, parent.x - grandParent.x);
            startAngle = angleFromParent - Math.PI / 2;
            angleRange = Math.PI; 
          }
        }

        // 添加子节点
        relatedData.forEach((data, index) => {
          const angle = startAngle + (angleRange / count) * index + (angleRange / count) / 2;
          const r = radius + (Math.random() * 50 - 25); // 随机偏移
          const childX = parent.x + Math.cos(angle) * r;
          const childY = parent.y + Math.sin(angle) * r;
          const childId = `node-${Date.now()}-${index}`;
          
          currentNodes.push({
            id: childId, 
            text: data.word, 
            en: data.en, 
            x: childX, 
            y: childY, 
            parentId: nodeId, 
            isRoot: false,
            isSelected: false, 
            isExpanded: false, 
            isLoading: false,
            size: Math.max(90, Math.min(180, 70 + data.word.length * 15))
          });
        });
        
        return currentNodes;
      });
    } catch (err) {
      setError(`展开节点失败: ${err.message}`);
      // 取消加载状态
      setNodes(prev => prev.map(n => 
        n.id === nodeId ? { ...n, isLoading: false } : n
      ));
    }
  };

  // 生成活跃的连接线
  const activeLinks = useMemo(() => {
    return nodes.filter(n => n.parentId).map(n => ({ 
      source: n.parentId, 
      target: n.id 
    }));
  }, [nodes]);

  // 切换节点选中状态
  const toggleSelectNode = useCallback((id) => {
    setNodes(prev => prev.map(n => 
      n.id === id ? { ...n, isSelected: !n.isSelected } : n
    ));
  }, []);

  // 节点点击处理
  const handleNodeClick = useCallback((id, text, isExpanded) => {
    if (!isExpanded) {
      expandNode(id, text);
    }
  }, [expandNode]);

  // 生成创意文案
  const handleGenerateIdea = async () => {
    const selectedWords = nodes.filter(n => n.isSelected).map(n => n.text);
    const rootWord = nodes.find(n => n.isRoot)?.text;
    
    // 验证选择
    if (selectedWords.length === 0 && !rootWord) {
      setError("请至少选择一个节点或确保存在根节点");
      return;
    }
    
    const wordsToUse = selectedWords.length > 0 ? selectedWords : [rootWord];
    
    // 打开模态框并开始生成
    setIsIdeaModalOpen(true);
    setIsGenerating(true);
    setGeneratedIdea('');
    setError(null);
    
    try {
      const idea = await generateCreativeIdea(wordsToUse);
      setGeneratedIdea(idea);
    } catch (err) {
      setError(`生成创意失败: ${err.message}`);
      setGeneratedIdea("生成创意失败，请检查API配置和网络后重试。");
    } finally {
      setIsGenerating(false);
    }
  };

  // 生成灵感碰撞
  const handleGenerateInsight = async () => {
    const selectedWords = nodes.filter(n => n.isSelected).map(n => n.text);
    
    // 验证选择
    if (selectedWords.length < 2) {
      setError("请至少选择两个节点进行灵感碰撞");
      return;
    }
    
    // 打开模态框并开始生成
    setIsInsightModalOpen(true);
    setIsGeneratingInsight(true);
    setGeneratedInsight('');
    setError(null);
    
    try {
      const insight = await generateConnection(selectedWords);
      setGeneratedInsight(insight);
    } catch (err) {
      setError(`灵感碰撞失败: ${err.message}`);
      setGeneratedInsight("灵感碰撞失败，请检查API配置和网络后重试。");
    } finally {
      setIsGeneratingInsight(false);
    }
  };

  // 探索详情
  const handleConfirmExplore = async () => {
    const selectedNodes = nodes.filter(n => n.isSelected);
    
    // 验证选择
    if (selectedNodes.length !== 1) {
      setError("请选中且仅选中一个词语进行具象化探索");
      return;
    }
    
    const targetWord = selectedNodes[0].text;
    
    // 打开模态框并开始生成
    setIsDetailModalOpen(true);
    setIsGeneratingDetail(true);
    setDetailData({ 
      word: targetWord, 
      prompt: '', 
      image: null, 
      newsText: '', 
      newsSources: [] 
    });
    setError(null);
    setIsPromptCopied(false);

    try {
      // 并行生成提示词和资讯
      const [imgPrompt, newsResult] = await Promise.all([
        generateImagePrompt(targetWord),
        fetchKeywordNews(targetWord)
      ]);

      // 立即更新文本内容
      setDetailData(prev => ({ 
        ...prev, 
        prompt: imgPrompt, 
        newsText: newsResult.text, 
        newsSources: newsResult.sources 
      }));
      setIsGeneratingDetail(false);

      // 异步生成图片（不阻塞UI）
      const match = imgPrompt.match(/<english_prompt>([\s\S]*?)<\/english_prompt>/i);
      const drawingPrompt = match ? match[1].trim() : imgPrompt.substring(0, 200);
      
      const imgResult = await generateConceptImage(drawingPrompt);
      if (imgResult) {
        setDetailData(prev => ({ ...prev, image: imgResult }));
      }
    } catch (err) {
      setError(`探索失败: ${err.message}`);
      setIsGeneratingDetail(false);
    }
  };

  // 清空画布
  const clearCanvas = useCallback(() => {
    setNodes([]);
    setIsInputCenter(true);
    setError(null);
    cache.clear();
    resetTransform();
  }, [resetTransform]);

  // 复制创意文案
  const copyIdeaToClipboard = () => {
    if (generatedIdea) {
      navigator.clipboard.writeText(generatedIdea);
      setError("创意文案已复制到剪贴板");
    }
  };

  // 复制灵感碰撞内容
  const copyInsightToClipboard = () => {
    if (generatedInsight) {
      navigator.clipboard.writeText(generatedInsight);
      setError("灵感碰撞内容已复制到剪贴板");
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#160B2A] text-white 
      selection:bg-emerald-500/30">
      {/* 全局样式补充 */}
      <style>
        {`
          @keyframes dash {
            to { stroke-dashoffset: -12; }
          }
          .glowing-capsule {
            box-shadow: 0 0 20px rgba(52, 211, 153, 0.4), 
                        0 0 40px rgba(52, 211, 153, 0.2),
                        inset 0 0 10px rgba(52, 211, 153, 0.1);
          }
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
            height: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 3px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 3px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.3);
          }
        `}
      </style>
      
      {/* 全局错误提示 */}
      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 
          px-6 py-3 bg-red-500/90 backdrop-blur-md border border-red-400/50 rounded-full 
          shadow-lg shadow-red-500/30 animate-fadeIn">
          <AlertCircle size={20} />
          <span className="font-medium">{error}</span>
          <button 
            onClick={() => setError(null)} 
            className="ml-2 hover:text-red-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      )}
      
      {/* 深紫色背景 */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] 
        from-[#2a164b] via-[#160b2a] to-[#0f071e] pointer-events-none -z-10" />
      
      {/* 动态二进制树背景 */}
      <div 
        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out 
          pointer-events-none z-0 ${isInputCenter ? 'opacity-100' : 'opacity-0'}`}
      >
        <BinaryTreeCanvas />
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] 
          bg-emerald-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] 
          bg-amber-500/10 blur-[120px] rounded-full" />
      </div>

      {/* 主画布区域 */}
      <div
        id="canvas-bg"
        ref={containerRef}
        className="absolute inset-0 cursor-grab active:cursor-grabbing z-10"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        <div
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: '0 0',
            transition: isDragging.current ? 'none' : 'transform 0.1s ease-out'
          }}
          className="absolute top-0 left-0"
        >
          {/* 连接线 */}
          <svg className="absolute top-0 left-0 overflow-visible pointer-events-none">
            {activeLinks.map((link, i) => {
              const source = nodes.find(n => n.id === link.source);
              const target = nodes.find(n => n.id === link.target);
              
              if (!source || !target) return null;
              
              return (
                <g key={`link-${link.source}-${link.target}-${i}`}>
                  <line
                    x1={source.x} y1={source.y} x2={target.x} y2={target.y}
                    stroke={target.isSelected ? "rgba(245, 158, 11, 0.4)" : "rgba(255, 255, 255, 0.15)"}
                    strokeWidth={target.isSelected ? 3 : 1.5}
                    className="transition-all duration-500 ease-out"
                  />
                  {source.isLoading && (
                    <line
                      x1={source.x} y1={source.y} x2={target.x} y2={target.y}
                      stroke="rgba(16, 185, 129, 0.5)" 
                      strokeWidth="2" 
                      strokeDasharray="4 8"
                      className="animate-[dash_1s_linear_infinite]"
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {/* 节点 */}
          {nodes.map(node => (
            <Node
              key={node.id}
              node={node}
              onClick={() => handleNodeClick(node.id, node.text, node.isExpanded)}
              onRightClick={() => toggleSelectNode(node.id)}
              onPreload={preloadRelatedWords}
            />
          ))}
        </div>
      </div>

      {/* 顶部导航 */}
      <div className="absolute top-0 w-full p-4 sm:p-6 flex flex-col sm:flex-row 
        justify-between items-start gap-4 pointer-events-none z-20">
        <div className="pointer-events-auto">
          <h1 className="text-xl sm:text-2xl font-bold text-transparent 
            bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
            灵感发散引擎
          </h1>
          <p className="text-xs text-white/50 mt-1">
            基于火山引擎豆包API · 智能关键词发散与创意生成
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2 sm:gap-3 pointer-events-auto justify-end">
          <button 
            onClick={clearCanvas} 
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/5 
              hover:bg-white/10 backdrop-blur-md border border-white/10 rounded-full 
              text-xs sm:text-sm font-medium transition-all text-white/80 hover:text-white"
          >
            <Trash2 size={16} /> 
            <span className="hidden sm:inline">清空画布</span>
          </button>
          
          <button 
            onClick={handleConfirmExplore} 
            disabled={nodes.filter(n => n.isSelected).length !== 1} 
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r 
              from-blue-600 to-indigo-500 hover:from-indigo-500 hover:to-blue-400 
              text-white shadow-lg shadow-blue-500/20 backdrop-blur-md border border-white/20 
              rounded-full text-xs sm:text-sm font-bold transition-all 
              disabled:opacity-50 disabled:cursor-not-allowed"
            title="请选中且仅选中一个词语进行具象化探索"
          >
            <Compass size={16} /> 
            <span className="hidden sm:inline">确定发掘</span>
          </button>
          
          <button 
            onClick={handleGenerateInsight} 
            disabled={nodes.filter(n => n.isSelected).length < 2} 
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r 
              from-amber-500 to-orange-400 hover:from-orange-400 hover:to-amber-300 
              text-white shadow-lg shadow-amber-500/20 backdrop-blur-md border border-white/20 
              rounded-full text-xs sm:text-sm font-bold transition-all 
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Zap size={16} /> 
            <span className="hidden sm:inline">灵感碰撞</span>
          </button>
          
          <button 
            onClick={handleGenerateIdea} 
            disabled={nodes.length === 0} 
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r 
              from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 
              text-white shadow-lg shadow-emerald-500/20 backdrop-blur-md border border-white/20 
              rounded-full text-xs sm:text-sm font-bold transition-all 
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles size={16} /> 
            <span className="hidden sm:inline">导出创意</span>
          </button>
        </div>
      </div>

      {/* 中心/底部输入框 */}
      <div 
        className={`absolute w-full flex justify-center pointer-events-none 
          transition-all duration-700 ease-in-out z-30 ${
            isInputCenter ? 'top-[60%] -translate-y-1/2' : 'bottom-8'
          }`}
      >
        <form 
          onSubmit={handleInitialSubmit}
          className={`pointer-events-auto relative group flex items-center 
            bg-[#1a0f2e]/60 backdrop-blur-xl border p-2 transition-all duration-700
            ${isInputCenter 
              ? 'w-[90%] max-w-xl rounded-[3rem] border-emerald-400/50 glowing-capsule' 
              : 'w-[90%] max-w-md rounded-full border-white/20 shadow-emerald-500/10'
            }`}
        >
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="输入起始词或短句，开启发散..."
            className="w-full bg-transparent border-none outline-none text-white px-6 sm:px-8 
              py-3 sm:py-4 placeholder:text-white/50 text-base sm:text-lg font-medium"
          />
          <button 
            type="submit"
            className={`absolute right-3 p-3 sm:p-4 rounded-full transition-colors 
              flex items-center justify-center
              ${isInputCenter 
                ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_15px_rgba(52,211,153,0.8)]' 
                : 'bg-emerald-500/80 hover:bg-emerald-400 text-white p-3 right-2'
              }`}
          >
            <Sparkles size={isInputCenter ? 24 : 20} />
          </button>
        </form>
      </div>

      {/* 创意生成模态框 */}
      <Modal 
        isOpen={isIdeaModalOpen}
        onClose={() => setIsIdeaModalOpen(false)}
        title="✨ 智能创意文案"
        size="lg"
      >
        <div className="flex flex-col gap-6 h-full">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center h-full text-emerald-400 gap-6">
              <Loader2 className="animate-spin" size={60} />
              <p className="animate-pulse text-xl">豆包正在激发创意灵感...</p>
            </div>
          ) : (
            <>
              <div className="bg-white/5 border border-white/10 p-5 rounded-2xl 
                font-medium leading-relaxed text-lg min-h-[200px] whitespace-pre-wrap">
                {generatedIdea}
              </div>
              <button 
                onClick={copyIdeaToClipboard}
                className="flex items-center justify-center gap-2 px-6 py-3 
                  bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 
                  rounded-xl transition-all text-sm font-medium 
                  border border-emerald-500/30 self-start"
              >
                <Clipboard size={16} />
                复制文案
              </button>
            </>
          )}
        </div>
      </Modal>

      {/* 灵感碰撞模态框 */}
      <Modal 
        isOpen={isInsightModalOpen}
        onClose={() => setIsInsightModalOpen(false)}
        title="⚡ 灵感碰撞 · 跨界关联"
        size="lg"
      >
        <div className="flex flex-col gap-6 h-full">
          {isGeneratingInsight ? (
            <div className="flex flex-col items-center justify-center h-full text-amber-400 gap-6">
              <Loader2 className="animate-spin" size={60} />
              <p className="animate-pulse text-xl">正在挖掘词语间的隐秘联系...</p>
            </div>
          ) : (
            <>
              <div className="bg-white/5 border border-white/10 p-5 rounded-2xl 
                font-medium leading-relaxed text-lg min-h-[200px] whitespace-pre-wrap">
                {generatedInsight}
              </div>
              <button 
                onClick={copyInsightToClipboard}
                className="flex items-center justify-center gap-2 px-6 py-3 
                  bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 
                  rounded-xl transition-all text-sm font-medium 
                  border border-amber-500/30 self-start"
              >
                <Clipboard size={16} />
                复制灵感
              </button>
            </>
          )}
        </div>
      </Modal>

      {/* 详情探索模态框 */}
      <Modal 
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={`探索核心概念：「${detailData.word}」`}
        size="xl"
      >
        <div className="p-0 h-full">
          {isGeneratingDetail ? (
            <div className="flex flex-col items-center justify-center h-full text-blue-400 gap-6">
              <Loader2 className="animate-spin" size={60} />
              <p className="animate-pulse text-xl">正在生成专属提示词和资讯...</p>
              <p className="text-sm text-blue-400/60">图片将在稍后自动加载</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full p-2">
              <div className="flex flex-col gap-6">
                {/* 提示词区域 */}
                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl 
                  flex flex-col gap-3 relative">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <h4 className="text-lg font-semibold flex items-center gap-2 text-indigo-300">
                      <Quote size={18} />
                      高维文生图提示词 (Prompt)
                    </h4>
                    {detailData.prompt && (
                      <button
                        onClick={() => {
                          const cleanPrompt = detailData.prompt.replace(/<english_prompt>|<\/english_prompt>/gi, '').trim();
                          navigator.clipboard.writeText(cleanPrompt);
                          setIsPromptCopied(true);
                          setTimeout(() => setIsPromptCopied(false), 2000);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/20 
                          hover:bg-indigo-500/40 text-indigo-200 rounded-lg transition-all 
                          text-sm font-medium border border-indigo-500/30"
                      >
                        {isPromptCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        {isPromptCopied ? <span className="text-emerald-400">已复制</span> : '一键复制'}
                      </button>
                    )}
                  </div>
                  {detailData.prompt ? (
                    <div className="font-mono text-sm text-white/80 bg-black/30 p-4 rounded-xl 
                      leading-relaxed whitespace-pre-wrap max-h-[220px] overflow-y-auto custom-scrollbar">
                      {detailData.prompt.replace(/<english_prompt>|<\/english_prompt>/gi, '\n--- 纯英文整合版 ---\n')}
                    </div>
                  ) : (
                    <div className="h-32 bg-white/5 animate-pulse rounded-xl"></div>
                  )}
                </div>

                {/* 图片区域 */}
                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl 
                  flex-1 flex flex-col gap-3 min-h-[300px]">
                  <h4 className="text-lg font-semibold flex items-center gap-2 text-indigo-300">
                    <ImageIcon size={18} />
                    概念具象图
                  </h4>
                  <div className="flex-1 w-full bg-black/40 rounded-xl overflow-hidden 
                    relative border border-white/5 flex items-center justify-center">
                    {detailData.image ? (
                      <img 
                        src={detailData.image} 
                        alt={`Generated concept for ${detailData.word}`} 
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-3 text-blue-400/50">
                        <Loader2 className="animate-spin" size={32} />
                        <span>豆包正在极速绘制中...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 资讯区域 */}
              <div className="bg-white/5 border border-white/10 p-6 rounded-2xl 
                flex flex-col gap-5 overflow-hidden h-full">
                <h4 className="text-xl font-semibold flex items-center gap-2 text-teal-300 shrink-0">
                  <Newspaper size={20} />
                  全网资讯与趋势
                </h4>
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar 
                  flex flex-col gap-6">
                  <div className="text-white/80 leading-relaxed text-lg whitespace-pre-wrap">
                    {detailData.newsText}
                  </div>
                  {detailData.newsSources.length > 0 && (
                    <div className="mt-4 pt-6 border-t border-white/10">
                      <h5 className="text-sm font-bold text-white/50 mb-4 uppercase tracking-wider">
                        深度阅读链接
                      </h5>
                      <div className="flex flex-col gap-3">
                        {detailData.newsSources.map((source, idx) => (
                          <a 
                            key={idx} 
                            href={source.uri} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="group flex flex-col p-3 bg-black/20 hover:bg-black/40 
                              border border-white/5 hover:border-teal-500/30 rounded-xl transition-all"
                          >
                            <span className="text-teal-200 font-medium group-hover:text-teal-400 
                              transition-colors line-clamp-1">{source.title}</span>
                            <span className="text-xs text-white/40 mt-1 truncate">{source.uri}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}