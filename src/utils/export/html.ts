import { writeTextFile } from '@tauri-apps/plugin-fs'
import MarkdownIt from 'markdown-it'
// @ts-ignore
import markdownItFootnote from 'markdown-it-footnote'
// @ts-ignore
import markdownItTaskLists from 'markdown-it-task-lists'
// @ts-ignore
import githubMarkdownCss from 'github-markdown-css/github-markdown.css?inline'
// @ts-ignore
import hljs from 'highlight.js'
// @ts-ignore
import hljsGithubCss from 'highlight.js/styles/github.css?inline'
// @ts-ignore
import hljsGithubDarkCss from 'highlight.js/styles/github-dark.css?inline'

export async function exportToHtml(content: string, title: string, path: string) {
    const md: MarkdownIt = new MarkdownIt({
      html: true,
      breaks: true,
      highlight: function (str: string, lang: string): string {
        if (lang && hljs.getLanguage(lang)) {
          try {
            return '<pre class="hljs"><code>' +
                   hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
                   '</code></pre>';
          } catch (__) {}
        }
        return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>';
      }
    })
      .use(markdownItFootnote)
      .use(markdownItTaskLists)

    const htmlBody = md.render(content)
    
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
${githubMarkdownCss}

/* Highlight.js Styles */
${hljsGithubCss}

@media (prefers-color-scheme: dark) {
  ${hljsGithubDarkCss}
}

.markdown-body {
  box-sizing: border-box;
  min-width: 200px;
  max-width: 980px;
  margin: 0 auto;
  padding: 45px;
}

@media (max-width: 767px) {
  .markdown-body {
    padding: 15px;
  }
}

@media (prefers-color-scheme: dark) {
  body {
    background-color: #0d1117;
  }
}
</style>
</head>
<body class="markdown-body">
${htmlBody}
</body>
</html>`

    await writeTextFile(path, htmlContent)
}
