import React, { useState, useRef, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Code2, ChevronRight, X } from 'lucide-react';

/**
 * Interactive Code Block Component
 * Displays a compact chip by default. On hover/click, expands into a beautiful full-screen
 * or floating overlay containing the syntax-highlighted code.
 */
function HoverCodeBlock({ language, code }) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            className="relative inline-block my-3"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => setIsHovered(!isHovered)}
        >
            {/* The Compact Chip */}
            <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-blue-900/40 to-[#0b101b] border border-blue-500/40 rounded-lg cursor-pointer text-blue-300 hover:bg-blue-800/40 hover:border-blue-400 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all duration-300 w-max group relative overflow-hidden animate-pulse-slow">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500"></div>
                
                <div className="relative flex items-center justify-center z-10 bg-blue-500/20 p-2 rounded-md">
                    <Code2 className="w-5 h-5 text-blue-300 group-hover:text-white transition-colors" />
                </div>
                
                <div className="flex flex-col items-start z-10 mr-2">
                    <span className="font-bold text-[14px] tracking-wide text-blue-100 group-hover:text-white transition-colors flex items-center gap-2">
                        Hover to check the code
                        <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                    </span>
                    <span className="text-[11px] text-blue-300/70 uppercase tracking-widest mt-0.5 group-hover:text-blue-200 transition-colors">
                        {language || 'Code'} Snippet Inside
                    </span>
                </div>
                
                <ChevronRight className={`w-5 h-5 ml-2 z-10 text-blue-400 transition-transform duration-300 ${isHovered ? 'rotate-90 text-white translate-x-1' : 'group-hover:text-white group-hover:translate-x-1'}`} />
            </div>

            {/* The Floating Tooltip Popup */}
            {isHovered && (
                <div className="absolute z-50 left-0 top-full mt-2 w-max max-w-[90vw] md:max-w-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="rounded-xl overflow-hidden border border-brand-blue/30 shadow-[0_0_40px_rgba(0,119,255,0.15)] bg-[#0b101b]">

                        {/* Editor Header */}
                        <div className="bg-slate-900 px-4 py-2.5 text-xs font-mono text-slate-400 border-b border-white/5 uppercase tracking-widest flex items-center justify-between">
                            <span className="font-bold text-brand-blue">{language} Preview</span>
                            <div className="flex gap-1.5 opacity-60">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                            </div>
                        </div>

                        {/* Scrollable Code Area */}
                        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                            <SyntaxHighlighter
                                language={language.toLowerCase()}
                                style={atomDark}
                                customStyle={{
                                    margin: 0,
                                    padding: '1.25rem',
                                    background: 'transparent',
                                    fontSize: '0.875rem',
                                    lineHeight: '1.6'
                                }}
                                showLineNumbers={true}
                                wrapLines={true}
                            >
                                {code.trim()}
                            </SyntaxHighlighter>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

import { cleanQuestionText } from '@/utils/questionHelpers';

/**
 * A component to parse question text and render markdown-style code blocks
 * using the HoverCodeBlock component to save space.
 * Includes a Smart Auto-Detector for unformatted code.
 */
export default function FormattedQuestionText({ text, subsection }) {
    if (!text) return null;
    const cleanedText = cleanQuestionText(text);
    if (!cleanedText) return null;

    const parts = [];

    // Helper to push text
    const pushText = (str) => {
        if (!str.trim()) return;
        parts.push(
            <p key={`text-${parts.length}`} className="mb-3 whitespace-pre-wrap leading-relaxed inline">
                {str.trim()}
            </p>
        );
    };

    // Helper to push code chip
    const pushCode = (lang, codeStr) => {
        if (!codeStr.trim()) return;
        parts.push(
            <HoverCodeBlock key={`code-${parts.length}`} language={lang} code={codeStr} />
        );
    };

    let defaultLang = 'javascript';
    if (subsection) {
        const subLower = subsection.toLowerCase();
        if (subLower === 'java') defaultLang = 'java';
        else if (subLower === 'python') defaultLang = 'python';
        else if (subLower === 'database' || subLower === 'sql') defaultLang = 'sql';
        else if (subLower === 'javascript' || subLower === 'js') defaultLang = 'javascript';
    }

    // 1. Check for standard Markdown Backticks
    if (cleanedText.includes('```')) {
        const regex = /```(\w+)?\n?([\s\S]*?)```/g;
        let lastIndex = 0;
        let match;

        while ((match = regex.exec(cleanedText)) !== null) {
            pushText(cleanedText.slice(lastIndex, match.index));
            pushCode(match[1] || defaultLang, match[2]);
            lastIndex = regex.lastIndex;
        }
        pushText(cleanedText.slice(lastIndex));
    } else {
        // 2. Smart Heuristic Auto-Detector for unformatted DB records
        const lines = cleanedText.split('\n');

        let currentText = [];
        let currentCode = [];
        let inCodeBlock = false;
        let detectedLanguage = defaultLang;

        const isCodeLine = (line) => {
            const trimmed = line.trim();
            if (!trimmed) return false;

            const codePatterns = [
                /^public\s+class\s+/,
                /^public\s+static\s+/,
                /^class\s+/,
                /^def\s+/,
                /^import\s+/,
                /^#include\s+/,
                /^String\s+\w+\s*=/,
                /^int\s+\w+\s*=/,
                /^System\.out\.print/,
                /^print\s*\(/,
                /[{};]$/, // common line endings for Java/C/JS
                /^try\s*:/,
                /^except(\s+\w+)?\s*:/,
                /^finally\s*:/,
                /^if\s+/,
                /^for\s+/,
                /^while\s+/,
                /^elif\s+/,
                /^\s*\w+\s*=\s*.*$/, // assignments like x = y or items = [10, 20]
                /\.\w+\(.*\)/ // method calls like items.append(...) or System.out.println(...)
            ];

            return codePatterns.some(pattern => pattern.test(trimmed));
        };

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();

            if (!inCodeBlock) {
                if (isCodeLine(line)) {
                    inCodeBlock = true;
                    // Flush existing text
                    pushText(currentText.join('\n'));
                    currentText = [];

                    // Guess language based on initial signature
                    if (trimmed.includes('public') || trimmed.includes('System.out') || trimmed.includes('String ')) {
                        detectedLanguage = 'java';
                    } else if (trimmed.startsWith('def ') || trimmed.startsWith('print(')) {
                        detectedLanguage = 'python';
                    }

                    currentCode.push(line);
                } else {
                    currentText.push(line);
                }
            } else {
                // Once we enter a heuristic code block, we assume the rest is code 
                // (Very common: Question text -> Code snippet -> Options)
                currentCode.push(line);
            }
        }

        // Flush anything remaining
        if (currentText.length > 0) pushText(currentText.join('\n'));
        if (currentCode.length > 0) pushCode(detectedLanguage, currentCode.join('\n'));
    }

    if (parts.length === 0) {
        return <p className="whitespace-pre-wrap leading-relaxed">{cleanedText}</p>;
    }

    return (
        <div className="font-sans flex flex-col items-start gap-1 w-full relative z-20">
            {parts}
        </div>
    );
}

