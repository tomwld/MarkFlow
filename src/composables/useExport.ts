import { save, message } from '@tauri-apps/plugin-dialog'
import { writeTextFile, writeFile } from '@tauri-apps/plugin-fs'
import MarkdownIt from 'markdown-it'
// @ts-ignore
import markdownItFootnote from 'markdown-it-footnote'
// @ts-ignore
import markdownItTaskLists from 'markdown-it-task-lists'
// @ts-ignore
import html2pdf from 'html2pdf.js'
// @ts-ignore
import githubMarkdownCss from 'github-markdown-css/github-markdown.css?inline'
// @ts-ignore
import githubMarkdownLightCss from 'github-markdown-css/github-markdown-light.css?inline'
// @ts-ignore
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'
// @ts-ignore
import hljsGithubCss from 'highlight.js/styles/github.css?inline'
// @ts-ignore
import hljsGithubDarkCss from 'highlight.js/styles/github-dark.css?inline'

import { useDocuments } from './useDocuments'

export function useExport() {
  const { activeDocument } = useDocuments()

  const exportToHtml = async (path: string) => {
    if (!activeDocument.value) return
    
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

    const htmlBody = md.render(activeDocument.value.content)
    const title = activeDocument.value.title
    
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

  const exportToWord = async (path: string) => {
    if (!activeDocument.value) return
    
    const md: MarkdownIt = new MarkdownIt({
      html: true,
      breaks: true,
      highlight: function (str: string, lang: string): string {
        // Word doesn't support complex CSS well, so we might want simpler highlighting or none.
        // But let's keep it consistent for now.
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

    const htmlBody = md.render(activeDocument.value.content)
    const title = activeDocument.value.title
    
    // Minimal Word-friendly HTML wrapper
    const htmlContent = `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>
${githubMarkdownLightCss}
/* Ensure light mode for Word export as it prints better */
.markdown-body {
  box-sizing: border-box;
  min-width: 200px;
  max-width: 980px;
  margin: 0 auto;
  padding: 45px;
  background-color: white;
  color: black;
}
</style>
</head>
<body class="markdown-body">
${htmlBody}
</body>
</html>`

    await writeTextFile(path, htmlContent)
  }

  const exportToPdf = async (path: string) => {
    if (!activeDocument.value) return
    
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

    const htmlBody = md.render(activeDocument.value.content)
    const title = activeDocument.value.title
    
    const container = document.createElement('div')
    container.className = 'markdown-body'
    container.style.width = '100%'
    container.style.maxWidth = '800px'
    container.style.margin = '0 auto'
    container.innerHTML = htmlBody
    
    const wrapper = document.createElement('div')
    wrapper.appendChild(container)
    
    const style = document.createElement('style')
    style.innerHTML = `
      ${githubMarkdownLightCss}
      ${hljsGithubCss.replace(/\.hljs/g, '.markdown-body .hljs')}
      .markdown-body { 
        color: #24292f; 
        background-color: #ffffff;
        font-size: 12px; 
        line-height: 1.5; 
      }
      h1 { page-break-before: always; }
      h1:first-child { page-break-before: avoid; }
      pre { page-break-inside: avoid; }
      blockquote { page-break-inside: avoid; }
      table { page-break-inside: avoid; }
      img { max-width: 100%; page-break-inside: avoid; }
    `
    wrapper.appendChild(style)
    
    const opt = {
      margin: [15, 15, 15, 15] as [number, number, number, number],
      filename: title + '.pdf',
      image: { type: 'jpeg' as 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    }

    const scrollPos = window.scrollY

    wrapper.style.backgroundColor = '#ffffff'
    wrapper.style.width = '800px'
    wrapper.style.minHeight = '100vh'
    wrapper.style.margin = '0 auto'
    
    const appElement = document.getElementById('app')
    let originalDisplay = ''
    if (appElement) {
      originalDisplay = appElement.style.display
      appElement.style.display = 'none'
    }
    
    document.body.appendChild(wrapper)

    try {
      window.scrollTo(0, 0)
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const worker = html2pdf().from(wrapper).set(opt).toPdf().get('pdf').then((pdf: any) => {
        const totalPages = pdf.internal.getNumberOfPages()
        for (let i = 1; i <= totalPages; i++) {
          pdf.setPage(i)
          pdf.setFontSize(10)
          pdf.setTextColor(150)
          pdf.text(title, 15, 10)
          pdf.text(`Page ${i} of ${totalPages}`, 190, 287, { align: 'right' })
        }
      }).then(() => html2pdf().from(wrapper).set(opt).output('arraybuffer'))
      
      const buffer = await worker
      await writeFile(path, new Uint8Array(buffer as ArrayBuffer))
      
    } catch (err) {
      throw err
    } finally {
      if (document.body.contains(wrapper)) {
        document.body.removeChild(wrapper)
      }
      if (appElement) {
        appElement.style.display = originalDisplay
      }
      window.scrollTo(0, scrollPos)
    }
  }

  const exportDocument = async (format?: 'pdf' | 'html' | 'word') => {
    if (!activeDocument.value) return
    
    const title = activeDocument.value.title.replace(/\.(md|markdown)$/i, '') || 'Untitled'
    
    const filters = []
    if (format === 'pdf') {
      filters.push({ name: 'PDF', extensions: ['pdf'] })
    } else if (format === 'html') {
      filters.push({ name: 'HTML', extensions: ['html'] })
    } else if (format === 'word') {
      filters.push({ name: 'Word Document', extensions: ['doc'] })
    } else {
      filters.push({ name: 'PDF', extensions: ['pdf'] })
      filters.push({ name: 'HTML', extensions: ['html'] })
      filters.push({ name: 'Word Document', extensions: ['doc'] })
    }

    try {
      const selected = await save({
        filters,
        defaultPath: title
      })
      
      if (selected) {
        if (selected.endsWith('.pdf')) {
          await exportToPdf(selected)
        } else if (selected.endsWith('.html')) {
          await exportToHtml(selected)
        } else if (selected.endsWith('.doc')) {
          await exportToWord(selected)
        }
      }
    } catch (error) {
      console.error('Export failed:', error)
      await message(`Export failed: ${error}`, { title: 'Error', kind: 'error' })
    }
  }

  const printDoc = () => {
    window.print()
  }

  return {
    exportDocument,
    printDoc
  }
}
