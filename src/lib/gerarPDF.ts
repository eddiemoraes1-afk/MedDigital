/**
 * Geração de PDF no browser sem dependências npm.
 * Carrega html2canvas + jsPDF dinamicamente via CDN quando necessário.
 */

const CDN_HTML2CANVAS = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
const CDN_JSPDF = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'

function carregarScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).__pdfjsCarregado?.[src]) { resolve(); return }
    const s = document.createElement('script')
    s.src = src
    s.crossOrigin = 'anonymous'
    s.onload = () => {
      if (!(window as any).__pdfjsCarregado) (window as any).__pdfjsCarregado = {}
      ;(window as any).__pdfjsCarregado[src] = true
      resolve()
    }
    s.onerror = () => reject(new Error(`Falha ao carregar: ${src}`))
    document.head.appendChild(s)
  })
}

/**
 * Converte HTML (string) em Blob PDF.
 * Renderiza num iframe oculto, captura canvas, converte em A4 PDF.
 */
export async function htmlParaPDFBlob(html: string): Promise<Blob> {
  // Carregar libs CDN em paralelo
  await Promise.all([
    carregarScript(CDN_HTML2CANVAS),
    carregarScript(CDN_JSPDF),
  ])

  // Iframe oculto para renderizar o documento com estilos completos
  const iframe = document.createElement('iframe')
  iframe.style.cssText = [
    'position:fixed',
    'left:-9999px',
    'top:0',
    'width:794px',   // ≈ A4 96dpi
    'height:1123px',
    'border:none',
    'background:white',
    'visibility:hidden',
  ].join(';')
  document.body.appendChild(iframe)

  try {
    // Aguarda carregamento do HTML (incluindo fontes ~800ms)
    await new Promise<void>(resolve => {
      iframe.onload = () => setTimeout(resolve, 900)
      iframe.srcdoc = html
    })

    const iframeDoc = iframe.contentDocument
    if (!iframeDoc) throw new Error('iframe sem documento')

    const h2c: any = (window as any).html2canvas
    const canvas: HTMLCanvasElement = await h2c(iframeDoc.documentElement, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      windowWidth: 794,
      windowHeight: 1123,
      scrollX: 0,
      scrollY: 0,
    })

    const { jsPDF } = (window as any).jspdf
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pdfW = pdf.internal.pageSize.getWidth()
    const pdfH = (canvas.height * pdfW) / canvas.width
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.93), 'JPEG', 0, 0, pdfW, pdfH)

    return pdf.output('blob') as Blob
  } finally {
    document.body.removeChild(iframe)
  }
}

/**
 * Faz download de PDF gerado a partir do HTML.
 */
export async function baixarComoPDF(html: string, nomeArquivo: string): Promise<void> {
  const blob = await htmlParaPDFBlob(html)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo.replace(/\.html$/, '.pdf')
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Cria um File PDF pronto para Web Share API.
 */
export async function criarFilePDF(html: string, nomeArquivo: string): Promise<File> {
  const blob = await htmlParaPDFBlob(html)
  return new File([blob], nomeArquivo.replace(/\.html$/, '.pdf'), { type: 'application/pdf' })
}
