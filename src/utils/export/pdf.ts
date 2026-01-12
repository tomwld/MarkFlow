import { writeFile } from '@tauri-apps/plugin-fs'
import MarkdownIt from 'markdown-it'
// @ts-ignore
import markdownItFootnote from 'markdown-it-footnote'
// @ts-ignore
import markdownItTaskLists from 'markdown-it-task-lists'
// @ts-ignore
import html2pdf from 'html2pdf.js'
// @ts-ignore
import githubMarkdownLightCss from 'github-markdown-css/github-markdown-light.css?inline'
// @ts-ignore
import hljs from 'highlight.js'
// @ts-ignore
import hljsGithubCss from 'highlight.js/styles/github.css?inline'

export async function exportToPdf(content: string, title: string, path: string) {
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
