import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Sparkles, Download, Trash2, X, Loader2, MousePointer2, Zap, Target, FlipHorizontal, ArrowDownToLine, Focus, Info, AlertCircle, Image as ImageIcon, Newspaper, Quote, Copy, Check, Compass } from 'lucide-react';

// ==========================================
// 🌌 背景动画组件 (Binary Tree Canvas)
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
// 🚀 Gemini API 集成 (Vercel 后端代理版 - 100% 安全)
// ==========================================
// ✅ 前端无任何 API Key，所有请求通过 Vercel 后端转发
// ✅ 彻底解决 API Key 泄露问题，放心部署到 GitHub 和 Vercel

const fetchWithRetry = async (url, options, retries = 5) => {
  const delays = [1000, 2000, 4000, 8000, 16000];
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`HTTP Error: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }
      return await response.json();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, delays[i]));
    }
  }
};

const callGeminiText = async (prompt, systemInstructionText, isJson = false) => {
  const url = '/api/gemini-text';
  
  const payload = {
    model: "gemini-2.5-flash",
    payload: {
      contents: [{ parts: [{ text: prompt }] }],
      systemInstruction: { parts: [{ text: systemInstructionText }] }
    }
  };

  if (isJson) {
    payload.payload.generationConfig = { responseMimeType: "application/json" };
  }

  const result = await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  return result.candidates?.[0]?.content?.parts?.[0]?.text || "";
};

// ==========================================
// 🧠 AI 功能实现
// ==========================================
const generateRelatedWords = async (word, mode = 'base') => {
  let prompt = "";
  if (mode === 'base') {
    prompt = `请发散“${word}”的7个网感创意关联词汇。`;
  } else if (mode === 'reverse') {
    prompt = `请生成“${word}”的7个反义词、对立面或反常识的关联词汇（例如："夏天"→"羽绒服"、"冰雕"）。`;
  } else if (mode === 'vertical') {
    prompt = `请对“${word}”进行纵向深入，生成7个更底层的细分领域或下级概念词汇（例如："猫"→"蓝金渐层"、"幼猫喂养"）。`;
  }

  const sysInstruction = `你是一个头脑风暴发散工具。必须严格返回一个纯JSON数组格式，包含 word (中文) 和 en (英文)。格式如下：[{"word": "词", "en": "word"}]`;

  try {
    const jsonStr = await callGeminiText(prompt, sysInstruction, true);
    const data = JSON.parse(jsonStr.replace(/```json/gi, '').replace(/```/g, '').trim());
    return Array.isArray(data) ? data : (data.words || Object.values(data)[0] || []);
  } catch (error) {
    console.error("Related Words Error:", error);
    throw new Error("大模型生成格式错误或超时，请重试");
  }
};

const generateCreativeIdea = async (words) => {
  const prompt = `基于以下关键词：${words.join(', ')}。请生成一段具有“网感”的极具吸引力的创意文案或者概念策划。字数控制在200字左右，排版美观。`;
  return await callGeminiText(prompt, "你是一个创意爆款文案专家。");
};

const generateCrossoverInsight = async (words) => {
  const prompt = `强制关联以下完全不同领域的词语：${words.join(', ')}。生成3个极具颠覆性的跨界产品或营销点子（例如："咖啡"+"航天"→"零重力咖啡杯"）。排版清晰，150字以内。`;
  return await callGeminiText(prompt, "你是一个跨界创新大师，擅长打破常规思考。");
};

const generateConvergence = async (goal, allWordsStr) => {
  const prompt = `目标：“${goal}”。\n词语库：${allWordsStr}。\n请筛选出最符合目标的10个核心关键词，并将它们聚类分成2-3个清晰的策略方向。控制在200字内。`;
  return await callGeminiText(prompt, "你是一位资深的战略分析师，擅长信息收敛与结构化提炼。");
};

// --- 新增：高维提示词、图像生成与资讯 ---
const generateDetailPrompt = async (word) => {
  const prompt = `请为概念词“${word}”创作一段极其详细的【中英双语】文生图提示词(Prompt)。

要求：
1. 必须包含且详尽描述这8个维度：
   - 主体内容 (Subject)：如 画面中心是一个...
   - 风格 (Style)：如 赛博朋克, 超写实
   - 灯光 (Lighting)：如 电影级光效, 侧逆光
   - 材质 (Material)：如 粗糙的岩石, 细腻的金属
   - 构图 (Composition)：如 黄金分割, 仰拍特写
   - 配色 (Color Palette)：如 莫兰迪色系, 暖橙冷蓝对比
   - 质感 (Texture)：如 8k分辨率, 极致毛发细节
   - 环境 (Environment)：如 烟雾缭绕的森林背景
2. 排版高级、结构清晰，中英文对照。
3. 最后单独提供一段纯英文完整Prompt用于AI绘图，并强制使用 <english_prompt> 和 </english_prompt> 标签包裹。`;
  
  return await callGeminiText(prompt, "你是一个顶尖的原画师和AI绘画提示词专家。");
};

const generateConceptImage = async (promptText) => {
  const apiUrl = '/api/gemini-image';
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: promptText })
    });
    
    const result = await response.json();
    if (result.predictions && result.predictions[0]?.bytesBase64Encoded) {
      return `data:image/png;base64,${result.predictions[0].bytesBase64Encoded}`;
    }
  } catch (error) {
    console.error("Image Generation Error:", error);
  }
  return null;
};

const fetchDetailNews = async (word) => {
  const prompt = `请立刻在互联网上搜索关于“${word}”的最新行业资讯、新闻报道或真实市场案例。
要求：
1. 总结出3条关键信息，必须是客观真实的互联网资讯。
2. 使用专业的中文进行回复，排版清晰。`;
  
  const url = '/api/gemini-text';
  
  const payload = {
    model: "gemini-2.5-flash",
    payload: {
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }]
    }
  };

  try {
    const result = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const candidate = result.candidates?.[0];
    let text = "未能找到相关的真实资讯，可能该领域近期无热点。";
    let sources = [];
    
    if (candidate?.content?.parts?.[0]?.text) {
      text = candidate.content.parts[0].text;
      const metadata = candidate.groundingMetadata;
      if (metadata?.groundingAttributions) {
        sources = metadata.groundingAttributions
          .map(attr => ({ uri: attr.web?.uri, title: attr.web?.title }))
          .filter(src => src.uri && src.title);
      }
    }
    
    // 去重
    const uniqueSources = [];
    const seenUris = new Set();
    for (const s of sources) {
      if (!seenUris.has(s.uri)) {
        seenUris.add(s.uri);
        uniqueSources.push(s);
      }
    }
    return { text, sources: uniqueSources };
  } catch (error) {
    console.error("News Fetch Error:", error);
    return { text: "由于网络原因，真实资讯检索失败，请稍后重试。", sources: [] };
  }
};


// ==========================================
// 🖱️ Canvas Hook (支持平移缩放)
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
// 🎯 主应用组件
// ==========================================
export default function BrainstormApp() {
  const containerRef = useRef(null);
  const { transform, isDragging: isCanvasDragging, onPointerDown: onCanvasPointerDown, onPointerMove: onCanvasPointerMove, onPointerUp: onCanvasPointerUp, onWheel, setTransform } = usePanZoom(containerRef);
  
  const [nodes, setNodes] = useState([]);
  const [links, setLinks] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isInputCenter, setIsInputCenter] = useState(true);
  const [error, setError] = useState(null);
  
  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, nodeId: null });
  
  // 拖拽与双击状态管理
  const dragState = useRef({ isDragging: false, nodeId: null, startX: 0, startY: 0, initialPositions: new Map(), moved: false });
  const lastClickRef = useRef({ time: 0, id: null });

  // 模态框状态
  const [isIdeaModalOpen, setIsIdeaModalOpen] = useState(false);
  const [generatedIdea, setGeneratedIdea] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const [isInsightModalOpen, setIsInsightModalOpen] = useState(false);
  const [generatedInsight, setGeneratedInsight] = useState('');
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);

  const [isConvergenceModalOpen, setIsConvergenceModalOpen] = useState(false);
  const [convergenceGoal, setConvergenceGoal] = useState('');
  const [generatedConvergence, setGeneratedConvergence] = useState('');
  const [isGeneratingConvergence, setIsGeneratingConvergence] = useState(false);

  // 提示词生词模态框状态
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isGeneratingDetail, setIsGeneratingDetail] = useState(false);
  const [detailData, setDetailData] = useState({ word: '', prompt: '', image: null, newsText: '', newsSources: [] });
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

  // 获取以某节点为根的子树的所有节点ID（用于联动拖拽）
  const getSubtreeIds = useCallback((rootId) => {
    const childrenMap = {};
    links.forEach(l => {
      if (!childrenMap[l.source]) childrenMap[l.source] = [];
      childrenMap[l.source].push(l.target);
    });
    const subtree = new Set([rootId]);
    const queue = [rootId];
    while (queue.length > 0) {
      const curr = queue.shift();
      if (childrenMap[curr]) {
        childrenMap[curr].forEach(child => {
          if (!subtree.has(child)) {
            subtree.add(child);
            queue.push(child);
          }
        });
      }
    }
    return subtree;
  }, [links]);

  const addNode = (id, text, en, x, y, parentId = null, isRoot = false) => {
    const newNode = {
      id, text, en, x, y, parentId, isRoot, 
      isSelected: false, isExpanded: false, isLoading: false
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
    
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = (rect.width / 2 - transform.x) / transform.scale;
    const centerY = (rect.height / 2 - transform.y) / transform.scale;
    
    // 随机偏移，允许自由添加多个起始词而不重叠
    const offsetX = nodes.length > 0 ? (Math.random() * 200 - 100) : 0;
    const offsetY = nodes.length > 0 ? (Math.random() * 200 - 100) : 0;
    
    const rootId = `node-${Date.now()}`;
    addNode(rootId, rootWord, "Root Concept", centerX + offsetX, centerY + offsetY, null, true);
    await performNodeExpand(rootId, rootWord, 'base');
  };

  const performNodeExpand = async (nodeId, word, mode) => {
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

        const count = relatedData.length;
        const radius = 220; 
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
          const r = radius + (Math.random() * 40 - 20); 
          const childX = parent.x + Math.cos(angle) * r;
          const childY = parent.y + Math.sin(angle) * r;
          const childId = `node-${Date.now()}-${index}-${mode}`;
          
          currentNodes.push({
            id: childId, text: data.word, en: data.en, x: childX, y: childY, parentId: nodeId, isRoot: false,
            isSelected: false, isExpanded: false, isLoading: false
          });
          
          setLinks(prevLinks => {
            if (!prevLinks.some(l => l.source === nodeId && l.target === childId)) {
               return [...prevLinks, { source: nodeId, target: childId }];
            }
            return prevLinks;
          });
        });
        return currentNodes;
      });
    } catch (err) {
      setError(`发散失败: ${err.message}`);
      setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, isLoading: false } : n));
    }
  };

  // ================= 节点拖拽与双击事件 =================
  const handleNodePointerDown = useCallback((e, nodeId) => {
    if (e.button !== 0) return; // 仅响应左键
    e.stopPropagation();
    e.target.setPointerCapture(e.pointerId);
    
    setContextMenu({ visible: false, x: 0, y: 0, nodeId: null });

    // 子树联动拖拽：获取包含自身及其下属所有层级的节点
    const subtreeIds = getSubtreeIds(nodeId);
    const initialPositions = new Map();
    nodes.forEach(n => {
      if (subtreeIds.has(n.id)) initialPositions.set(n.id, { x: n.x, y: n.y });
    });

    dragState.current = {
      isDragging: true,
      nodeId,
      startX: e.clientX,
      startY: e.clientY,
      initialPositions,
      moved: false
    };
  }, [nodes, getSubtreeIds]);

  const handleNodePointerMove = useCallback((e) => {
    if (!dragState.current.isDragging) return;
    e.stopPropagation();
    
    const ds = dragState.current;
    const dx = (e.clientX - ds.startX) / transform.scale;
    const dy = (e.clientY - ds.startY) / transform.scale;
    
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) ds.moved = true;

    // 同步更新父节点及其所有的子节点位置
    setNodes(prev => prev.map(n => {
      if (ds.initialPositions.has(n.id)) {
        const initPos = ds.initialPositions.get(n.id);
        return { ...n, x: initPos.x + dx, y: initPos.y + dy };
      }
      return n;
    }));
  }, [transform.scale]);

  const handleNodePointerUp = useCallback((e, nodeId) => {
    if (!dragState.current.isDragging) return;
    e.stopPropagation();
    e.target.releasePointerCapture(e.pointerId);
    
    const wasMoved = dragState.current.moved;
    dragState.current = { isDragging: false, nodeId: null, startX: 0, startY: 0, initialPositions: new Map(), moved: false };

    // 双击与单击判定
    if (!wasMoved) {
      const now = Date.now();
      const node = nodes.find(n => n.id === nodeId);
      
      if (now - lastClickRef.current.time < 300 && lastClickRef.current.id === nodeId) {
        // 双击执行：确认选择节点
        lastClickRef.current.time = 0; 
        setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, isSelected: !n.isSelected } : n));
      } else {
        // 单击执行：延迟判定无双击后，发散基础模式
        lastClickRef.current = { time: now, id: nodeId };
        setTimeout(() => {
          if (lastClickRef.current.time === now && node && !node.isExpanded) {
            performNodeExpand(nodeId, node.text, 'base');
          }
        }, 300);
      }
    }
  }, [nodes]);

  // ================= 右键菜单事件 =================
  const handleContextMenu = useCallback((e, nodeId) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, nodeId });
  }, []);

  const closeContextMenu = () => setContextMenu({ visible: false, x: 0, y: 0, nodeId: null });

  useEffect(() => {
    const handleGlobalClick = () => { if (contextMenu.visible) closeContextMenu(); };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [contextMenu.visible]);

  // ================= 功能触发器 =================
  const triggerExpand = (mode) => {
    if (!contextMenu.nodeId) return;
    const node = nodes.find(n => n.id === contextMenu.nodeId);
    if (node) performNodeExpand(node.id, node.text, mode);
    closeContextMenu();
  };

  const handleRunConvergence = async () => {
    if (!convergenceGoal.trim()) return;
    setIsGeneratingConvergence(true);
    
    // 收敛选中的所有词语，若无选中则收敛当前树
    const selectedNodes = nodes.filter(n => n.isSelected);
    const targetNodes = selectedNodes.length > 0 ? selectedNodes : nodes;
    const allWordsStr = targetNodes.map(n => n.text).join('、');
    
    try {
      const result = await generateConvergence(convergenceGoal.trim(), allWordsStr);
      setGeneratedConvergence(result);
    } catch (err) {
      setError(`收敛失败: ${err.message}`);
    } finally {
      setIsGeneratingConvergence(false);
    }
  };

  const handleGenerateIdea = async () => {
    const selectedWords = nodes.filter(n => n.isSelected).map(n => n.text);
    const rootWords = nodes.filter(n => n.isRoot).map(n => n.text);
    if (selectedWords.length === 0 && rootWords.length === 0) return;
    const wordsToUse = selectedWords.length > 0 ? selectedWords : rootWords;
    
    setIsIdeaModalOpen(true);
    setIsGenerating(true);
    setGeneratedIdea('');
    
    try {
      const idea = await generateCreativeIdea(wordsToUse);
      setGeneratedIdea(idea);
    } catch (err) {
      setError(`文案生成失败: ${err.message}`);
      setIsIdeaModalOpen(false);
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
    
    try {
      const insight = await generateCrossoverInsight(selectedWords);
      setGeneratedInsight(insight);
    } catch (err) {
      setError(`跨界碰撞失败: ${err.message}`);
      setIsInsightModalOpen(false);
    } finally {
      setIsGeneratingInsight(false);
    }
  };

  const handleGenerateDetail = async () => {
    if (!contextMenu.nodeId) return;
    const node = nodes.find(n => n.id === contextMenu.nodeId);
    if (!node) return;

    closeContextMenu();
    setIsDetailModalOpen(true);
    setIsGeneratingDetail(true);
    setDetailData({ word: node.text, prompt: '', image: null, newsText: '', newsSources: [] });

    try {
      // 第一阶段：生成提示词 & 获取真实资讯
      const [promptRes, newsRes] = await Promise.all([
        generateDetailPrompt(node.text),
        fetchDetailNews(node.text)
      ]);
      
      setDetailData(prev => ({ ...prev, prompt: promptRes, newsText: newsRes.text, newsSources: newsRes.sources }));
      
      // 第二阶段：提取英文 Prompt 去画图
      const match = promptRes.match(/<english_prompt>([\s\S]*?)<\/english_prompt>/i);
      const engPrompt = match ? match[1].trim() : promptRes.substring(0, 300);
      
      const imageRes = await generateConceptImage(engPrompt);
      if (imageRes) {
        setDetailData(prev => ({ ...prev, image: imageRes }));
      }
    } catch (error) {
      setError(`详细生成失败: ${error.message}`);
    } finally {
      setIsGeneratingDetail(false);
    }
  };

  const clearCanvas = () => {
    setNodes([]);
    setLinks([]);
    setIsInputCenter(true);
    setTransform({ x: window.innerWidth / 2, y: window.innerHeight / 2, scale: 1 });
  };

  // ================= 组件: 带功能说明的悬浮 Tooltip =================
  const Tooltip = ({ children, title, example, position = 'bottom' }) => {
    const posClass = position === 'bottom' 
      ? 'top-full mt-2 left-1/2 -translate-x-1/2' 
      : 'left-full ml-2 top-0'; 

    return (
      <div className="group relative flex items-center">
        {children}
        <div className={`absolute ${posClass} w-64 p-3 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl text-sm text-slate-200 opacity-0 pointer-events-none transition-all duration-200 group-hover:opacity-100 z-[60]`}>
          <div className="flex items-center gap-1.5 font-bold mb-1.5 text-emerald-400">
            <Info size={14}/> {title}
          </div>
          <p className="text-slate-400 text-xs leading-relaxed">{example}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-950 text-white selection:bg-emerald-500/30 font-sans">
      
      {/* 🔴 全局报错提示 */}
      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-4 bg-red-500/90 backdrop-blur-md border border-red-400/50 rounded-full shadow-lg transition-all">
          <AlertCircle size={20} className="text-white" />
          <span className="font-bold text-white tracking-wide">{error}</span>
          <button onClick={() => setError(null)} className="ml-2 text-white/70 hover:text-white transition-colors bg-white/10 p-1.5 rounded-full"><X size={16} /></button>
        </div>
      )}

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black pointer-events-none -z-10" />
      
      <div className={`absolute inset-0 transition-opacity duration-1000 ease-in-out pointer-events-none z-0 ${isInputCenter ? 'opacity-100' : 'opacity-0'}`}>
        <BinaryTreeCanvas />
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-amber-500/10 blur-[120px] rounded-full" />
      </div>

      <div
        id="canvas-bg"
        ref={containerRef}
        className="absolute inset-0 cursor-grab active:cursor-grabbing touch-none z-10"
        onPointerDown={onCanvasPointerDown}
        onPointerMove={onCanvasPointerMove}
        onPointerUp={onCanvasPointerUp}
        onPointerCancel={onCanvasPointerUp}
        onWheel={onWheel}
      >
        <div
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: '0 0',
            transition: isCanvasDragging.current ? 'none' : 'transform 0.1s ease-out'
          }}
          className="absolute top-0 left-0"
        >
          {/* 画布连线 */}
          <svg className="absolute top-0 left-0 overflow-visible pointer-events-none">
            {links.map((link, i) => {
              const source = nodes.find(n => n.id === link.source);
              const target = nodes.find(n => n.id === link.target);
              if (!source || !target) return null;
              return (
                <g key={`${link.source}-${link.target}`}>
                  <line
                    x1={source.x} y1={source.y} x2={target.x} y2={target.y}
                    stroke={target.isSelected ? "rgba(245, 158, 11, 0.5)" : "rgba(148, 163, 184, 0.3)"}
                    strokeWidth={target.isSelected ? 3 : 2}
                    className="transition-colors duration-300 ease-out"
                  />
                  {source.isLoading && (
                    <line
                      x1={source.x} y1={source.y} x2={target.x} y2={target.y}
                      stroke="rgba(16, 185, 129, 0.6)" strokeWidth="2" strokeDasharray="4 8"
                      className="animate-[dash_1s_linear_infinite]"
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {/* 高级脑图 - 现代圆角矩形毛玻璃节点 */}
          {nodes.map(node => (
            <div 
              key={node.id} 
              id={node.id} 
              className={`absolute flex flex-col items-center justify-center text-center cursor-pointer select-none z-10 transition-all duration-300 ease-out px-6 py-3 rounded-2xl border backdrop-blur-md shadow-lg
                ${node.isSelected 
                  ? 'bg-amber-500/20 border-amber-400/60 shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:bg-amber-500/30' 
                  : node.isRoot 
                    ? 'bg-emerald-500/20 border-emerald-400/50 shadow-[0_0_20px_rgba(52,211,153,0.3)] hover:bg-emerald-500/30' 
                    : 'bg-slate-800/80 border-slate-600/50 hover:border-slate-400 hover:bg-slate-700/90'
                }
              `}
              style={{ 
                left: node.x, top: node.y, 
                transform: `translate(-50%, -50%) scale(${node.isRoot ? 1.1 : (node.isSelected ? 1.05 : 1)})`
              }}
              onPointerDown={(e) => handleNodePointerDown(e, node.id)}
              onPointerMove={handleNodePointerMove}
              onPointerUp={(e) => handleNodePointerUp(e, node.id)}
              onContextMenu={(e) => handleContextMenu(e, node.id)}
            >
              {node.isLoading && (
                <div className="absolute inset-0 rounded-2xl border-2 border-emerald-400 border-t-transparent animate-spin opacity-80" />
              )}
              {/* 为了防止子元素干扰指针事件，使用 pointer-events-none */}
              <div className="flex flex-col items-center pointer-events-none">
                <span className={`font-bold text-[15px] leading-tight whitespace-nowrap max-w-[200px] overflow-hidden text-ellipsis ${node.isSelected ? 'text-amber-100' : (node.isRoot ? 'text-emerald-100' : 'text-slate-100')}`}>
                  {node.text}
                </span>
                <span className={`text-[11px] mt-0.5 whitespace-nowrap max-w-[150px] overflow-hidden text-ellipsis ${node.isSelected ? 'text-amber-200/70' : 'text-slate-400'}`}>
                  {node.en}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 右键功能菜单 */}
      {contextMenu.visible && (
        <div 
          className="fixed z-50 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl p-2 flex flex-col gap-1 w-48 animate-in fade-in zoom-in-95"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 mb-1">功能模式</div>
          
          <Tooltip title="提示词生词" example="针对该词汇生成8大维度详细提示词、AI 配图及最新全网资讯报道。" position="right">
            <button onClick={handleGenerateDetail} className="w-full flex items-center gap-3 px-3 py-2.5 bg-gradient-to-r from-purple-600/50 to-indigo-600/50 hover:from-purple-500/60 hover:to-indigo-500/60 text-white rounded-lg transition-colors text-sm font-bold border border-purple-500/30 mb-1 shadow-[0_0_10px_rgba(168,85,247,0.2)]">
              <ImageIcon size={16} className="text-purple-300" /> 提示词生词
            </button>
          </Tooltip>

          <Tooltip title="逆向模式" example="生成反义词、对立面、反常识关联词（如'夏天'→'羽绒服'、'暖气'、'冰雕'）" position="right">
            <button onClick={() => triggerExpand('reverse')} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-800 text-slate-300 hover:text-rose-400 rounded-lg transition-colors text-sm font-medium">
              <FlipHorizontal size={16} /> 逆向模式
            </button>
          </Tooltip>

          <Tooltip title="垂直模式" example="纵向深入，挖掘更底层的细分领域（如'猫'→'英短'→'蓝金渐层'→'幼猫喂养'）" position="right">
            <button onClick={() => triggerExpand('vertical')} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-800 text-slate-300 hover:text-purple-400 rounded-lg transition-colors text-sm font-medium">
              <ArrowDownToLine size={16} /> 垂直模式
            </button>
          </Tooltip>

          <Tooltip title="收敛模式" example="输入目标（如'我要做儿童节营销'），AI 自动筛选最相关的10个关键词并分类聚类。" position="right">
            <button onClick={() => { closeContextMenu(); setIsConvergenceModalOpen(true); }} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 rounded-lg transition-colors text-sm font-medium">
              <Target size={16} /> 收敛模式
            </button>
          </Tooltip>
        </div>
      )}

      {/* 顶部操作栏 */}
      <div className="absolute top-0 right-0 w-full p-6 flex justify-end items-start pointer-events-none z-20">
        <div className="flex flex-wrap justify-end gap-3 pointer-events-auto max-w-[70vw]">
          <button onClick={clearCanvas} className="flex items-center gap-2 px-5 py-2.5 bg-slate-800/80 hover:bg-slate-700 backdrop-blur-md border border-slate-600 rounded-full text-sm font-medium transition-all text-slate-300 hover:text-white">
            <Trash2 size={16} /> <span className="hidden sm:inline">清空画布</span>
          </button>

          <Tooltip title="跨界模式" example="强制关联选中不同的领域词汇，生成颠覆性产品或营销点子（如'咖啡'+'航天'→'零重力咖啡杯'）" position="bottom">
             <button 
                onClick={handleGenerateInsight} 
                disabled={nodes.filter(n => n.isSelected).length < 2} 
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-500 hover:from-orange-500 hover:to-amber-500 text-white shadow-lg shadow-amber-500/20 backdrop-blur-md border border-white/10 rounded-full text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
             >
              <Zap size={16} /> <span className="hidden sm:inline">跨界模式</span>
            </button>
          </Tooltip>

          <button onClick={handleGenerateIdea} disabled={nodes.length === 0} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-500/20 backdrop-blur-md border border-white/10 rounded-full text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            <Sparkles size={16} /> <span className="hidden sm:inline">导出创意</span>
          </button>
        </div>
      </div>

      {/* 操作指引浮窗 (底部) */}
      {!isInputCenter && (
        <div className="absolute bottom-6 left-6 pointer-events-none z-20 flex flex-col gap-2">
          <div className="bg-slate-900/80 backdrop-blur-md px-4 py-2.5 border border-slate-700 rounded-xl shadow-lg flex items-center gap-3">
             <MousePointer2 className="text-emerald-400" size={16}/>
             <span className="text-sm font-medium text-slate-200">单击发散基础概念 / 左键长按联动拖动 / 双击选中词语</span>
          </div>
          <div className="bg-slate-900/80 backdrop-blur-md px-4 py-2.5 border border-slate-700 rounded-xl shadow-lg flex items-center gap-3">
             <MousePointer2 className="text-amber-400" size={16}/>
             <span className="text-sm font-medium text-slate-200">右键节点开启多维扩展操作 (逆向/垂直/收敛/提示词生图)</span>
          </div>
        </div>
      )}

      {/* 居中/底部多起始词输入框 */}
      <div className={`absolute w-full flex justify-center pointer-events-none transition-all duration-700 ease-in-out z-30 ${isInputCenter ? 'top-[60%] -translate-y-1/2' : 'bottom-8'}`}>
        <form onSubmit={handleInitialSubmit} className={`pointer-events-auto relative group flex items-center bg-slate-900/80 backdrop-blur-xl border border-slate-700 p-2 transition-all duration-700 ${isInputCenter ? 'w-[90%] max-w-xl rounded-[3rem] shadow-[0_0_30px_rgba(52,211,153,0.15)]' : 'w-[90%] max-w-md rounded-full shadow-lg'}`}>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="输入起始词，可多次输入添加多个灵感源头..."
            className="w-full bg-transparent border-none outline-none text-white px-6 py-3 placeholder:text-slate-500 text-base font-medium"
          />
          <button type="submit" className="absolute right-3 p-3 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-full transition-colors flex items-center justify-center">
            <Sparkles size={20} />
          </button>
        </form>
      </div>

      {/* 模态框: 提示词生词探索面板 */}
      {isDetailModalOpen && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-500/30 rounded-3xl w-full max-w-7xl shadow-[0_0_80px_rgba(168,85,247,0.15)] flex flex-col overflow-hidden h-[90vh]">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/50 shrink-0">
              <h3 className="text-xl font-bold flex items-center gap-3 text-purple-400">
                <Compass size={24} /> 核心概念具象化探索：<span className="text-white">「{detailData.word}」</span>
              </h3>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-slate-400 hover:text-white transition-colors p-2 bg-slate-800 rounded-full hover:bg-slate-700"><X size={20} /></button>
            </div>
            
            <div className="p-6 md:p-8 overflow-y-auto flex-1 custom-scrollbar">
              {isGeneratingDetail ? (
                <div className="flex flex-col items-center justify-center h-full py-20 text-purple-400 gap-5">
                  <Loader2 className="animate-spin" size={50} />
                  <p className="animate-pulse text-lg">正在全网检索资讯，并为您生成专属提示词与概念配图...</p>
                </div>
              ) : (
                <div className="flex flex-col lg:flex-row gap-6 h-full">
                  
                  {/* 左栏：高维提示词与配图 */}
                  <div className="flex-[4] flex flex-col gap-4 bg-white/5 p-5 rounded-2xl border border-white/5">
                    <div className="flex justify-between items-center pb-3 border-b border-white/10">
                      <div className="text-purple-400 font-bold flex items-center gap-2 text-lg">
                        <ImageIcon size={20} /> 8大维度配图提示词
                      </div>
                      {detailData.prompt && (
                        <button onClick={() => {
                          const match = detailData.prompt.match(/<english_prompt>([\s\S]*?)<\/english_prompt>/i);
                          const cleanPrompt = match ? match[1].trim() : detailData.prompt;
                          navigator.clipboard.writeText(cleanPrompt);
                          setIsPromptCopied(true);
                          setTimeout(() => setIsPromptCopied(false), 2000);
                        }} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 rounded-lg transition-all text-xs font-bold shrink-0">
                          {isPromptCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                          {isPromptCopied ? <span className="text-emerald-400">已复制英文</span> : '一键复制 Prompt'}
                        </button>
                      )}
                    </div>
                    
                    <div className="font-mono text-[13px] text-white/80 leading-relaxed whitespace-pre-wrap overflow-y-auto custom-scrollbar bg-black/20 p-4 rounded-xl flex-1 max-h-[300px]">
                      {detailData.prompt.replace(/<english_prompt>|<\/english_prompt>/gi, '\n==============================\n【纯英文 Prompt 提取区】\n==============================\n')}
                    </div>

                    <div className="mt-2 h-64 bg-black/40 rounded-xl overflow-hidden relative border border-white/5 flex items-center justify-center shrink-0">
                      {detailData.image ? (
                        <img src={detailData.image} alt="Generated Concept" className="w-full h-full object-contain" />
                      ) : (
                        <div className="flex flex-col items-center gap-3 text-purple-400/50">
                          <Loader2 className="animate-spin" size={32} />
                          <span>AI 正在为您极速绘制概念配图...</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 右栏：真实新闻资讯 */}
                  <div className="flex-[3] flex flex-col gap-4 bg-white/5 p-5 rounded-2xl border border-white/5">
                    <div className="text-amber-400 font-bold pb-3 border-b border-white/10 flex items-center gap-2 text-lg">
                      <Quote size={20} /> 全网真实资讯报道
                    </div>
                    
                    <div className="flex flex-col gap-4 h-full flex-1">
                      <div className="text-white/80 leading-loose whitespace-pre-wrap text-sm overflow-y-auto custom-scrollbar pr-2 flex-1">
                         {detailData.newsText}
                      </div>
                      {detailData.newsSources && detailData.newsSources.length > 0 && (
                        <div className="mt-2 pt-4 border-t border-white/10 shrink-0">
                          <h5 className="text-xs font-bold text-white/50 mb-3 uppercase tracking-wider">真实参考来源</h5>
                          <div className="flex flex-col gap-2 max-h-[140px] overflow-y-auto custom-scrollbar">
                            {detailData.newsSources.map((source, idx) => (
                              <a key={idx} href={source.uri} target="_blank" rel="noopener noreferrer" className="group flex flex-col p-2.5 bg-black/20 hover:bg-black/40 border border-white/5 hover:border-amber-500/30 rounded-lg transition-all">
                                <span className="text-amber-200/80 font-medium group-hover:text-amber-400 transition-colors line-clamp-1 text-xs">{source.title}</span>
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

      {/* 模态框: 目标收敛 */}
      {isConvergenceModalOpen && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-cyan-500/30 rounded-3xl w-full max-w-2xl shadow-[0_0_80px_rgba(6,182,212,0.15)] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/50 shrink-0">
              <h3 className="text-xl font-bold flex items-center gap-3 text-cyan-400"><Target size={24} /> 目标收敛与聚类</h3>
              <button onClick={() => {setIsConvergenceModalOpen(false); setGeneratedConvergence(''); setConvergenceGoal('');}} className="text-slate-400 hover:text-white transition-colors p-2 bg-slate-800 rounded-full hover:bg-slate-700"><X size={20} /></button>
            </div>
            
            <div className="p-6 md:p-8 overflow-y-auto max-h-[70vh] flex flex-col gap-6">
              {!generatedConvergence && !isGeneratingConvergence ? (
                <>
                  <div className="bg-cyan-500/10 border border-cyan-500/20 p-4 rounded-xl text-cyan-200 text-sm leading-relaxed">
                    <b>收敛模式：</b> AI 将扫描画布上您选中的词汇，围绕您输入的目标，提取最关联的 10 个核心关键词进行结构化的策略聚类。
                  </div>
                  <div className="flex flex-col gap-3">
                    <label className="text-slate-300 font-medium">您的最终业务/创意目标是什么？</label>
                    <textarea 
                      value={convergenceGoal}
                      onChange={(e) => setConvergenceGoal(e.target.value)}
                      placeholder="例如：我要做儿童节营销策划..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors resize-none h-32"
                    />
                  </div>
                  <div className="flex justify-end pt-2">
                    <button onClick={handleRunConvergence} disabled={!convergenceGoal.trim()} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                      <Focus size={18} /> 开始收敛聚类
                    </button>
                  </div>
                </>
              ) : isGeneratingConvergence ? (
                <div className="flex flex-col items-center justify-center py-16 text-cyan-400 gap-5">
                  <Loader2 className="animate-spin" size={50} />
                  <p className="animate-pulse text-lg">正在扫描提取策略分类...</p>
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  <div className="text-cyan-400 font-medium pb-2 border-b border-slate-800">
                    针对目标：<span className="text-white">“{convergenceGoal}”</span>
                  </div>
                  <div className="text-slate-200 leading-relaxed whitespace-pre-wrap text-base">
                    {generatedConvergence}
                  </div>
                </div>
              )}
            </div>
            {generatedConvergence && !isGeneratingConvergence && (
              <div className="p-6 border-t border-slate-800 bg-slate-800/30 flex justify-end">
                <button onClick={() => {setGeneratedConvergence(''); setConvergenceGoal('');}} className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-all font-medium text-sm">
                  重新输入目标
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 模态框: 创意文案 */}
      {isIdeaModalOpen && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
              <h3 className="text-xl font-bold flex items-center gap-2 text-emerald-400"><Sparkles size={20} /> 导出创意方案</h3>
              <button onClick={() => setIsIdeaModalOpen(false)} className="text-slate-400 hover:text-white transition-colors"><X size={24} /></button>
            </div>
            <div className="p-8 overflow-y-auto flex-1 text-slate-200 leading-relaxed whitespace-pre-wrap text-base">
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center py-12 text-emerald-400 gap-4"><Loader2 className="animate-spin" size={40} /><p className="animate-pulse">AI正在将您的灵感火花串联...</p></div>
              ) : (
                <p>{generatedIdea}</p>
              )}
            </div>
            {!isGenerating && (
              <div className="p-6 border-t border-slate-800 bg-slate-800/30 flex justify-end gap-3">
                <button onClick={() => navigator.clipboard.writeText(generatedIdea)} className="flex items-center gap-2 px-6 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl transition-colors font-medium"><Copy size={16} /> 复制文案</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 模态框: 灵感跨界 */}
      {isInsightModalOpen && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-orange-500/30 rounded-3xl w-full max-w-md shadow-[0_0_50px_rgba(249,115,22,0.15)] overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
              <h3 className="text-xl font-bold flex items-center gap-2 text-orange-400"><Zap size={20} /> 跨界模式结果</h3>
              <button onClick={() => setIsInsightModalOpen(false)} className="text-slate-400 hover:text-white transition-colors"><X size={24} /></button>
            </div>
            <div className="p-8 overflow-y-auto text-slate-200 leading-relaxed whitespace-pre-wrap text-base font-medium">
              {isGeneratingInsight ? (
                <div className="flex flex-col items-center justify-center py-12 text-orange-400 gap-4"><Loader2 className="animate-spin" size={40} /><p className="animate-pulse">正在生成跨界灵感...</p></div>
              ) : (
                <p>{generatedInsight}</p>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}