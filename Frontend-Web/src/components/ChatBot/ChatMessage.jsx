import React from 'react';
import { Link } from 'react-router-dom';
import { User, Bot, FileText, ExternalLink } from 'lucide-react';
import VoiceOutput from './VoiceOutput';

function parseInlineMarkdown(text) {
  if (!text) return '';

  const parts = [];
  let remaining = text;
  const regex = /(\*\*.*?\*\*|`.*?`)/;

  while (remaining) {
    const match = remaining.match(regex);
    if (!match) {
      parts.push(remaining);
      break;
    }

    const matchIndex = match.index;
    const matchText = match[0];

    if (matchIndex > 0) {
      parts.push(remaining.substring(0, matchIndex));
    }

    if (matchText.startsWith('**') && matchText.endsWith('**')) {
      const boldText = matchText.slice(2, -2);
      parts.push(<strong key={remaining.length} className="font-bold">{boldText}</strong>);
    } else if (matchText.startsWith('`') && matchText.endsWith('`')) {
      const codeText = matchText.slice(1, -1);
      parts.push(
        <code key={remaining.length} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-indigo-600 dark:text-indigo-300 font-mono text-[11px] border border-slate-200 dark:border-white/5">
          {codeText}
        </code>
      );
    } else {
      parts.push(matchText);
    }

    remaining = remaining.substring(matchIndex + matchText.length);
  }

  return parts;
}

