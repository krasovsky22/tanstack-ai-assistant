import { useEffect, useState } from 'react';
import type { Highlighter } from 'shiki';

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = import('shiki').then(({ createHighlighter }) =>
      createHighlighter({
        langs: [
          'tsx', 'typescript', 'javascript', 'jsx',
          'python', 'bash', 'sh', 'json', 'html', 'css',
          'scss', 'sql', 'yaml', 'markdown', 'rust', 'go',
          'java', 'cpp', 'c',
        ],
        themes: ['github-dark'],
      }),
    );
  }
  return highlighterPromise;
}

interface CodeProps {
  code: string;
  language?: string;
}

export function Code({ code, language = 'text' }: CodeProps) {
  const [html, setHtml] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getHighlighter().then((hl) => {
      const langs = hl.getLoadedLanguages();
      const lang = langs.includes(language as never) ? language : 'text';
      try {
        setHtml(hl.codeToHtml(code, { lang, theme: 'github-dark' }));
      } catch {
        setHtml(`<pre><code>${code}</code></pre>`);
      }
    });
  }, [code, language]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-2 rounded-lg overflow-hidden border border-gray-700 text-sm">
      <div className="flex items-center justify-between px-3 py-1 bg-[#24292e] border-b border-gray-700">
        <span className="text-xs text-gray-400 font-mono">{language}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="text-xs text-gray-400 hover:text-white transition-colors"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div
        className="overflow-x-auto [&>pre]:p-4 [&>pre]:m-0 [&>pre]:bg-transparent [&>pre]:leading-relaxed"
        // shiki injects the background via inline style on <pre>; we keep it
        dangerouslySetInnerHTML={{
          __html: html || `<pre style="background:#24292e;color:#e1e4e8"><code>${code}</code></pre>`,
        }}
      />
    </div>
  );
}
