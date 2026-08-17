import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Languages as LanguagesIcon,
  RotateCcw,
  Bot,
  User,
  AlertCircle,
  ChevronRight,
  Settings as SettingsIcon,
  Key,
  Paperclip,
  X,
  Image as ImageIcon,
  Eye,
} from "lucide-react";
import { useAiSettingsStore } from "@/store/useAiSettingsStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useNavigate } from "react-router-dom";

// ── Attachment type ───────────────────────────────────────────
interface Attachment {
  dataUrl: string;   // full data:image/...;base64,... URI
  base64: string;    // raw base64 without prefix
  mimeType: string;
  name: string;
  size: number;
}

// ── Message type ─────────────────────────────────────────────
interface Message {
  role: "user" | "assistant";
  content: string;
  attachment?: Attachment;
}

// ── Providers that support vision ────────────────────────────
const VISION_PROVIDERS = new Set(['groq', 'gemini', 'openrouter']);
const VISION_MODELS: Record<string, string[]> = {
  groq: ['llama-3.2-11b-vision-preview', 'llama-3.2-90b-vision-preview'],
  gemini: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-exp', 'gemini-1.5-flash-8b'],
  openrouter: [
    'meta-llama/llama-3.2-11b-vision-instruct:free',
    'google/gemini-2.0-flash-exp:free',
    'meta-llama/llama-3.2-90b-vision-instruct:free',
  ],
};

function supportsVision(provider: string, model: string): boolean {
  if (!VISION_PROVIDERS.has(provider)) return false;
  if (provider === 'gemini') return true; // all gemini models support vision
  return VISION_MODELS[provider]?.some(m => model.includes(m.split(':')[0])) ?? false;
}

