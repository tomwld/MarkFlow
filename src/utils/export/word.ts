import { writeFile } from '@tauri-apps/plugin-fs'
import MarkdownIt from 'markdown-it'
// @ts-ignore
import markdownItFootnote from 'markdown-it-footnote'
// @ts-ignore
import markdownItTaskLists from 'markdown-it-task-lists'
// @ts-ignore
import githubMarkdownLightCss from 'github-markdown-css/github-markdown-light.css?inline'
// @ts-ignore
import hljs from 'highlight.js'
// @ts-ignore
import { asBlob } from 'html-docx-js-typescript'

export async function exportToWord(content: string, title: string, path: string) {
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

    // Create a temporary wrapper to process styles
    const wrapper = document.createElement('div')
    wrapper.innerHTML = htmlBody
    wrapper.className = 'markdown-body'

    // Helper to apply inline styles
    const applyStyles = (selector: string, styles: Partial<CSSStyleDeclaration>) => {
      const elements = wrapper.querySelectorAll(selector)
      elements.forEach((el) => {
        if (el instanceof HTMLElement) {
          Object.assign(el.style, styles)
        }
      })
    }

    // Base text styles
    applyStyles('*', {
        fontFamily: '"Calibri", "Segoe UI", "Helvetica", sans-serif',
        fontSize: '11pt',
        lineHeight: '1.5',
        color: '#24292f'
    })

    // Headers
    const headerStyles = {
        marginTop: '24px',
        marginBottom: '16px',
        fontWeight: '600',
        lineHeight: '1.25',
        color: '#24292f' // Ensure header color
    }
    applyStyles('h1, h2, h3, h4, h5, h6', headerStyles)
    
    // Specific header sizes and borders
    applyStyles('h1', { fontSize: '2em', paddingBottom: '0.3em', borderBottom: '1px solid #d0d7de' })
    applyStyles('h2', { fontSize: '1.5em', paddingBottom: '0.3em', borderBottom: '1px solid #d0d7de' })
    applyStyles('h3', { fontSize: '1.25em' })
    applyStyles('h4', { fontSize: '1em' })
    applyStyles('h5', { fontSize: '0.875em' })
    applyStyles('h6', { fontSize: '0.85em', color: '#656d76' })

    // Paragraphs
    applyStyles('p', { marginBottom: '16px', marginTop: '0' })

    // Lists
    applyStyles('ul, ol', { paddingLeft: '2em', marginBottom: '16px', marginTop: '0' })
    applyStyles('li', { marginBottom: '0.25em' })
    // Fix task list bullets
    applyStyles('.task-list-item', { listStyleType: 'none', marginLeft: '-1.5em' })

    // Links
    applyStyles('a', { color: '#0969da', textDecoration: 'none' })

    // Blockquotes
    applyStyles('blockquote', {
        borderLeft: '0.25em solid #d0d7de',
        color: '#656d76',
        padding: '0 1em',
        margin: '0',
        marginBottom: '16px'
    })

    // Code blocks and Inline code
    const codeFont = '"Consolas", "Courier New", monospace'
    applyStyles('pre', {
        backgroundColor: '#f6f8fa',
        padding: '16px',
        borderRadius: '6px',
        overflow: 'auto',
        marginBottom: '16px',
        fontFamily: codeFont,
        fontSize: '85%'
    })
    
    // Inline code
    applyStyles(':not(pre) > code', {
        backgroundColor: 'rgba(175, 184, 193, 0.2)',
        padding: '0.2em 0.4em',
        borderRadius: '6px',
        fontFamily: codeFont,
        fontSize: '85%'
    })

    // Ensure code inside pre doesn't have double background/padding
    applyStyles('pre code', {
        backgroundColor: 'transparent',
        padding: '0',
        fontFamily: codeFont,
        fontSize: '100%',
        whiteSpace: 'pre'
    })

    // Tables
    applyStyles('table', {
        borderCollapse: 'collapse',
        width: '100%',
        marginBottom: '16px',
        borderSpacing: '0'
    })
    
    applyStyles('th, td', {
        border: '1px solid #d0d7de',
        padding: '6px 13px'
    })

    applyStyles('th', {
        fontWeight: '600',
        backgroundColor: '#ffffff' // Explicit background for headers
    })

    // Zebra striping for tables
    const rows = wrapper.querySelectorAll('tr')
    rows.forEach((row, index) => {
        // nth-child is 1-based, index is 0-based.
        // GitHub style: even rows (2, 4, 6...) have background.
        // In 0-based index: 1, 3, 5... (odd index)
        if (index % 2 !== 0) {
            if (row instanceof HTMLElement) {
                row.style.backgroundColor = '#f6f8fa'
            }
        } else {
             if (row instanceof HTMLElement) {
                row.style.backgroundColor = '#ffffff'
            }
        }
    })

    // Images
    applyStyles('img', {
        maxWidth: '100%',
        boxSizing: 'content-box'
    })

    // Horizontal Rule
    applyStyles('hr', {
        height: '0.25em',
        padding: '0',
        margin: '24px 0',
        backgroundColor: '#d0d7de',
        border: '0'
    })

    const processedHtmlBody = wrapper.innerHTML

    const htmlContent = `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>
/* Fallback styles in case inline styles miss something */
${githubMarkdownLightCss}
</style>
</head>
<body class="markdown-body" style="font-family: 'Calibri', 'Segoe UI', 'Helvetica', sans-serif;">
${processedHtmlBody}
</body>
</html>`

    try {
      // @ts-ignore
      const blob = await asBlob(htmlContent, {
        orientation: 'portrait',
        margins: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }) as Blob
      
      const arrayBuffer = await blob.arrayBuffer()
      await writeFile(path, new Uint8Array(arrayBuffer))
    } catch (error) {
      console.error('Word export failed:', error)
      throw error
    }
}
