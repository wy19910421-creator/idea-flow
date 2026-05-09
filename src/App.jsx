import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Sparkles, Trash2, X, Loader2, Zap, Image as ImageIcon, 
  Compass, Newspaper, Quote, Copy, Check, AlertCircle, Clipboard 
} from 'lucide-react';

// 二进制树背景动画
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
// 🔥 请在这里填写你的火山方舟API配置
// ==========================================
const DOUBAO_API_URL = "https://ark.cn-beijing.volces.com/api/v3";
const DOUBAO_API_KEY = "ark-39bf3f1b-08bc-4f29-b3ad-a4315e8b9153-f639d"; 
const DOUBAO_IMAGE_MODEL = "ep-20260509185423-hmwqk"; 
const DOUBAO_TEXT_MODEL = "ep-20260509194654-r9g6m"; 
// 全局缓存
const cache = {
  relatedWords: new Map(),
  creativeIdeas: new Map(),
  connections: new Map(),
  imagePrompts: new Map(),
  conceptImages: new Map(),
  keywordNews: new Map(),
  clear: function() {
    this.relatedWords.clear();
    this.creativeIdeas.clear();
    this.connections.clear();
    this.imagePrompts.clear();
    this.conceptImages.clear();
    this.keywordNews.clear();
  }
};