// ── Rich Text Formatter ──────────────────────────────────────
function FormattedText({ text }: { text: string }) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  const renderInline = (line: string, key: number): React.ReactNode => {
    const parts = line.split(/(```[^`]+```|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return (
      <span key={key}>
        {parts.map((part, pi) => {
          if (part.startsWith('`') && part.endsWith('`'))
            return <code key={pi} className="bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded text-[12px] font-mono">{part.replace(/^`+|`+$/g, '')}</code>;
          if (part.startsWith('**') && part.endsWith('**'))
            return <strong key={pi} className="font-bold text-slate-900 dark:text-white">{part.slice(2, -2)}</strong>;
          if (part.startsWith('*') && part.endsWith('*'))
            return <em key={pi} className="italic text-slate-600 dark:text-slate-300">{part.slice(1, -1)}</em>;
          return part;
        })}
      </span>
    );
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) { elements.push(<div key={`sp-${i}`} className="h-2" />); i++; continue; }

    if (/^(-{3,}|_{3,}|\*{3,})$/.test(trimmed)) {
      elements.push(<hr key={`hr-${i}`} className="border-slate-200 dark:border-slate-700 my-2" />); i++; continue;
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const cls = [
        'text-base font-extrabold text-slate-900 dark:text-white mt-3 mb-1',
        'text-sm font-bold text-slate-800 dark:text-slate-100 mt-2 mb-1',
        'text-[13px] font-semibold text-blue-700 dark:text-blue-400 mt-1.5 mb-0.5',
      ];
      elements.push(<div key={`h-${i}`} className={cls[level - 1] ?? cls[2]}>{renderInline(headingMatch[2], i)}</div>);
      i++; continue;
    }

    if (/^\d+\.\s/.test(trimmed)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        const content = lines[i].trim().replace(/^\d+\.\s/, '');
        const num = items.length + 1;
        items.push(
          <div key={i} className="flex gap-2.5 items-start">
            <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{num}</span>
            <span className="flex-1 text-[13px] leading-relaxed">{renderInline(content, i)}</span>
          </div>
        );
        i++;
      }
      elements.push(<div key={`ol-${i}`} className="space-y-1.5 my-1">{items}</div>); continue;
    }

    if (/^[-•*]\s/.test(trimmed)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^[-•*]\s/.test(lines[i].trim())) {
        const content = lines[i].trim().replace(/^[-•*]\s/, '');
        items.push(
          <div key={i} className="flex gap-2 items-start">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-[7px]" />
            <span className="flex-1 text-[13px] leading-relaxed">{renderInline(content, i)}</span>
          </div>
        );
        i++;
      }
      elements.push(<div key={`ul-${i}`} className="space-y-1.5 my-1 pl-1">{items}</div>); continue;
    }

    elements.push(<p key={`p-${i}`} className="text-[13px] leading-relaxed">{renderInline(line, i)}</p>);
    i++;
  }

  return <div className="space-y-0.5">{elements}</div>;
}

// ── i18n strings ──────────────────────────────────────────────
const STRINGS: Record<string, any> = {
  si: {
    title: "කෘෂි බුද්ධි සහායක",
    subtitle: "Krushi AI Intelligence Engine",
    newChat: "නව සංවාදය",
    welcomeTitle: "ආයුබෝවන්!",
    welcomeSub: "කෘෂිකාර්මික උපදෙස් සහ තොරතුරු සඳහා මම සූදානම්",
    placeholder: "ප්‍රශ්නය ලියන්න හෝ රූපයක් attach කරන්න...",
    systemPrompt:
      "ඔබ හිතවත් සහ දක්ෂ කෘෂිකාර්මික AI සහායකයෙකි. " +
      "ඔබ සෑම විටම සිංහල භාෂාවෙන් පිළිතුරු දෙයි. " +
      "## ආකෘතිකරණ නීති:\n" +
      "- **තද ලෙස** වැදගත් නාම, ප්‍රමාණ, හා නිර්දේශ ලියන්න.\n" +
      "- දිගු පිළිතුරු සඳහා ## මාතෘකා සහ - ලැයිස්තු භාවිතා කරන්න.\n" +
      "- කිහිපයක් ඇති දේ සඳහා 1. 2. 3. ලෙස අනුක්‍රමික ලැයිස්තු භාවිත කරන්න.\n" +
      "- කෙටි, ස්නේහශීලී වාක්‍ය භාවිත කරන්න — ඉතා දිගු ඡේද වළකින්න.\n" +
      "- සෑම පිළිතුරකම ප්‍රායෝගික ඉඟි ඇතුළත් කරන්න.\n" +
      "- ✅ ✨ 🌿 ⚠️ වැනි ඉමෝජි සුදුසු තැන් වල භාවිත කරන්න.\n" +
      "- රූපයක් ලැබෙන විට: රූපය ස්ථිර ලෙස විශ්ලේෂණය කර, රෝග, ගැටළු, හෝ විශේෂාංග ගෙන හැර දක්වන්න.",
    chips: [
      { label: "වී වගාව", q: "වී වගාව සඳහා හොඳම පොහොර කාලසටහන ගෙන හැර දක්වන්න." },
      { label: "කුරුඳු", q: "කුරුඳු තැලීමේදී අවධානය යොමු කළ යුතු ප්‍රධාන කරුණු 5ක් දක්වන්න." },
      { label: "පොල් රෝග", q: "පොල් ගසට ඇති වන රෝග හා ඒවා පාලනය කරන ක්‍රම." },
      { label: "දිවියන් හානි", q: "ගොවිතැනට දිවියන් ඇති කරන හානි අවම කරන ක්‍රම." },
      { label: "ජල කළමනාකරණය", q: "නියඟ කාලයේ ගොවිතැනේ ජල කළමනාකරණය පිළිබඳ උපදෙස්." },
      { label: "රසායනික කෘමිනාශක", q: "ආරක්ෂිතව රසායනික කෘමිනාශක භාවිතා කිරීමේ ක්‍රමෝපායන්." },
    ],
  },
  en: {
    title: "Krushi Intel Engine",
    subtitle: "Advanced Agronomic Advisor",
    newChat: "New Session",
    welcomeTitle: "Welcome",
    welcomeSub: "Agricultural intelligence at your service",
    placeholder: "Ask a question or attach an image for analysis...",
    systemPrompt:
      "You are a friendly, expert Agronomic AI Assistant with deep knowledge in farming, crop science, soil health, pest management, and sustainable agriculture. " +
      "\n\n## Formatting Rules (always follow these):\n" +
      "- Use **bold** for key terms, quantities, and recommendations.\n" +
      "- Use ## Section Headings for multi-part answers.\n" +
      "- Use numbered lists (1. 2. 3.) for step-by-step processes.\n" +
      "- Use bullet lists (- item) for feature/option comparisons.\n" +
      "- Keep sentences short and conversational — avoid walls of text.\n" +
      "- Always include at least one practical actionable tip.\n" +
      "- Use emojis like ✅ 🌾 💧 ⚠️ 🌿 where relevant to improve readability.\n" +
      "- End every response with a brief **Pro Tip** or a follow-up question.\n" +
      "- When an image is provided: analyze it thoroughly. Identify crop diseases, pests, soil issues, or plant health markers visible in the image and provide specific recommendations.",
    chips: [
      { label: "Paddy Fertilizer", q: "What is the best fertilizer schedule for paddy cultivation?" },
      { label: "Cinnamon Quality", q: "Give me 5 key steps to improve cinnamon quality during processing." },
      { label: "Coconut Pests", q: "What are the most common coconut tree diseases and how to control them?" },
      { label: "Soil Health", q: "How do I improve soil health naturally without chemicals?" },
      { label: "Water Management", q: "Best water management practices for drought-resistant farming." },
      { label: "Organic Farming", q: "How can I transition from conventional to organic farming step by step?" },
    ],
  },
};

// ── API types ─────────────────────────────────────────────────
type ApiMessage = {
  role: string;
  content: string | { type: string; [key: string]: any }[];
};

// ── API Caller ────────────────────────────────────────────────
async function callLLM(
  provider: string,
  apiKey: string,
  model: string,
  temperature: number,
  maxTokens: number,
  systemPrompt: string,
  messages: { role: string; content: string; attachment?: Attachment }[]
): Promise<string> {

  // Helper: build OpenAI-compatible content array for a message
  const buildOpenAIContent = (content: string, attachment?: Attachment): string | { type: string; [k: string]: any }[] => {
    if (!attachment) return content;
    return [
      { type: 'text', text: content || 'Please analyze this image.' },
      { type: 'image_url', image_url: { url: attachment.dataUrl } },
    ];
  };

  // ── Groq ─────────────────────────────────────────────────────
  if (provider === 'groq') {
    const apiMessages: ApiMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: buildOpenAIContent(m.content, m.attachment) })),
    ];
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, temperature, max_tokens: maxTokens, messages: apiMessages }),
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `Groq error ${res.status}`); }
    return (await res.json()).choices?.[0]?.message?.content ?? 'No response.';
  }

  // ── Google Gemini ─────────────────────────────────────────────
  if (provider === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const contents = messages.map(m => {
      const parts: any[] = [];
      if (m.attachment) parts.push({ inline_data: { mime_type: m.attachment.mimeType, data: m.attachment.base64 } });
      if (m.content) parts.push({ text: m.content });
      if (!parts.length) parts.push({ text: 'Please analyze this image.' });
      return { role: m.role === 'assistant' ? 'model' : 'user', parts };
    });
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system_instruction: { parts: [{ text: systemPrompt }] }, contents, generationConfig: { temperature, maxOutputTokens: maxTokens } }),
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `Gemini error ${res.status}`); }
    return (await res.json()).candidates?.[0]?.content?.parts?.[0]?.text ?? 'No response.';
  }

  // ── OpenRouter ────────────────────────────────────────────────
  if (provider === 'openrouter') {
    const apiMessages: ApiMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: buildOpenAIContent(m.content, m.attachment) })),
    ];
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`, 'HTTP-Referer': window.location.origin, 'X-Title': 'Krushi AI' },
      body: JSON.stringify({ model, temperature, max_tokens: maxTokens, messages: apiMessages }),
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `OpenRouter error ${res.status}`); }
    return (await res.json()).choices?.[0]?.message?.content ?? 'No response.';
  }

  // ── Hugging Face (text-only) ──────────────────────────────────
  if (provider === 'huggingface') {
    const textMessages = messages.map(m => ({ ...m, content: m.content || '(image attached — vision not supported on this provider)' }));
    const combinedPrompt = `${systemPrompt}\n\n` +
      textMessages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n') +
      '\nAssistant:';
    const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ inputs: combinedPrompt, parameters: { max_new_tokens: maxTokens, temperature, return_full_text: false } }),
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error || `Hugging Face error ${res.status}`); }
    const data = await res.json();
    return (Array.isArray(data) ? data[0]?.generated_text : data?.generated_text)?.trim() ?? 'No response.';
  }

  throw new Error('Unknown provider');
}