function renderMarkdown(text) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let currentList = null;

  const flushList = (key) => {
    if (currentList) {
      const Tag = currentList.type;
      elements.push(
        <Tag key={key} className={currentList.type === 'ul' ? "list-disc pl-5 my-2 space-y-1" : "list-decimal pl-5 my-2 space-y-1"}>
          {currentList.items.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {parseInlineMarkdown(item)}
            </li>
          ))}
        </Tag>
      );
      currentList = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Markdown Table
    if (trimmed.startsWith('|')) {
      flushList(`list-${i}`);
      let j = i;
      const tableLines = [];
      while (j < lines.length && lines[j].trim().startsWith('|')) {
        tableLines.push(lines[j]);
        j++;
      }
      if (tableLines.length >= 2) {
        const splitRow = (rowText) => {
          let cleaned = rowText.trim();
          if (cleaned.startsWith('|')) cleaned = cleaned.slice(1);
          if (cleaned.endsWith('|')) cleaned = cleaned.slice(0, -1);
          return cleaned.split('|').map(s => s.trim());
        };
        const headers = splitRow(tableLines[0]);
        const separators = splitRow(tableLines[1]);
        const isSeparator = separators.length > 0 && separators.every(col => /^:?-+:?$/.test(col));
        if (isSeparator) {
          const rows = tableLines.slice(2).map(rLine => {
            const cells = splitRow(rLine);
            return headers.map((_, colIdx) => cells[colIdx] || '');
          });

          elements.push(
            <div key={`table-wrapper-${i}`} className="overflow-x-auto my-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm bg-slate-50/80 dark:bg-slate-950/40 backdrop-blur-sm">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs text-left">
                <thead className="bg-slate-100/90 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 font-semibold uppercase tracking-wider">
                  <tr>
                    {headers.map((h, hIdx) => (
                      <th key={hIdx} className="px-4 py-2.5 font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800/60 text-[10px] tracking-wider uppercase">
                        {parseInlineMarkdown(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/50 text-slate-800 dark:text-slate-200">
                  {rows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-100/60 dark:hover:bg-slate-900/30 transition-colors odd:bg-slate-50/40 dark:odd:bg-transparent">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-200">
                          {parseInlineMarkdown(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
          i = j - 1;
          continue;
        }
      }
    }

    // Headers
    if (trimmed.startsWith('### ')) {
      flushList(`list-${i}`);
      elements.push(
        <h4 key={`h4-${i}`} className="text-sm font-semibold mt-3 mb-1.5">
          {parseInlineMarkdown(trimmed.slice(4))}
        </h4>
      );
    } else if (trimmed.startsWith('## ')) {
      flushList(`list-${i}`);
      elements.push(
        <h3 key={`h3-${i}`} className="text-base font-bold mt-4 mb-2">
          {parseInlineMarkdown(trimmed.slice(3))}
        </h3>
      );
    } else if (trimmed.startsWith('# ')) {
      flushList(`list-${i}`);
      elements.push(
        <h2 key={`h1-${i}`} className="text-lg font-bold mt-4 mb-2">
          {parseInlineMarkdown(trimmed.slice(2))}
        </h2>
      );
    }
    // Unordered List Items
    else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const content = trimmed.slice(2);
      if (currentList && currentList.type === 'ul') {
        currentList.items.push(content);
      } else {
        flushList(`list-${i}`);
        currentList = { type: 'ul', items: [content] };
      }
    }
    // Ordered List Items
    else if (/^\d+\.\s+/.test(trimmed)) {
      const match = trimmed.match(/^(\d+)\.\s+/);
      const content = trimmed.slice(match ? match[0].length : 3);
      if (currentList && currentList.type === 'ol') {
        currentList.items.push(content);
      } else {
        flushList(`list-${i}`);
        currentList = { type: 'ol', items: [content] };
      }
    }
    // Empty line
    else if (!trimmed) {
      if (!currentList) {
        elements.push(<div key={`spacer-${i}`} className="h-2" />);
      }
    }
    // Standard paragraph
    else {
      flushList(`list-${i}`);
      elements.push(
        <p key={`p-${i}`} className="mb-1.5 last:mb-0 leading-relaxed">
          {parseInlineMarkdown(line)}
        </p>
      );
    }
  }

  flushList(`list-end`);
  return elements;
}

/**
 * ChatMessage — renders a single user or assistant message bubble.
 * Supports markdown-like formatting and source references.
 */
export default function ChatMessage({ role, content, metadata = {}, language = 'fr', darkMode = false }) {
  const isUser = role === 'user';
  const sources = metadata?.sources || [];

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''} group`}>
      {/* Avatar */}
      <div
        className={`
          flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
          ${isUser
            ? 'bg-indigo-500/20 text-indigo-400'
            : 'bg-emerald-500/20 text-emerald-400'}
        `}
      >
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>

      {/* Bubble */}
      <div className={`max-w-[75%] flex flex-col gap-1`}>
        <div
          className={`
            px-4 py-3 rounded-2xl text-sm leading-relaxed border
            ${isUser
              ? 'bg-indigo-50 text-indigo-950 border-indigo-100 rounded-br-md dark:bg-indigo-500/15 dark:text-gray-100 dark:border-transparent'
              : 'bg-white text-slate-800 border-slate-200 rounded-bl-md shadow-sm dark:bg-white/5 dark:text-gray-200 dark:border-white/5'}
          `}
        >
          {renderMarkdown(content)}
        </div>

        {/* Sources */}
        {!isUser && sources.length > 0 && (
          <div className="mt-2.5 px-1 space-y-1.5 animate-fadeIn">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-gray-500">
              Références et sources :
            </span>
            <div className="flex flex-wrap gap-2">
              {sources.map((src, i) => {
                const similarityPct = src.similarity ? Math.round(src.similarity * 100) : null;
                
                // Translate chunk type
                const typeLabels = {
                  'transcript': 'Transcription',
                  'summary': 'Résumé',
                  'decision': 'Décision',
                  'action_item': 'Action',
                  'behavior': 'Analyse'
                };
                const chunkLabel = typeLabels[src.chunk_type] || src.chunk_type;

                // Color mappings for chunk types
                const typeColors = {
                  'transcript': 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
                  'summary': 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
                  'decision': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
                  'action_item': 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
                  'behavior': 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20'
                };
                const chunkColor = typeColors[src.chunk_type] || 'bg-slate-500/10 text-slate-600 border-slate-500/20';

                return (
                  <Link
                    key={i}
                    to={`/overview/${src.meeting_id}`}
                    className={`
                      inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold
                      transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-md
                      active:scale-95 group/src
                      ${darkMode 
                        ? 'bg-white/[0.02] border-white/5 text-gray-300 hover:bg-indigo-500/10 hover:border-indigo-500/30 hover:text-white' 
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700'}
                    `}
                    title={`Consulter les détails de la réunion "${src.meeting_title || 'Réunion'}"`}
                  >
                    <FileText size={12} className="text-slate-400 group-hover/src:text-indigo-500 dark:group-hover/src:text-indigo-400 transition-colors" />
                    <span className="truncate max-w-[150px] font-semibold">
                      {src.meeting_title || `Réunion ${src.meeting_id?.slice(0, 8)}`}
                    </span>
                    
                    {chunkLabel && (
                      <span className={`px-1.5 py-0.2 text-[9px] rounded-md font-bold border ${chunkColor}`}>
                        {chunkLabel}
                      </span>
                    )}

                    {similarityPct !== null && (
                      <span className={`
                        px-1.5 py-0.2 text-[9px] rounded-md font-bold border
                        ${similarityPct >= 80 
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                          : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'}
                      `}>
                        {similarityPct}%
                      </span>
                    )}
                    <ExternalLink size={10} className="opacity-0 group-hover/src:opacity-100 transition-opacity ml-0.5 text-indigo-400 dark:text-indigo-300" />
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* TTS button for assistant messages */}
        {!isUser && content && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity px-1">
            <VoiceOutput text={content} language={language} />
          </div>
        )}
      </div>
    </div>
  );
}