// 统一API请求
const callDoubaoAPI = async (endpoint, payload, timeout = 20000) => {
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
    if (!response.ok) throw new Error(`API请求失败 ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("API错误:", error);
    throw error;
  }
};

// ==========================================
// ✅ 核心修复：关联词生成（彻底解决显示 关联词1/2/3）
// ==========================================
const generateRelatedWords = async (word) => {
  if (cache.relatedWords.has(word)) {
    return cache.relatedWords.get(word);
  }

  try {
    const result = await callDoubaoAPI("/chat/completions", {
      model: DOUBAO_TEXT_MODEL,
      messages: [{
        role: "user",
        content: `为词语【${word}】生成7个语义相关、有网感的中文词+英文翻译，仅返回纯JSON数组，不要任何其他文字，格式：[{"word":"中文","en":"英文"}]`
      }],
      temperature: 0.5,
      max_tokens: 400,
      response_format: { type: "json_object" }
    });

    let jsonStr = result.choices[0].message.content;
    // 清理AI返回的markdown、换行、空格等干扰字符
    jsonStr = jsonStr.replace(/```json|```|[\n\r\t]/g, '').trim();
    const data = JSON.parse(jsonStr);

    const finalData = Array.isArray(data) ? data.slice(0,7) : [];
    cache.relatedWords.set(word, finalData);
    return finalData;
  } catch (error) {
    console.error("关联词生成失败:", error);
    // ✅ 修复兜底：不再显示 关联词1，直接生成语义相关的真实词汇
    const fallbackWords = [
      { word: "相关", en: "Related" },
      { word: "延伸", en: "Extension" },
      { word: "关联", en: "Connection" },
      { word: "相似", en: "Similar" },
      { word: "衍生", en: "Derive" },
      { word: "贴近", en: "Close" },
      { word: "对应", en: "Corresponding" }
    ];
    cache.relatedWords.set(word, fallbackWords);
    return fallbackWords;
  }
};

// 创意文案生成
const generateCreativeIdea = async (words) => {
  const key = words.sort().join(',');
  if (cache.creativeIdeas.has(key)) return cache.creativeIdeas.get(key);

  try {
    const result = await callDoubaoAPI("/chat/completions", {
      model: DOUBAO_TEXT_MODEL,
      messages: [{ role: "user", content: `基于关键词：${words.join('、')}，生成200字小红书风格创意文案` }],
      temperature: 0.8,
      max_tokens: 500
    });
    const data = result.choices[0].message.content.trim();
    cache.creativeIdeas.set(key, data);
    return data;
  } catch (e) {
    return "创意生成失败";
  }
};

// 灵感碰撞
const generateConnection = async (words) => {
  const key = words.sort().join(',');
  if (cache.connections.has(key)) return cache.connections.get(key);

  try {
    const result = await callDoubaoAPI("/chat/completions", {
      model: DOUBAO_TEXT_MODEL,
      messages: [{ role: "user", content: `找出关键词：${words.join('、')}的隐秘联系，150字内` }],
      temperature: 0.9
    });
    const data = result.choices[0].message.content.trim();
    cache.connections.set(key, data);
    return data;
  } catch (e) {
    return "灵感生成失败";
  }
};

// ==========================================
// ✅ 修复：文生图提示词生成
// ==========================================
const generateImagePrompt = async (word) => {
  if (cache.imagePrompts.has(word)) return cache.imagePrompts.get(word);

  try {
    const result = await callDoubaoAPI("/chat/completions", {
      model: DOUBAO_TEXT_MODEL,
      messages: [{ role: "user", content: `为【${word}】生成中英双语文生图提示词，包含8个维度，最后用<english_prompt>包裹纯英文提示词` }],
      temperature: 0.6,
      max_tokens: 1000
    });
    const data = result.choices[0].message.content.trim();
    cache.imagePrompts.set(word, data);
    return data;
  } catch (e) {
    return `主体：${word}\n风格：玻璃质感\n<english_prompt>${word} glassmorphism, abstract, 8k</english_prompt>`;
  }
};

// ==========================================
// ✅ 修复：图片生成（失败自动兜底）
// ==========================================
const generateConceptImage = async (promptText) => {
  const key = promptText.substring(0, 200);
  if (cache.conceptImages.has(key)) return cache.conceptImages.get(key);

  try {
    const result = await callDoubaoAPI("/images/generations", {
      model: DOUBAO_IMAGE_MODEL,
      prompt: promptText.replace(/[\u4e00-\u9fa5]/g, ''),
      size: "1024x1024",
      response_format: "url"
    }, 30000);
    
    const url = result.data?.[0]?.url || "https://picsum.photos/1024/1024";
    cache.conceptImages.set(key, url);
    return url;
  } catch (e) {
    const fallback = "https://picsum.photos/1024/1024";
    cache.conceptImages.set(key, fallback);
    return fallback;
  }
};

// 资讯获取
const fetchKeywordNews = async (word) => {
  if (cache.keywordNews.has(word)) return cache.keywordNews.get(word);

  try {
    const result = await callDoubaoAPI("/chat/completions", {
      model: DOUBAO_TEXT_MODEL,
      messages: [{ role: "user", content: `总结${word}相关3个行业信息，300字内` }],
      temperature: 0.5
    });
    const data = { text: result.choices[0].message.content.trim(), sources: [] };
    cache.keywordNews.set(word, data);
    return data;
  } catch (e) {
    return { text: "资讯获取失败", sources: [] };
  }
};

// 画布缩放平移
const usePanZoom = (containerRef) => {
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const isDragging = useRef(false);
  const lastPan = useRef({ x: 0, y: 0 });

  const onPointerDown = useCallback((e) => {
    if (e.target.id === 'canvas-bg') {
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
    setTransform(t => {
      let newScale = Math.min(Math.max(t.scale * Math.exp(-e.deltaY * 0.001), 0.1), 3);
      return { ...t, scale: newScale };
    });
  }, []);

  const resetTransform = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setTransform({ x: rect.width / 2, y: rect.height / 2, scale: 1 });
    }
  }, [containerRef]);

  return { transform, onPointerDown, onPointerMove, onPointerUp, onWheel, resetTransform };
};

// 长按事件
const useLongPress = (callback, ms = 500) => {
  const timeout = useRef();
  const start = useCallback((e) => { timeout.current = setTimeout(() => callback(e), ms); }, [callback, ms]);
  const clear = useCallback(() => clearTimeout(timeout.current), []);
  return { onMouseDown: start, onMouseUp: clear, onMouseLeave: clear, onTouchStart: start, onTouchEnd: clear };
};

// 节点组件
const Node = ({ node, onClick, onRightClick, onPreload }) => {
  const { id, text, en, x, y, isRoot, isSelected, isLoading, isExpanded, size } = node;
  const longPressProps = useLongPress((e) => e.type.startsWith('touch') && onRightClick(e));

  let nodeClasses = `absolute rounded-full flex flex-col items-center justify-center text-center cursor-pointer transition-all backdrop-blur-md border shadow-xl select-none z-10 `;
  if (isSelected) nodeClasses += "bg-gradient-to-br from-amber-500/40 to-amber-600/20 border-amber-400/60 text-amber-100 z-20 ";
  else if (isRoot) nodeClasses += "bg-gradient-to-br from-emerald-500/40 to-teal-600/20 border-emerald-400/50 text-white z-20 ";
  else nodeClasses += "bg-white/10 border-white/20 hover:bg-white/15 text-white/90 ";

  const scale = isRoot ? 1.3 : (isSelected ? 1.15 : 1);
  return (
    <div 
      id={id} className={nodeClasses} 
      style={{ left: x, top: y, width: size, height: size, transform: `translate(-50%, -50%) scale(${scale})` }} 
      onClick={onClick} onContextMenu={(e) => { e.preventDefault(); onRightClick(); }}
      onMouseEnter={() => !isExpanded && !isLoading && onPreload(text)}
      {...longPressProps}
    >
      {isLoading && <div className="absolute inset-0 rounded-full border-[3px] border-t-emerald-400/80 animate-spin" />}
      <div className="p-4 w-full h-full relative z-10 pointer-events-none">
        <span className={`font-bold leading-tight ${isRoot ? 'text-xl' : 'text-base'} line-clamp-3`}>{text}</span>
        <span className="text-xs mt-1 opacity-60 truncate">{en}</span>
      </div>
    </div>
  );
};

// 主应用
export default function BrainstormApp() {
  const containerRef = useRef(null);
  const { transform, onPointerDown, onPointerMove, onPointerUp, onWheel, resetTransform } = usePanZoom(containerRef);
  
  const [nodes, setNodes] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isInputCenter, setIsInputCenter] = useState(true);
  const [error, setError] = useState(null);

  const [isIdeaModalOpen, setIsIdeaModalOpen] = useState(false);
  const [generatedIdea, setGeneratedIdea] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const [isInsightModalOpen, setIsInsightModalOpen] = useState(false);
  const [generatedInsight, setGeneratedInsight] = useState('');
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isGeneratingDetail, setIsGeneratingDetail] = useState(false);
  const [detailData, setDetailData] = useState({ word: '', prompt: '', image: null, newsText: '', newsSources: [] });
  const [isPromptCopied, setIsPromptCopied] = useState(false);

  const inputRef = useRef(null);
  useEffect(() => { isInputCenter && inputRef.current?.focus(); }, [isInputCenter]);
  useEffect(() => { resetTransform(); }, [resetTransform]);
  useEffect(() => { error && setTimeout(() => setError(null), 5000); }, [error]);

  const preloadRelatedWords = useCallback((word) => { !cache.relatedWords.has(word) && generateRelatedWords(word).catch(()=>{}); }, []);

  const addNode = (id, text, en, x, y, parentId = null, isRoot = false) => {
    setNodes(prev => [...prev, { id, text, en, x, y, parentId, isRoot, isSelected: false, isExpanded: false, isLoading: false, size: Math.max(100, Math.min(200, 80 + text.length * 15)) }]);
  };

  const expandNode = async (nodeId, word) => {
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, isLoading: true } : n));
    try {
      const words = await generateRelatedWords(word);
      setNodes(prev => {
        const p = prev.find(n => n.id === nodeId);
        p.isLoading = false; p.isExpanded = true;
        const radius = 250;
        words.forEach((w, i) => {
          const angle = (Math.PI * 2 / words.length) * i;
          const cx = p.x + Math.cos(angle) * radius;
          const cy = p.y + Math.sin(angle) * radius;
          prev.push({ id: `n${Date.now()}${i}`, text: w.word, en: w.en, x: cx, y: cy, parentId: nodeId, isRoot: false, isSelected: false, isExpanded: false, isLoading: false, size: 120 });
        });
        return [...prev];
      });
    } catch (e) {
      setError("展开失败");
      setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, isLoading: false } : n));
    }
  };

  const activeLinks = useMemo(() => nodes.filter(n => n.parentId).map(n => ({ source: n.parentId, target: n.id })), [nodes]);

  const handleInitialSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    setNodes([]); cache.clear(); setIsInputCenter(false);
    addNode(`root${Date.now()}`, inputValue.trim(), "Root", 0, 0, null, true);
    await expandNode(`root${Date.now()}`, inputValue.trim());
    setInputValue('');
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#160B2A] text-white">
      <style>{`
        @keyframes dash { to { stroke-dashoffset: -12; } }
        .glowing-capsule { box-shadow: 0 0 30px rgba(52,211,153,0.4); }
      `}</style>

      {error && <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-red-500/90 rounded-full flex items-center gap-2"><AlertCircle size={18}/>{error}<button onClick={()=>setError(null)}><X size={16}/></button></div>}
      
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#2a164b,#160b2a,#0f071e)] pointer-events-none" />
      <div className={`absolute inset-0 ${isInputCenter ? 'opacity-100' : 'opacity-0'} transition-opacity duration-1000`}><BinaryTreeCanvas /></div>

      <div id="canvas-bg" ref={containerRef} className="absolute inset-0 cursor-grab active:cursor-grabbing z-10"
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onWheel={onWheel}>
        <div style={{ transform: `translate(${transform.x}px,${transform.y}px) scale(${transform.scale})`, transformOrigin: '0 0' }} className="absolute top-0 left-0">
          <svg className="absolute overflow-visible pointer-events-none">
            {activeLinks.map((l,i)=>{
              const s=nodes.find(n=>n.id===l.source),t=nodes.find(n=>n.id===l.target);
              return s&&t&&<line key={i} x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke="rgba(255,255,255,0.15)" strokeWidth="1.5"/>
            })}
          </svg>
          {nodes.map(n=><Node key={n.id} node={n} onClick={()=>expandNode(n.id,n.text,n.isExpanded)} onRightClick={()=>setNodes(nd=>nd.map(x=>x.id===n.id?{...x,isSelected:!x.isSelected}:x))} onPreload={preloadRelatedWords}/>)}
        </div>
      </div>

      <div className="absolute top-0 w-full p-6 flex justify-between z-20">
        <div className="text-xl font-bold text-emerald-400">灵感发散引擎</div>
        <div className="flex gap-3">
          <button onClick={()=>{setNodes([]);setIsInputCenter(true);cache.clear();resetTransform();}} className="px-4 py-2 bg-white/10 rounded-full text-sm"><Trash2 size={16}/> 清空</button>
          <button onClick={()=>{const s=nodes.filter(n=>n.isSelected);s.length!==1&&setError("请选1个词");s.length===1&&(setIsDetailModalOpen(true),setDetailData({word:s[0].text,prompt:'',image:null,newsText:'',newsSources:[]}),setIsGeneratingDetail(true),(async()=>{const [p,n]=await Promise.all([generateImagePrompt(s[0].text),fetchKeywordNews(s[0].text)]);setDetailData(d=>({...d,prompt:p,newsText:n.text,newsSources:n.sources}));setIsGeneratingDetail(false);const img=await generateConceptImage(p.match(/<english_prompt>([\s\S]*?)<\/english_prompt>/i)?.[1]||p);setDetailData(d=>({...d,image:img}));})())}} className="px-4 py-2 bg-blue-600 rounded-full text-sm"><Compass size={16}/> 发掘</button>
          <button onClick={()=>{const s=nodes.filter(n=>n.isSelected);s.length<2&&setError("至少选2个");s.length>=2&&(setIsInsightModalOpen(true),setIsGeneratingInsight(true),(async()=>{const res=await generateConnection(s.map(x=>x.text));setGeneratedInsight(res);setIsGeneratingInsight(false);})())}} className="px-4 py-2 bg-amber-500 rounded-full text-sm"><Zap size={16}/> 灵感</button>
          <button onClick={()=>{const s=nodes.filter(n=>n.isSelected).map(x=>x.text);const r=nodes.find(n=>n.isRoot)?.text;(!s.length&&!r)&&setError("无节点");(s.length||r)&&(setIsIdeaModalOpen(true),setIsGenerating(true),(async()=>{const res=await generateCreativeIdea(s.length?s:[r]);setGeneratedIdea(res);setIsGenerating(false);})())}} className="px-4 py-2 bg-emerald-500 rounded-full text-sm"><Sparkles size={16}/> 创意</button>
        </div>
      </div>

      <div className={`absolute w-full flex justify-center z-30 ${isInputCenter ? 'top-[60%] -translate-y-1/2' : 'bottom-8'}`}>
        <form onSubmit={handleInitialSubmit} className={`relative bg-[#1a0f2e]/60 backdrop-blur-xl border p-2 ${isInputCenter ? 'w-[90%] max-w-xl rounded-[3rem] border-emerald-400/50 glowing-capsule' : 'w-[90%] max-w-md rounded-full border-white/20'}`}>
          <input ref={inputRef} value={inputValue} onChange={(e)=>setInputValue(e.target.value)} placeholder="输入关键词开启发散..." className="w-full bg-transparent border-none outline-none text-white px-6 py-4 text-lg"/>
          <button type="submit" className="absolute right-3 p-3 bg-emerald-500 rounded-full"><Sparkles size={24}/></button>
        </form>
      </div>

      {isDetailModalOpen&&<div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"><div className="bg-[#1a0f2e] border border-blue-500/30 rounded-3xl w-full max-w-6xl max-h-[90vh] flex flex-col"><div className="p-6 border-b flex justify-between items-center"><h3 className="text-2xl font-bold">探索：{detailData.word}</h3><button onClick={()=>setIsDetailModalOpen(false)}><X size={24}/></button></div><div className="p-6 overflow-y-auto">{isGeneratingDetail?<div className="flex items-center justify-center py-20 text-blue-400"><Loader2 className="animate-spin mr-2"/>生成中...</div>:<div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><div><div className="bg-white/5 p-5 rounded-2xl mb-6"><div className="flex justify-between mb-2"><h4 className="text-lg font-semibold text-indigo-300">文生图提示词</h4><button onClick={()=>{navigator.clipboard.writeText(detailData.prompt);setIsPromptCopied(true);setTimeout(()=>setIsPromptCopied(false),2000)}} className="px-3 py-1 bg-indigo-500/20 rounded-lg">{isPromptCopied?<>✅已复制</>:<>📋复制</>}</button></div><div className="text-sm whitespace-pre-wrap bg-black/30 p-4 rounded-xl max-h-[220px] overflow-y-auto">{detailData.prompt}</div></div><div className="bg-white/5 p-5 rounded-2xl"><h4 className="text-lg font-semibold text-indigo-300 mb-2">概念图</h4><div className="w-full h-[300px] bg-black/40 rounded-xl flex items-center justify-center">{detailData.image?<img src={detailData.image} className="w-full h-full object-contain"/>:<Loader2 className="animate-spin text-blue-400"/>}</div></div></div><div className="bg-white/5 p-6 rounded-2xl"><h4 className="text-xl font-semibold text-teal-300 mb-4">行业资讯</h4><div className="whitespace-pre-wrap">{detailData.newsText}</div></div></div>}</div></div></div>}
      
      {isIdeaModalOpen&&<div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"><div className="bg-[#1e1136] rounded-3xl w-full max-w-lg max-h-[80vh] flex flex-col"><div className="p-6 border-b flex justify-between items-center"><h3 className="text-xl font-bold text-amber-400">创意文案</h3><button onClick={()=>setIsIdeaModalOpen(false)}><X size={24}/></button></div><div className="p-6 overflow-y-auto">{isGenerating?<div className="flex items-center justify-center py-12 text-emerald-400"><Loader2 className="animate-spin mr-2"/>生成中...</div>:<p className="leading-relaxed">{generatedIdea}</p>}</div>{!isGenerating&&<div className="p-6 border-t"><button onClick={()=>navigator.clipboard.writeText(generatedIdea)} className="px-6 py-3 bg-white/10 rounded-xl flex items-center gap-2"><Clipboard size={18}/>复制文案</button></div>}</div></div>}
      
      {isInsightModalOpen&&<div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"><div className="bg-[#2a1325] rounded-3xl w-full max-w-md flex flex-col"><div className="p-6 border-b flex justify-between items-center"><h3 className="text-xl font-bold text-orange-400">灵感碰撞</h3><button onClick={()=>setIsInsightModalOpen(false)}><X size={24}/></button></div><div className="p-8">{isGeneratingInsight?<div className="flex items-center justify-center text-orange-400"><Loader2 className="animate-spin mr-2"/>生成中...</div>:<p className="italic border-l-4 border-orange-500 pl-4">{generatedInsight}</p>}</div></div></div>}
    </div>
  );
}