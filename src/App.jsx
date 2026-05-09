import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Sparkles, Download, Trash2, History, X, Loader2, Maximize, MousePointer2, Zap, Image as ImageIcon, Compass, Newspaper, Quote, Copy, Check, AlertCircle } from 'lucide-react';

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
const DOUBAO_API_KEY = "ark-39bf3f1b-08bc-4f29-b3ad-a4315e8b9153-f639d";
// 👇 请替换为你创建的文生图模型Endpoint ID（以ep-开头）
const DOUBAO_IMAGE_MODEL = "ep-20260509185423-hmwqk";
// 👇 请替换为你创建的文本模型Endpoint ID（推荐doubao-pro-4k）
const DOUBAO_TEXT_MODEL = "ep-20260509194654-r9g6m";

// ==========================================
// 🤖 统一的豆包API调用函数
// ==========================================
const callDoubaoAPI = async (endpoint, payload) => {
  try {
    const response = await fetch(`${DOUBAO_API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DOUBAO_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `API请求失败: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("豆包API调用错误:", error);
    throw error;
  }
};

// ==========================================
// 🧠 AI功能实现（全部改用豆包）
// ==========================================
const generateRelatedWords = async (word) => {
  const payload = {
    model: DOUBAO_TEXT_MODEL,
    messages: [{
      role: "user",
      content: `你是一个专业的创意发散和头脑风暴助手。给定词语：“${word}”。请发散出7到8个具有网感、创意性强的相关词汇或短语。同时提供每个词的英文翻译。请严格按照以下JSON数组格式返回，不要包含任何其他说明文字：[{"word": "中文词", "en": "English Word"}]`
    }],
    temperature: 0.7,
    response_format: { type: "json_object" }
  };

  try {
    const result = await callDoubaoAPI("/chat/completions", payload);
    const jsonStr = result.choices[0].message.content;
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("关联词生成错误:", error);
    return Array.from({ length: 7 }).map((_, i) => ({ word: `关联词${i+1}`, en: `Related ${i+1}` }));
  }
};

const generateCreativeIdea = async (words) => {
  const prompt = `基于以下选择的关键词：${words.join(', ')}。请帮我生成一段具有“网感”、极具吸引力的创意文案或者概念策划。字数控制在200字左右，排版美观，适合小红书或社交媒体传播。`;
  
  try {
    const result = await callDoubaoAPI("/chat/completions", {
      model: DOUBAO_TEXT_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8
    });
    return result.choices[0].message.content;
  } catch (error) {
    console.error("创意生成错误:", error);
    return "生成创意失败，请检查API配置和网络后重试。";
  }
};

const generateConnection = async (words) => {
  const prompt = `作为一个跨界创意大师，请找出以下几个词语之间意想不到的、深刻的隐秘联系，并给出一个基于这些词的跨界产品或营销点子：${words.join(', ')}。请控制在150字以内，语言要具有启发性和高级感。`;
  
  try {
    const result = await callDoubaoAPI("/chat/completions", {
      model: DOUBAO_TEXT_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.9
    });
    return result.choices[0].message.content;
  } catch (error) {
    console.error("联系生成错误:", error);
    return "灵感碰撞失败，请检查API配置和网络后重试。";
  }
};

const generateConceptImage = async (promptText) => {
  try {
    const result = await callDoubaoAPI("/images/generations", {
      model: DOUBAO_IMAGE_MODEL,
      prompt: promptText,
      size: "1024x1024",
      response_format: "url",
      n: 1
    });
    
    if (result.data && result.data[0].url) {
      return result.data[0].url;
    }
    throw new Error("图片生成失败");
  } catch (error) {
    console.error("图片生成错误:", error);
    return null;
  }
};

const generateImagePrompt = async (word) => {
  const prompt = `请为概念词“${word}”创作一段极其详细的【中英双语】文生图提示词(Prompt)。

要求：
1. 必须包含以下8个维度的详细描述（每个维度都需要中英文对照）：
   - 主体内容 (Subject)
   - 风格 (Style)
   - 灯光 (Lighting)
   - 材质 (Material)
   - 构图 (Composition)
   - 配色 (Color Palette)
   - 质感 (Texture)
   - 环境 (Environment)
2. 排版要有结构感，高级且专业。
3. 在最后单独提供一段仅供机器读取的【纯英文完整 Prompt 组合】，并强制使用 <english_prompt> 和 </english_prompt> 标签将其包裹起来。`;

  try {
    const result = await callDoubaoAPI("/chat/completions", {
      model: DOUBAO_TEXT_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6
    });
    return result.choices[0].message.content.trim();
  } catch (error) {
    console.error("提示词生成错误:", error);
    return `主体内容 (Subject): 抽象的 ${word}\n风格 (Style): 高级玻璃质感 (Glassmorphism)\n<english_prompt>A stunning 3d render of ${word}, abstract concept, vivid colors, highly detailed, masterpiece.</english_prompt>`;
  }
};

const fetchKeywordNews = async (word) => {
  const prompt = `搜索与概念"${word}"相关的最新新闻、热门话题或深度见解。用中文总结3个关键信息点，语言要吸引人且专业。`;
  
  try {
    const result = await callDoubaoAPI("/chat/completions", {
      model: DOUBAO_TEXT_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5
    });
    
    return { 
      text: result.choices[0].message.content, 
      sources: [] 
    };
  } catch (error) {
    console.error("资讯获取错误:", error);
    return { text: "获取资讯失败，请检查API配置和网络后重试。", sources: [] };
  }
};

// ==========================================
// 🖱️ 画布平移缩放钩子（完全保留）
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
// 📱 移动端长按钩子（完全保留）
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
// 🎨 主应用组件
// ==========================================
export default function BrainstormApp() {
  const containerRef = useRef(null);
  const { transform, isDragging, onPointerDown, onPointerMove, onPointerUp, onWheel, setTransform } = usePanZoom(containerRef);
  
  const [nodes, setNodes] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isInputCenter, setIsInputCenter] = useState(true);
  const [error, setError] = useState(null); // 新增：全局错误状态

  // 模态框状态
  const [isIdeaModalOpen, setIsIdeaModalOpen] = useState(false);
  const [generatedIdea, setGeneratedIdea] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const [isInsightModalOpen, setIsInsightModalOpen] = useState(false);
  const [generatedInsight, setGeneratedInsight] = useState('');
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);
  const [conceptImage, setConceptImage] = useState(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isGeneratingDetail, setIsGeneratingDetail] = useState(false);
  const [detailData, setDetailData] = useState({ word: '', prompt: '', image: null, newsText: '', newsSources: [] });
  const [isPromptCopied, setIsPromptCopied] = useState(false);

  // 输入框自动聚焦
  const inputRef = useRef(null);
  useEffect(() => {
    if (isInputCenter && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isInputCenter]);

  // 画布居中
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setTransform({ x: rect.width / 2, y: rect.height / 2, scale: 1 });
    }
  }, []);

  // 新增：错误提示自动消失
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

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
    
    setNodes([]);
    
    const rootId = `node-${Date.now()}`;
    addNode(rootId, rootWord, "Root Concept", 0, 0, null, true);
    await expandNode(rootId, rootWord);
  };

  const expandNode = async (nodeId, word) => {
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, isLoading: true } : n));
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

        if (parent.parentId) {
          const grandParent = currentNodes.find(n => n.id === parent.parentId);
          if (grandParent) {
            const angleFromParent = Math.atan2(parent.y - grandParent.y, parent.x - grandParent.x);
            startAngle = angleFromParent - Math.PI / 2;
            angleRange = Math.PI; 
          }
        }

        relatedData.forEach((data, index) => {
          const angle = startAngle + (angleRange / count) * index + (angleRange / count) / 2;
          const r = radius + (Math.random() * 50 - 25); 
          const childX = parent.x + Math.cos(angle) * r;
          const childY = parent.y + Math.sin(angle) * r;
          const childId = `node-${Date.now()}-${index}`;
          
          currentNodes.push({
            id: childId, text: data.word, en: data.en, x: childX, y: childY, parentId: nodeId, isRoot: false,
            isSelected: false, isExpanded: false, isLoading: false,
            size: Math.max(90, Math.min(180, 70 + data.word.length * 15))
          });
        });
        return currentNodes;
      });
    } catch (err) {
      setError(`展开节点失败: ${err.message}`);
      setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, isLoading: false } : n));
    }
  };

  const activeLinks = useMemo(() => {
    return nodes.filter(n => n.parentId).map(n => ({ source: n.parentId, target: n.id }));
  }, [nodes]);

  const toggleSelectNode = (id) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, isSelected: !n.isSelected } : n));
  };

  const handleNodeClick = (id, text, isExpanded) => {
    if (!isExpanded) {
      expandNode(id, text);
    }
  };

  const handleGenerateIdea = async () => {
    const selectedWords = nodes.filter(n => n.isSelected).map(n => n.text);
    const rootWord = nodes.find(n => n.isRoot)?.text;
    if (selectedWords.length === 0 && !rootWord) return;
    const wordsToUse = selectedWords.length > 0 ? selectedWords : [rootWord];
    
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

  const handleGenerateInsight = async () => {
    const selectedWords = nodes.filter(n => n.isSelected).map(n => n.text);
    if (selectedWords.length < 2) return; 
    
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

  const handleConfirmExplore = async () => {
    const selectedNodes = nodes.filter(n => n.isSelected);
    if (selectedNodes.length !== 1) return;
    
    const targetWord = selectedNodes[0].text;
    setIsDetailModalOpen(true);
    setIsGeneratingDetail(true);
    setDetailData({ word: targetWord, prompt: '', image: null, newsText: '', newsSources: [] });
    setError(null);

    try {
      const promptPromise = generateImagePrompt(targetWord);
      const newsPromise = fetchKeywordNews(targetWord);
      const [imgPrompt, newsResult] = await Promise.all([promptPromise, newsPromise]);

      setDetailData(prev => ({ 
        ...prev, 
        prompt: imgPrompt, 
        newsText: newsResult.text, 
        newsSources: newsResult.sources 
      }));
      
      setIsGeneratingDetail(false); 

      const match = imgPrompt.match(/<english_prompt>([\s\S]*?)<\/english_prompt>/i);
      const drawingPrompt = match ? match[1].trim() : imgPrompt.substring(0, 300);

      const imgResult = await generateConceptImage(drawingPrompt);
      setDetailData(prev => ({ ...prev, image: imgResult }));
    } catch (err) {
      setError(`探索失败: ${err.message}`);
      setIsGeneratingDetail(false);
    }
  };

  const clearCanvas = () => {
    setNodes([]);
    setIsInputCenter(true);
    setError(null);
    setTransform({ x: window.innerWidth / 2, y: window.innerHeight / 2, scale: 1 });
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#160B2A] text-white selection:bg-emerald-500/30">
      
      {/* 全局错误提示 */}
      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-3 bg-red-500/90 backdrop-blur-md border border-red-400/50 rounded-full shadow-lg shadow-red-500/30">
          <AlertCircle size={20} />
          <span className="font-medium">{error}</span>
          <button onClick={() => setError(null)} className="ml-2 hover:text-red-200">
            <X size={18} />
          </button>
        </div>
      )}
      
      {/* 深紫色背景 */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#2a164b] via-[#160b2a] to-[#0f071e] pointer-events-none -z-10" />
      
      {/* 动态二进制树背景 */}
      <div 
        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out pointer-events-none z-0
          ${isInputCenter ? 'opacity-100' : 'opacity-0'}`}
      >
        <BinaryTreeCanvas />
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-amber-500/10 blur-[120px] rounded-full" />
      </div>

      {/* 主画布区域 */}
      <div
        id="canvas-bg"
        ref={containerRef}
        className="absolute inset-0 cursor-grab active:cursor-grabbing touch-none z-10"
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
                <g key={`${link.source}-${link.target}`}>
                  <line
                    x1={source.x} y1={source.y} x2={target.x} y2={target.y}
                    stroke={target.isSelected ? "rgba(245, 158, 11, 0.4)" : "rgba(255, 255, 255, 0.15)"}
                    strokeWidth={target.isSelected ? 3 : 1.5}
                    className="transition-all duration-500 ease-out"
                  />
                  {source.isLoading && (
                    <line
                      x1={source.x} y1={source.y} x2={target.x} y2={target.y}
                      stroke="rgba(16, 185, 129, 0.5)" strokeWidth="2" strokeDasharray="4 8"
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
              onRightClick={(e) => { e.preventDefault(); toggleSelectNode(node.id); }}
            />
          ))}
        </div>
      </div>

      {/* 顶部导航 */}
      <div className="absolute top-0 w-full p-6 flex justify-between items-start pointer-events-none z-20">
        <div></div>
        <div className="flex gap-3 pointer-events-auto">
          <button onClick={clearCanvas} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 rounded-full text-sm font-medium transition-all text-white/80 hover:text-white">
            <Trash2 size={16} /> <span className="hidden sm:inline">清空画布</span>
          </button>
          <button onClick={handleConfirmExplore} disabled={nodes.filter(n => n.isSelected).length !== 1} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-indigo-500 hover:to-blue-400 text-white shadow-lg shadow-blue-500/20 backdrop-blur-md border border-white/20 rounded-full text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed" title="请选中且仅选中一个词语进行具象化探索">
            <Compass size={16} /> <span className="hidden sm:inline">确定发掘</span>
          </button>
          <button onClick={handleGenerateInsight} disabled={nodes.filter(n => n.isSelected).length < 2} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-400 hover:from-orange-400 hover:to-amber-300 text-white shadow-lg shadow-amber-500/20 backdrop-blur-md border border-white/20 rounded-full text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            <Zap size={16} /> <span className="hidden sm:inline">灵感碰撞</span>
          </button>
          <button onClick={handleGenerateIdea} disabled={nodes.length === 0} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-white shadow-lg shadow-emerald-500/20 backdrop-blur-md border border-white/20 rounded-full text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            <Sparkles size={16} /> <span className="hidden sm:inline">导出创意</span>
          </button>
        </div>
      </div>

      {/* 中心/底部输入框 */}
      <div 
        className={`absolute w-full flex justify-center pointer-events-none transition-all duration-700 ease-in-out z-30 ${
          isInputCenter ? 'top-[60%] -translate-y-1/2' : 'bottom-8'
        }`}
      >
        <form 
          onSubmit={handleInitialSubmit}
          className={`pointer-events-auto relative group flex items-center bg-[#1a0f2e]/60 backdrop-blur-xl border p-2 transition-all duration-700
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
            className="w-full bg-transparent border-none outline-none text-white px-8 py-4 placeholder:text-white/50 text-lg font-medium"
          />
          <button 
            type="submit"
            className={`absolute right-3 p-4 rounded-full transition-colors flex items-center justify-center
              ${isInputCenter ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_15px_rgba(52,211,153,0.8)]' : 'bg-emerald-500/80 hover:bg-emerald-400 text-white p-3 right-2'}`}
          >
            <Sparkles size={isInputCenter ? 24 : 20} />
          </button>
        </form>
      </div>

      {/* 详情探索模态框 */}
      {isDetailModalOpen && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-8">
          <div className="bg-[#1a0f2e] border border-blue-500/30 rounded-3xl w-full max-w-6xl h-full max-h-[90vh] shadow-[0_0_80px_rgba(59,130,246,0.15)] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5 shrink-0">
              <h3 className="text-2xl font-bold flex items-center gap-3 text-blue-400">
                <Compass size={24} />
                探索核心概念：<span className="text-white">「{detailData.word}」</span>
              </h3>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-white/50 hover:text-white transition-colors p-2 bg-white/5 rounded-full hover:bg-white/10">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 text-white/90">
              {isGeneratingDetail ? (
                <div className="flex flex-col items-center justify-center h-full text-blue-400 gap-6">
                  <Loader2 className="animate-spin" size={60} />
                  <p className="animate-pulse text-xl">正在为您生成专属提示词、画面及资讯...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                  <div className="flex flex-col gap-6">
                    <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col gap-3 relative">
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
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-200 rounded-lg transition-all text-sm font-medium border border-indigo-500/30"
                          >
                            {isPromptCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                            {isPromptCopied ? <span className="text-emerald-400">已复制</span> : '一键复制'}
                          </button>
                        )}
                      </div>
                      {detailData.prompt ? (
                        <div className="font-mono text-sm text-white/80 bg-black/30 p-4 rounded-xl leading-relaxed whitespace-pre-wrap max-h-[220px] overflow-y-auto custom-scrollbar">
                          {detailData.prompt.replace(/<english_prompt>|<\/english_prompt>/gi, '--- 纯英文整合版 ---')}
                        </div>
                      ) : (
                        <div className="h-32 bg-white/5 animate-pulse rounded-xl"></div>
                      )}
                    </div>
                    <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex-1 flex flex-col gap-3 min-h-[300px]">
                      <h4 className="text-lg font-semibold flex items-center gap-2 text-indigo-300">
                        <ImageIcon size={18} />
                        概念具象图
                      </h4>
                      <div className="flex-1 w-full bg-black/40 rounded-xl overflow-hidden relative border border-white/5 flex items-center justify-center">
                        {detailData.image ? (
                          <img src={detailData.image} alt="Generated Concept" className="w-full h-full object-contain" />
                        ) : (
                          <div className="flex flex-col items-center gap-3 text-blue-400/50">
                            <Loader2 className="animate-spin" size={32} />
                            <span>豆包正在极速绘制中...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-6 rounded-2xl flex flex-col gap-5 overflow-hidden">
                    <h4 className="text-xl font-semibold flex items-center gap-2 text-teal-300 shrink-0">
                      <Newspaper size={20} />
                      全网资讯与趋势
                    </h4>
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-6">
                      <div className="text-white/80 leading-relaxed text-lg whitespace-pre-wrap">
                        {detailData.newsText}
                      </div>
                      {detailData.newsSources.length > 0 && (
                        <div className="mt-4 pt-6 border-t border-white/10">
                          <h5 className="text-sm font-bold text-white/50 mb-4 uppercase tracking-wider">深度阅读链接</h5>
                          <div className="flex flex-col gap-3">
                            {detailData.newsSources.map((source, idx) => (
                              <a key={idx} href={source.uri} target="_blank" rel="noopener noreferrer" className="group flex flex-col p-3 bg-black/20 hover:bg-black/40 border border-white/5 hover:border-teal-500/30 rounded-xl transition-all">
                                <span className="text-teal-200 font-medium group-hover:text-teal-400 transition-colors line-clamp-1">{source.title}</span>
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
          </div>
        </div>
      )}

      {/* 创意文案模态框 */}
      {isIdeaModalOpen && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1e1136] border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
              <h3 className="text-xl font-bold flex items-center gap-2 text-amber-400"><Sparkles size={20} /> 创意文案生成</h3>
              <button onClick={() => setIsIdeaModalOpen(false)} className="text-white/50 hover:text-white transition-colors"><X size={24} /></button>
            </div>
            <div className="p-8 overflow-y-auto flex-1 text-white/90 leading-relaxed whitespace-pre-wrap text-lg">
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center py-12 text-emerald-400 gap-4"><Loader2 className="animate-spin" size={40} /><p className="animate-pulse">AI正在将您的灵感火花串联...</p></div>
              ) : (
                <p>{generatedIdea}</p>
              )}
            </div>
            {!isGenerating && (
              <div className="p-6 border-t border-white/5 bg-black/20 flex justify-end gap-3">
                <button onClick={() => navigator.clipboard.writeText(generatedIdea)} className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors font-medium"><Download size={18} /> 复制文案</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 灵感碰撞模态框 */}
      {isInsightModalOpen && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#2a1325] border border-orange-500/20 rounded-3xl w-full max-w-md shadow-[0_0_50px_rgba(249,115,22,0.15)] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
              <h3 className="text-xl font-bold flex items-center gap-2 text-orange-400"><Zap size={20} /> 灵感跨界碰撞</h3>
              <button onClick={() => setIsInsightModalOpen(false)} className="text-white/50 hover:text-white transition-colors"><X size={24} /></button>
            </div>
            <div className="p-8 overflow-y-auto text-white/90 leading-relaxed whitespace-pre-wrap text-base">
              {isGeneratingInsight ? (
                <div className="flex flex-col items-center justify-center py-8 text-orange-400 gap-4"><Loader2 className="animate-spin" size={40} /><p className="animate-pulse">正在寻找词语间的隐秘联系...</p></div>
              ) : (
                <div className="italic border-l-4 border-orange-500/50 pl-4 py-2"><p>{generatedInsight}</p></div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 全局CSS */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes dash { to { stroke-dashoffset: -12; } }
        @keyframes capsule-glow {
          0%, 100% { box-shadow: 0 0 30px rgba(52,211,153,0.3), inset 0 0 20px rgba(52,211,153,0.1); border-color: rgba(52,211,153,0.4); }
          50% { box-shadow: 0 0 60px rgba(52,211,153,0.7), inset 0 0 40px rgba(52,211,153,0.3); border-color: rgba(52,211,153,0.9); }
        }
        .glowing-capsule { animation: capsule-glow 3s ease-in-out infinite; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.3); }
      `}} />
    </div>
  );
}

// 节点组件（完全保留）
const Node = ({ node, onClick, onRightClick }) => {
  const { id, text, en, x, y, isRoot, isSelected, isLoading, isExpanded, size } = node;
  const longPressProps = useLongPress((e) => {
    if(e.type.startsWith('touch')) onRightClick(e);
  }, 500);

  let nodeClasses = `absolute rounded-full flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-500 ease-out backdrop-blur-md border shadow-xl select-none group z-10 `;
  if (isSelected) {
    nodeClasses += "bg-gradient-to-br from-amber-500/40 to-amber-600/20 border-amber-400/60 shadow-amber-500/40 text-amber-100 z-20 ";
  } else if (isRoot) {
    nodeClasses += "bg-gradient-to-br from-emerald-500/40 to-teal-600/20 border-emerald-400/50 shadow-[0_0_30px_rgba(52,211,153,0.3)] text-white z-20 ";
  } else {
    nodeClasses += "bg-white/10 border-white/20 hover:bg-white/15 text-white/90 hover:border-white/40 ";
  }

  const scale = isRoot ? 1.3 : (isSelected ? 1.15 : 1);
  const transformStyle = `translate(-50%, -50%) scale(${scale})`;

  return (
    <div id={id} className={nodeClasses} style={{ left: x, top: y, width: size, height: size, transform: transformStyle }} onClick={onClick} onContextMenu={onRightClick} {...longPressProps}>
      {isLoading && <div className="absolute inset-0 rounded-full border-[3px] border-emerald-400/0 border-t-emerald-400/80 animate-spin" />}
      {isLoading && <div className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping opacity-50" />}
      <div className="flex flex-col items-center justify-center p-4 w-full h-full relative z-10 pointer-events-none">
        <span className={`font-bold leading-tight ${isRoot ? 'text-xl' : 'text-base'} line-clamp-3`}>{text}</span>
        <span className={`text-xs mt-1 opacity-60 font-medium tracking-wide truncate max-w-full ${isSelected ? 'text-amber-200' : ''}`}>{en}</span>
      </div>
    </div>
  );
};