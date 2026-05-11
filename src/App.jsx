import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Sparkles, Download, Trash2, History, X, Loader2, Maximize, MousePointer2, Zap, Image as ImageIcon, Compass, Newspaper, Quote, Copy, Check } from 'lucide-react';

// ==========================================
// 🚨 豆包 API 配置（已填入你的信息）
// ==========================================
const DOUBAO_CONFIG = {
  API_KEY: "ark-39bf3f1b-08bc-4f29-b3ad-a4315e8b9153-f639d", // 你的豆包API Key
  TEXT_ENDPOINT_ID: "ep-20260510220258-bx5rk", // 你的文本大模型Endpoint ID
  IMAGE_ENDPOINT_ID: "ep-20260509185423-hmwqk", // 【需补充】你的豆包文生图模型Endpoint ID（若有）
  BASE_URL: "https://open.volcengineapi.com/api/v2/endpoint"
};

// ==========================================
// 🌌 Binary Tree Canvas Animation Component
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
      
      // Density of binary characters
      const steps = Math.floor(len / 16); 
      for(let i=0; i<=steps; i++){
        const px = x + (endX - x) * (i/steps);
        const py = y + (endY - y) * (i/steps);
        const distance = Math.sqrt(Math.pow(px - rootX, 2) + Math.pow(py - rootY, 2));
        
        arr.push({
          x: px,
          y: py,
          char: Math.random() > 0.5 ? '1' : '0',
          baseAlpha: 0.2 + (depth / 10) * 0.8, // Thicker branches are brighter
          distance: distance
        });
      }
      
      // Recursive branching with slight random organic angles
      buildTree(endX, endY, len * 0.78, angle - 0.4 + (Math.random()*0.15-0.075), depth - 1, arr, rootX, rootY);
      buildTree(endX, endY, len * 0.78, angle + 0.4 + (Math.random()*0.15-0.075), depth - 1, arr, rootX, rootY);
    };

    const initTree = () => {
      points = [];
      growth = 0;
      const rootX = canvas.width / 2;
      const rootY = canvas.height;
      // Start building tree from bottom center
      buildTree(rootX, rootY, Math.min(canvas.width, canvas.height) / 4.5, -Math.PI / 2, 8, points, rootX, rootY);
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Glowing effect
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#34d399'; // Emerald green glow

      growth += 8; // Speed of tree growth

      for(let i=0; i<points.length; i++) {
        const p = points[i];
        if (p.distance < growth) {
          // 5% chance to flip binary character to make it dynamic
          if (Math.random() < 0.05) {
            p.char = p.char === '1' ? '0' : '1';
          }
          // Slight flicker in opacity
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
// 📌 补充缺失的 Node 组件（原代码未定义）
// ==========================================
const Node = ({ node, onClick, onRightClick }) => {
  return (
    <div
      onClick={onClick}
      onContextMenu={onRightClick}
      style={{
        position: 'absolute',
        left: node.x - node.size / 2,
        top: node.y - node.size / 2,
        width: node.size,
        height: node.size,
        borderRadius: '50%',
        background: node.isRoot 
          ? 'rgba(52, 211, 153, 0.2)' 
          : node.isSelected 
            ? 'rgba(245, 158, 11, 0.2)' 
            : 'rgba(255, 255, 255, 0.08)',
        border: node.isSelected 
          ? '2px solid rgba(245, 158, 11, 0.8)' 
          : '1px solid rgba(255, 255, 255, 0.2)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        backdropFilter: 'blur(10px)',
        transition: 'all 0.3s ease',
        boxShadow: node.isSelected 
          ? '0 0 20px rgba(245, 158, 11, 0.4)' 
          : '0 0 10px rgba(255, 255, 255, 0.05)'
      }}
      className="hover:bg-white/15"
    >
      <span className="text-white font-medium">{node.text}</span>
      <span className="text-xs text-white/50 mt-1">{node.en}</span>
      {node.isLoading && (
        <Loader2 
          size={16} 
          className="absolute bottom-2 animate-spin text-emerald-400" 
        />
      )}
    </div>
  );
};

// ==========================================
// 🚀 豆包 API 通用请求函数
// ==========================================
const requestDouBao = async (endpointId, payload) => {
  try {
    const response = await fetch(`${DOUBAO_CONFIG.BASE_URL}/${endpointId}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DOUBAO_CONFIG.API_KEY}`
      },
      body: JSON.stringify({
        messages: [
          { role: "user", content: payload.prompt }
        ],
        temperature: 0.8, // 创意性参数
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    if (result.data && result.data.choices && result.data.choices.length > 0) {
      return result.data.choices[0].message.content;
    }
    throw new Error("豆包API返回格式异常");
  } catch (error) {
    console.error("豆包API请求错误:", error);
    throw error;
  }
};

// --- AI 关联词生成（替换原Gemini调用）---
const generateRelatedWords = async (word) => {
  const prompt = `你是一个专业的创意发散和头脑风暴助手。给定词语：“${word}”。请发散出7到8个具有网感、创意性强的相关词汇或短语。同时提供每个词的英文翻译。请严格按照以下JSON数组格式返回，不要包含任何其他说明文字：[{"word": "中文词", "en": "English Word"}]`;

  try {
    const responseText = await requestDouBao(DOUBAO_CONFIG.TEXT_ENDPOINT_ID, { prompt });
    return JSON.parse(responseText);
  } catch (error) {
    console.error("关联词生成失败:", error);
    // 降级兜底数据
    return Array.from({ length: 7 }).map((_, i) => ({ word: `关联词${i+1}`, en: `Related ${i+1}` }));
  }
};

// --- 创意文案生成（替换原Gemini调用）---
const generateCreativeIdea = async (words) => {
  const prompt = `基于以下选择的关键词：${words.join(', ')}。请帮我生成一段具有“网感”、极具吸引力的创意文案或者概念策划。字数控制在200字左右，排版美观，适合小红书或社交媒体传播。`;
  
  try {
    return await requestDouBao(DOUBAO_CONFIG.TEXT_ENDPOINT_ID, { prompt });
  } catch (error) {
    console.error("创意生成失败:", error);
    return "生成创意失败，请检查网络后重试。";
  }
};

// --- 灵感碰撞（关联创意）生成（替换原Gemini调用）---
const generateConnection = async (words) => {
  const prompt = `作为一个跨界创意大师，请找出以下几个词语之间意想不到的、深刻的隐秘联系，并给出一个基于这些词的跨界产品或营销点子：${words.join(', ')}。请控制在150字以内，语言要具有启发性和高级感。`;
  
  try {
    return await requestDouBao(DOUBAO_CONFIG.TEXT_ENDPOINT_ID, { prompt });
  } catch (error) {
    console.error("灵感碰撞失败:", error);
    return "灵感碰撞失败，请检查网络后重试。";
  }
};

// --- 文生图（启用豆包API，需补充文生图Endpoint ID）---
const generateConceptImage = async (promptText) => {
  // 若有豆包文生图Endpoint ID，填入 DOUBAO_CONFIG.IMAGE_ENDPOINT_ID
  if (DOUBAO_CONFIG.IMAGE_ENDPOINT_ID) {
    try {
      const response = await fetch(`${DOUBAO_CONFIG.BASE_URL}/${DOUBAO_CONFIG.IMAGE_ENDPOINT_ID}/text2image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DOUBAO_CONFIG.API_KEY}`
        },
        body: JSON.stringify({
          req_key: "high_aes_general_v20",
          prompt: promptText,
          model_version: "general_v2.0",
          req_schedule_conf: "general_v20_9B_bg"
        })
      });

      const result = await response.json();
      if (result.data && result.data.image_url) {
        return result.data.image_url;
      }
      throw new Error("文生图API返回无图片地址");
    } catch (error) {
      console.error("豆包文生图失败:", error);
    }
  }

  // 降级到Google Imagen（需自行补充Key，或仅保留豆包逻辑）
  const fallbackPrompt = `Abstract, high-quality, conceptual 3d render representing this concept: ${promptText}. Beautiful dramatic lighting, glowing elements, deep purple and emerald green color palette, glassmorphism style, masterpiece.`;
  const payload = { instances: { prompt: fallbackPrompt }, parameters: { "sampleCount": 1 } };
  try {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=`; // 需补充Google Key
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (result.predictions && result.predictions.length > 0 && result.predictions[0].bytesBase64Encoded) {
      return `data:image/png;base64,${result.predictions[0].bytesBase64Encoded}`;
    }
  } catch (error) {
    console.error("Imagen降级失败:", error);
  }
  return null;
};

// --- 文生图提示词生成（替换原Gemini调用）---
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
    return await requestDouBao(DOUBAO_CONFIG.TEXT_ENDPOINT_ID, { prompt });
  } catch (error) {
    console.error("提示词生成失败:", error);
    return `主体内容 (Subject): 抽象的 ${word}\n风格 (Style): 高级玻璃质感 (Glassmorphism)\n<english_prompt>A stunning 3d render of ${word}, abstract concept, vivid colors, highly detailed, masterpiece.</english_prompt>`;
  }
};

// --- 关键词资讯获取（替换原Gemini调用）---
const fetchKeywordNews = async (word) => {
  const prompt = `Search for the latest news, trending topics, or deeper insights related to the concept: "${word}". Summarize 3 key informative points in Chinese. Make it engaging and professional.`;
  
  try {
    const text = await requestDouBao(DOUBAO_CONFIG.TEXT_ENDPOINT_ID, { prompt });
    return { text, sources: [] }; // 豆包暂不返回溯源链接，若需可自行扩展
  } catch (error) {
    console.error("资讯获取失败:", error);
    return { text: "获取资讯失败，请检查网络后重试。", sources: [] };
  }
};

// ==========================================
// 🎮 画布平移缩放 Hook
// ==========================================
const usePanZoom = (containerRef) => {
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const isDragging = useRef(false);
  const lastPan = useRef({ x: 0, y: 0 });

  const onPointerDown = useCallback((e) => {
    // Only pan on canvas background or middle mouse button
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
      newScale = Math.min(Math.max(newScale, 0.1), 3); // Limit scale

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
// 📱 移动端长按 Hook
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
// 🎯 主应用组件
// ==========================================
export default function BrainstormApp() {
  const containerRef = useRef(null);
  const { transform, isDragging, onPointerDown, onPointerMove, onPointerUp, onWheel, setTransform } = usePanZoom(containerRef);
  
  const [nodes, setNodes] = useState([]);
  const [links, setLinks] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isInputCenter, setIsInputCenter] = useState(true);
  
  // Modals States
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

  // Focus input on start
  const inputRef = useRef(null);
  useEffect(() => {
    if (isInputCenter && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isInputCenter]);

  // Center canvas on mount
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setTransform({ x: rect.width / 2, y: rect.height / 2, scale: 1 });
    }
  }, []);

  const addNode = (id, text, en, x, y, parentId = null, isRoot = false) => {
    const newNode = {
      id, text, en, x, y, parentId, isRoot, 
      isSelected: false, isExpanded: false, isLoading: false,
      size: Math.max(100, Math.min(200, 80 + text.length * 15)) 
    };
    setNodes(prev => [...prev, newNode]);
    if (parentId) {
      setLinks(prev => [...prev, { source: parentId, target: id }]);
    }
    return newNode;
  };

  const handleInitialSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const rootWord = inputValue.trim();
    setInputValue('');
    setIsInputCenter(false);
    
    setNodes([]);
    setLinks([]);
    
    const rootId = `node-${Date.now()}`;
    addNode(rootId, rootWord, "Root Concept", 0, 0, null, true);
    await expandNode(rootId, rootWord);
  };

  const expandNode = async (nodeId, word) => {
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, isLoading: true } : n));
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
    setConceptImage(null); 
    
    const idea = await generateCreativeIdea(wordsToUse);
    setGeneratedIdea(idea);
    setIsGenerating(false);
  };

  const handleGenerateInsight = async () => {
    const selectedWords = nodes.filter(n => n.isSelected).map(n => n.text);
    if (selectedWords.length < 2) return;
    
    setIsInsightModalOpen(true);
    setIsGeneratingInsight(true);
    setGeneratedInsight('');
    
    const insight = await generateConnection(selectedWords);
    setGeneratedInsight(insight);
    setIsGeneratingInsight(false);
  };

  const handleGenerateConceptImage = async () => {
    if (!generatedIdea) return;
    setIsGeneratingImage(true);
    setConceptImage(null);
    
    const imageUrl = await generateConceptImage(generatedIdea);
    setConceptImage(imageUrl);
    setIsGeneratingImage(false);
  };

  const handleOpenDetailModal = async (nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    setIsDetailModalOpen(true);
    setIsGeneratingDetail(true);
    setDetailData(prev => ({ ...prev, word: node.text }));
    
    // 并行生成提示词和资讯
    const [prompt, newsRes] = await Promise.all([
      generateImagePrompt(node.text),
      fetchKeywordNews(node.text)
    ]);
    
    setDetailData({
      word: node.text,
      prompt,
      image: null,
      newsText: newsRes.text,
      newsSources: newsRes.sources
    });
    setIsGeneratingDetail(false);
  };

  const handleCopyPrompt = () => {
    // 提取纯英文prompt
    const promptMatch = detailData.prompt.match(/<english_prompt>([\s\S]*?)<\/english_prompt>/);
    const copyText = promptMatch ? promptMatch[1] : detailData.prompt;
    
    navigator.clipboard.writeText(copyText)
      .then(() => {
        setIsPromptCopied(true);
        setTimeout(() => setIsPromptCopied(false), 2000);
      })
      .catch(err => console.error("复制失败:", err));
  };

  const handleGenerateDetailImage = async () => {
    const promptMatch = detailData.prompt.match(/<english_prompt>([\s\S]*?)<\/english_prompt>/);
    const promptText = promptMatch ? promptMatch[1] : detailData.prompt;
    
    setIsGeneratingImage(true);
    const imageUrl = await generateConceptImage(promptText);
    setDetailData(prev => ({ ...prev, image: imageUrl }));
    setIsGeneratingImage(false);
  };

  const handleResetCanvas = () => {
    setNodes([]);
    setLinks([]);
    setIsInputCenter(true);
    setInputValue('');
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setTransform({ x: rect.width / 2, y: rect.height / 2, scale: 1 });
    }
  };

  const handleExportIdea = () => {
    const exportData = {
      rootWord: nodes.find(n => n.isRoot)?.text || "",
      selectedWords: nodes.filter(n => n.isSelected).map(n => n.text),
      generatedIdea,
      timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `创意-${exportData.rootWord || '未命名'}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ==========================================
  // 🎨 渲染部分
  // ==========================================
  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* 二进制树背景画布 */}
      <BinaryTreeCanvas />
      
      {/* 主交互画布容器 */}
      <div 
        ref={containerRef}
        id="canvas-bg"
        className="relative w-full h-full overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onWheel={onWheel}
        style={{ touchAction: 'manipulation' }}
      >
        {/* 节点连线 */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {activeLinks.map((link, i) => {
            const source = nodes.find(n => n.id === link.source);
            const target = nodes.find(n => n.id === link.target);
            if (!source || !target) return null;
            return (
              <line
                key={`link-${i}`}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke="rgba(52, 211, 153, 0.3)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                opacity="0.7"
              />
            );
          })}
        </svg>

        {/* 节点渲染 */}
        <div 
          className="absolute inset-0"
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: '0 0',
            transition: isDragging.current ? 'none' : 'transform 0.1s ease-out'
          }}
        >
          {nodes.map(node => (
            <Node
              key={node.id}
              node={node}
              onClick={() => handleNodeClick(node.id, node.text, node.isExpanded)}
              onRightClick={(e) => { e.preventDefault(); toggleSelectNode(node.id); }}
            />
          ))}
        </div>

        {/* 中心输入框 */}
        {isInputCenter && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-full max-w-md px-4">
            <form onSubmit={handleInitialSubmit} className="relative">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="输入核心创意词，开启头脑风暴..."
                className="w-full py-4 px-6 bg-white/10 backdrop-blur-lg border border-white/20 rounded-full text-white text-lg placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-full transition-colors"
              >
                <Sparkles size={20} />
              </button>
            </form>
          </div>
        )}

        {/* 顶部操作栏 */}
        {!isInputCenter && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex gap-2 bg-black/50 backdrop-blur-lg p-2 rounded-full border border-white/10">
            <button
              onClick={handleGenerateIdea}
              disabled={nodes.filter(n => n.isSelected).length === 0 && !nodes.find(n => n.isRoot)}
              className="flex items-center gap-1 px-4 py-2 rounded-full bg-emerald-500/80 hover:bg-emerald-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Sparkles size={16} />
              <span>确定发掘</span>
            </button>
            <button
              onClick={handleGenerateInsight}
              disabled={nodes.filter(n => n.isSelected).length < 2}
              className="flex items-center gap-1 px-4 py-2 rounded-full bg-amber-500/80 hover:bg-amber-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Zap size={16} />
              <span>灵感碰撞</span>
            </button>
            <button
              onClick={handleExportIdea}
              disabled={nodes.length === 0}
              className="flex items-center gap-1 px-4 py-2 rounded-full bg-blue-500/80 hover:bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Download size={16} />
              <span>导出创意</span>
            </button>
            <button
              onClick={handleResetCanvas}
              className="flex items-center gap-1 px-4 py-2 rounded-full bg-red-500/80 hover:bg-red-500 text-white transition-colors"
            >
              <Trash2 size={16} />
              <span>重置</span>
            </button>
          </div>
        )}
      </div>

      {/* 创意生成弹窗 */}
      {isIdeaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl bg-gray-900/90 backdrop-blur-lg border border-white/10 rounded-2xl overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-white/10">
              <h3 className="text-xl font-bold text-white">创意生成结果</h3>
              <button
                onClick={() => setIsIdeaModalOpen(false)}
                className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 size={32} className="animate-spin text-emerald-400 mb-4" />
                  <p className="text-white/70">正在生成创意...</p>
                </div>
              ) : (
                <>
                  <div className="prose prose-invert max-w-none">
                    <Quote className="text-emerald-400 mb-4" />
                    <p className="text-white leading-relaxed whitespace-pre-line">{generatedIdea}</p>
                  </div>
                  
                  <div className="mt-6">
                    <button
                      onClick={handleGenerateConceptImage}
                      disabled={isGeneratingImage}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500 hover:bg-purple-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isGeneratingImage ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
                      <span>生成概念图</span>
                    </button>
                    
                    {conceptImage && (
                      <div className="mt-4 rounded-xl overflow-hidden border border-white/10">
                        <img 
                          src={conceptImage} 
                          alt="Concept visualization" 
                          className="w-full h-auto object-cover"
                        />
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 灵感碰撞弹窗 */}
      {isInsightModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-gray-900/90 backdrop-blur-lg border border-white/10 rounded-2xl overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-white/10">
              <h3 className="text-xl font-bold text-white">灵感碰撞</h3>
              <button
                onClick={() => setIsInsightModalOpen(false)}
                className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {isGeneratingInsight ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 size={32} className="animate-spin text-amber-400 mb-4" />
                  <p className="text-white/70">正在碰撞灵感...</p>
                </div>
              ) : (
                <div className="prose prose-invert max-w-none">
                  <Zap className="text-amber-400 mb-4" />
                  <p className="text-white leading-relaxed whitespace-pre-line">{generatedInsight}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 节点详情弹窗 */}
      {isDetailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl bg-gray-900/90 backdrop-blur-lg border border-white/10 rounded-2xl overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-white/10">
              <h3 className="text-xl font-bold text-white">{detailData.word} · 深度解析</h3>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {isGeneratingDetail ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 size={32} className="animate-spin text-blue-400 mb-4" />
                  <p className="text-white/70">正在解析关键词...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* 文生图提示词 */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-lg font-semibold text-blue-400 flex items-center gap-2">
                        <Compass size={18} />
                        文生图提示词
                      </h4>
                      <button
                        onClick={handleCopyPrompt}
                        className="flex items-center gap-1 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
                      >
                        {isPromptCopied ? <Check size={14} /> : <Copy size={14} />}
                        <span>{isPromptCopied ? '已复制' : '复制Prompt'}</span>
                      </button>
                    </div>
                    <div className="bg-black/50 p-4 rounded-lg border border-white/10 text-white text-sm whitespace-pre-line">
                      {detailData.prompt}
                    </div>
                    
                    <button
                      onClick={handleGenerateDetailImage}
                      disabled={isGeneratingImage}
                      className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500 hover:bg-purple-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isGeneratingImage ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
                      <span>生成概念图</span>
                    </button>
                    
                    {detailData.image && (
                      <div className="mt-4 rounded-xl overflow-hidden border border-white/10">
                        <img 
                          src={detailData.image} 
                          alt={`${detailData.word} concept`} 
                          className="w-full h-auto object-cover"
                        />
                      </div>
                    )}
                  </div>

                  {/* 最新资讯 */}
                  <div>
                    <h4 className="text-lg font-semibold text-green-400 flex items-center gap-2 mb-2">
                      <Newspaper size={18} />
                      最新资讯
                    </h4>
                    <div className="bg-black/50 p-4 rounded-lg border border-white/10 text-white text-sm">
                      <p className="whitespace-pre-line">{detailData.newsText}</p>
                      
                      {detailData.newsSources.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <h5 className="text-white/70 text-xs mb-2">参考来源：</h5>
                          <div className="flex flex-wrap gap-2">
                            {detailData.newsSources.map((src, i) => (
                              <a
                                key={i}
                                href={src.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:underline text-xs"
                              >
                                {src.title}
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

      {/* 操作提示 */}
      <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-2">
        <div className="bg-black/50 backdrop-blur-lg p-2 rounded-lg border border-white/10 text-white text-xs flex items-center gap-2">
          <MousePointer2 size={14} />
          <span>右键/长按选中节点</span>
        </div>
        <div className="bg-black/50 backdrop-blur-lg p-2 rounded-lg border border-white/10 text-white text-xs flex items-center gap-2">
          <Maximize size={14} />
          <span>滚轮缩放 / 拖拽平移</span>
        </div>
      </div>
    </div>
  );
}