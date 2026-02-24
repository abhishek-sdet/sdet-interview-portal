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
            className="relative inline-block my-2"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* The Compact Chip */}
            <div className="flex items-center gap-2 px-4 py-2 bg-brand-blue/10 border border-brand-blue/20 rounded-xl cursor-pointer text-brand-blue hover:bg-brand-blue/20 transition-colors shadow-sm w-max">
                <Code2 className="w-5 h-5" />
                <span className="font-bold text-sm tracking-wide uppercase">View {language} Snippet</span>
                <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${isHovered ? 'rotate-90' : ''}`} />
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

/**
 * A component to parse question text and render markdown-style code blocks
 * using the HoverCodeBlock component to save space.
 * Includes a Smart Auto-Detector for unformatted code.
 */
export default function FormattedQuestionText({ text }) {
    if (!text) return null;

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

    // 1. Check for standard Markdown Backticks
    if (text.includes('```')) {
        const regex = /```(\w+)?\n?([\s\S]*?)```/g;
        let lastIndex = 0;
        let match;

        while ((match = regex.exec(text)) !== null) {
            pushText(text.slice(lastIndex, match.index));
            pushCode(match[1] || 'javascript', match[2]);
            lastIndex = regex.lastIndex;
        }
        pushText(text.slice(lastIndex));
    } else {
        // 2. Smart Heuristic Auto-Detector for unformatted DB records
        const lines = text.split('\n');

        let currentText = [];
        let currentCode = [];
        let inCodeBlock = false;
        let detectedLanguage = 'javascript';

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
                /[{};]$/ // common line endings for Java/C/JS
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
        return <p className="whitespace-pre-wrap leading-relaxed">{text}</p>;
    }

    return (
        <div className="font-sans flex flex-col items-start gap-1 w-full relative z-20">
            {parts}
        </div>
    );
}