// ── Image thumbnail in message bubble ────────────────────────
function AttachmentPreview({ attachment, small = false }: { attachment: Attachment; small?: boolean }) {
  const [zoomed, setZoomed] = useState(false);
  return (
    <>
      <div
        className={`relative group cursor-zoom-in overflow-hidden rounded-xl border border-white/20 ${small ? 'w-36 h-24' : 'w-full max-w-xs'} mb-2`}
        onClick={() => setZoomed(true)}
      >
        <img src={attachment.dataUrl} alt={attachment.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-all">
          <Eye size={18} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
      {zoomed && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 animate-in fade-in" onClick={() => setZoomed(false)}>
          <img src={attachment.dataUrl} alt={attachment.name} className="max-w-full max-h-full rounded-2xl shadow-2xl" />
          <button className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center" onClick={() => setZoomed(false)}>
            <X size={16} />
          </button>
        </div>
      )}
    </>
  );
}

// ── Message Bubble ────────────────────────────────────────────
function MessageBubble({ msg }: { msg: Message }) {
  const isAssistant = msg.role === "assistant";
  return (
    <div className={`flex gap-3 mb-4 animate-in fade-in slide-in-from-bottom-1 ${isAssistant ? 'justify-start' : 'justify-end flex-row-reverse'}`}>
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 border ${
        isAssistant
          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 border-blue-100 dark:border-blue-800'
          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
      }`}>
        {isAssistant ? <Bot size={14} /> : <User size={14} />}
      </div>
      <div className={`max-w-[85%] ${isAssistant ? 'text-left' : 'text-right'}`}>
        <div className={`px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed border ${
          isAssistant
            ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-100 dark:border-slate-800 rounded-tl-none shadow-sm'
            : 'bg-blue-600 text-white border-blue-500 rounded-tr-none font-medium'
        }`}>
          {msg.attachment && <AttachmentPreview attachment={msg.attachment} small />}
          <FormattedText text={msg.content} />
        </div>
      </div>
    </div>
  );
}

// ── Thinking Indicator ────────────────────────────────────────
function ThinkingIndicator() {
  return (
    <div className="flex gap-3 mb-4 animate-in fade-in">
      <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center flex-shrink-0 border border-blue-100 dark:border-blue-800">
        <Bot size={14} />
      </div>
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-4 py-2.5 rounded-2xl rounded-tl-none flex gap-1.5 items-center shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" />
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:0.2s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:0.4s]" />
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────
export default function Chatbot() {
  const { user } = useAuthStore();
  const { settings, fetch: fetchSettings } = useAiSettingsStore();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState("");
  const [lang, setLang] = useState("si");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const s = STRINGS[lang];
  const hasApiKey = !!settings.apiKey;
  const visionOk = supportsVision(settings.provider, settings.model);

  useEffect(() => { if (user?.id) fetchSettings(user.id); }, [user?.id, fetchSettings]);
  useEffect(() => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  const autoResize = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  };

  const handleNewChat = () => { setMessages([]); setError(""); setInput(""); setAttachment(null); };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // ── Process uploaded image file ───────────────────────────
  const processImageFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const MAX_MB = 10;
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`Image too large. Maximum size is ${MAX_MB}MB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const base64 = dataUrl.split(',')[1];
      setAttachment({ dataUrl, base64, mimeType: file.type, name: file.name, size: file.size });
      setError("");
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImageFile(file);
    e.target.value = '';
  };

  // ── Drag-and-drop handlers ────────────────────────────────
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processImageFile(file);
  };

  // ── Paste handler (paste image from clipboard) ────────────
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find(item => item.type.startsWith('image/'));
    if (imageItem) {
      const file = imageItem.getAsFile();
      if (file) { e.preventDefault(); processImageFile(file); }
    }
  };

  // ── Send message ──────────────────────────────────────────
  const sendMessage = async (overrideText?: string) => {
    const userText = (overrideText ?? input).trim();
    if ((!userText && !attachment) || thinking) return;

    setError("");
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const userMsg: Message = {
      role: "user",
      content: userText || (attachment ? "Please analyze this image." : ""),
      attachment: attachment ?? undefined,
    };
    setAttachment(null);

    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setThinking(true);

    try {
      const reply = await callLLM(
        settings.provider,
        settings.apiKey,
        settings.model,
        settings.temperature,
        settings.maxTokens,
        s.systemPrompt,
        updatedHistory.map(m => ({ role: m.role, content: m.content, attachment: m.attachment }))
      );
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error connecting to AI service.");
    } finally {
      setThinking(false);
    }
  };

  const canSend = hasApiKey && !thinking && (!!input.trim() || !!attachment);

  return (
    <div
      className="flex flex-col w-full space-y-8 pb-36 relative min-h-screen"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* ── Drag Overlay ── */}
      {isDragOver && (
        <div className="fixed inset-0 z-[90] bg-blue-500/10 border-2 border-dashed border-blue-500 rounded-3xl flex items-center justify-center animate-in fade-in pointer-events-none">
          <div className="text-center space-y-2">
            <ImageIcon size={40} className="text-blue-500 mx-auto" />
            <p className="text-blue-600 font-bold text-lg">Drop image to attach</p>
          </div>
        </div>
      )}

      {/* ── Standard Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Bot className="w-6 h-6 text-blue-500" />
            {s.title}
          </h1>
          <p className="text-sm text-slate-500 mt-1">{s.subtitle}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setLang(l => l === "si" ? "en" : "si")}
            className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-all shadow-sm">
            <LanguagesIcon size={12} className="text-blue-500" />
            {lang === "si" ? "English" : "සිංහල"}
          </button>
          <button onClick={handleNewChat}
            className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-all shadow-sm">
            <RotateCcw size={12} className="text-blue-500" />
            {s.newChat}
          </button>
          <button onClick={() => navigate('/settings', { state: { tab: 'ai_settings' } })}
            className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-all shadow-sm">
            <SettingsIcon size={12} className="text-blue-500" />
            AI Settings
          </button>
        </div>
      </div>

      {/* ── No API Key Banner ── */}
      {!hasApiKey && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl animate-in fade-in">
          <Key size={20} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">No AI API Key Configured</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              Configure your personal AI provider key in Settings → AI Assistant to start chatting.
            </p>
          </div>
          <button onClick={() => navigate('/settings', { state: { tab: 'ai_settings' } })}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all">
            <SettingsIcon size={12} /> Configure Now
          </button>
        </div>
      )}

      {/* ── Vision not supported warning ── */}
      {hasApiKey && attachment && !visionOk && (
        <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl text-xs animate-in fade-in">
          <AlertCircle size={15} className="text-orange-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-orange-700 dark:text-orange-400">Vision not supported by <strong>{settings.model}</strong></p>
            <p className="text-orange-600 dark:text-orange-500 mt-0.5">
              Switch to Gemini (any model), or Groq <code className="bg-orange-100 dark:bg-orange-900/40 px-1 rounded">llama-3.2-11b-vision-preview</code> for image analysis.
            </p>
          </div>
        </div>
      )}

      {/* ── Chat Flow ── */}
      <div className="w-full">
        {messages.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center space-y-6 max-w-lg mx-auto">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">{s.welcomeTitle}</h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest leading-relaxed">{s.welcomeSub}</p>
            </div>
            {/* Vision hint */}
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl">
              <ImageIcon size={14} className="text-blue-500 shrink-0" />
              <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                Attach a photo of your crop, leaf, or soil for instant AI diagnosis
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {s.chips.map((chip: any) => (
                <button key={chip.label} onClick={() => sendMessage(chip.q)} disabled={!hasApiKey}
                  className="group flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-left hover:border-blue-500 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest group-hover:text-blue-600 transition-colors">{chip.label}</span>
                  <ChevronRight size={10} className="text-slate-300 group-hover:text-blue-500" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto w-full">
            {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
            {thinking && <ThinkingIndicator />}
            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-2xl text-red-600 dark:text-red-400 text-xs font-bold animate-in fade-in">
                <AlertCircle size={16} />
                <span className="flex-1">{error}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Floating Input Bar ── */}
      <div className="fixed bottom-12 left-0 lg:left-64 right-0 z-50 px-4 md:px-10 lg:px-20 pointer-events-none">
        <div className="max-w-2xl mx-auto pointer-events-auto">

          {/* Image attachment preview */}
          {attachment && (
            <div className="mb-2 mx-2 animate-in fade-in slide-in-from-bottom-2">
              <div className="relative w-fit">
                <img src={attachment.dataUrl} alt={attachment.name}
                  className="h-20 w-auto rounded-xl border-2 border-blue-500/50 shadow-lg object-cover" />
                <button onClick={() => setAttachment(null)}
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md hover:bg-red-600 transition-colors">
                  <X size={10} />
                </button>
                <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">
                  {(attachment.size / 1024).toFixed(0)}KB
                </div>
              </div>
            </div>
          )}

          <div className={`relative flex items-end gap-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border rounded-[2rem] p-2 focus-within:border-blue-500/50 transition-all shadow-[0_20px_50px_-20px_rgba(0,0,0,0.1)] dark:shadow-black/40 ${
            isDragOver ? 'border-blue-500 bg-blue-50/80' : 'border-slate-200/50 dark:border-slate-800/50'
          }`}>

            {/* Hidden file input */}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileInput} />

            {/* Attach button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={!hasApiKey || thinking}
              title="Attach image (or drag & drop / paste)"
              className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mb-0.5 ml-0.5 transition-all ${
                attachment
                  ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600'
                  : 'text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              } disabled:opacity-30 disabled:cursor-not-allowed`}
            >
              <Paperclip size={16} />
            </button>

            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => { setInput(e.target.value); autoResize(); }}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={hasApiKey ? s.placeholder : "Configure your API key in Settings → AI Assistant first..."}
              disabled={thinking || !hasApiKey}
              className="flex-1 bg-transparent border-none outline-none p-3 text-[13px] font-medium text-slate-700 dark:text-slate-200 resize-none max-h-32 placeholder:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
            />

            <button
              onClick={() => sendMessage()}
              disabled={!canSend}
              className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-50 disabled:grayscale transition-all active:scale-95 flex-shrink-0 mb-0.5 mr-0.5"
            >
              <Send size={18} />
            </button>
          </div>

          {hasApiKey && (
            <div className="flex items-center justify-between mt-1.5 px-3">
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                {settings.provider.charAt(0).toUpperCase() + settings.provider.slice(1)} · {settings.model}
              </span>
              {visionOk ? (
                <span className="flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400 font-semibold">
                  <ImageIcon size={10} /> Vision ready
                </span>
              ) : (
                <span className="text-[10px] text-slate-400">Text only</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
