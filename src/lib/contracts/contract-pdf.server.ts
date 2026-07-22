// Server-only: renders a signed contract summary PDF using pdf-lib.
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

export interface PdfField { label: string; value: string }

export interface RenderPdfArgs {
  contractTitle: string
  agreementSummary: string
  customerName: string
  customerEmail: string
  fields: PdfField[]
  typedSignature: string
  signaturePngDataUrl?: string | null
  submittedAtIso: string
  submissionId: string
}

const PAGE_W = 612 // Letter
const PAGE_H = 792
const MARGIN = 54
const LINE_H = 14

export async function renderSignedContractPdf(args: RenderPdfArgs): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)

  let page = doc.addPage([PAGE_W, PAGE_H])
  let y = PAGE_H - MARGIN

  const ensure = (needed: number) => {
    if (y - needed < MARGIN) {
      page = doc.addPage([PAGE_W, PAGE_H])
      y = PAGE_H - MARGIN
    }
  }

  const drawText = (text: string, opts: { bold?: boolean; size?: number; color?: [number, number, number] } = {}) => {
    const size = opts.size ?? 10
    const f = opts.bold ? fontBold : font
    const color = opts.color ?? [0.1, 0.1, 0.1]
    const wrapped = wrapText(text, f, size, PAGE_W - MARGIN * 2)
    for (const line of wrapped) {
      ensure(LINE_H)
      page.drawText(line, { x: MARGIN, y, size, font: f, color: rgb(color[0], color[1], color[2]) })
      y -= LINE_H
    }
  }

  // Header
  drawText('Pacific North Events & Tents', { bold: true, size: 12, color: [0.06, 0.17, 0.29] })
  drawText('Damarkom, Inc. · Seaside, Oregon · pacificnorthrentals.com', { size: 9, color: [0.4, 0.4, 0.4] })
  y -= 8
  drawText(args.contractTitle, { bold: true, size: 16, color: [0.06, 0.17, 0.29] })
  y -= 4
  drawText(`Submitted ${new Date(args.submittedAtIso).toLocaleString()}`, { size: 9, color: [0.4, 0.4, 0.4] })
  drawText(`Submission ID: ${args.submissionId}`, { size: 9, color: [0.4, 0.4, 0.4] })
  y -= 10

  // Agreement
  drawText('AGREEMENT', { bold: true, size: 10, color: [0.06, 0.17, 0.29] })
  drawText(args.agreementSummary, { size: 10 })
  y -= 10

  // Fields
  drawText('CONTRACT DETAILS', { bold: true, size: 10, color: [0.06, 0.17, 0.29] })
  for (const f of args.fields) {
    if (!f.value) continue
    drawText(`${f.label}: ${f.value}`, { size: 10 })
  }
  y -= 12

  // Signature block
  drawText('SIGNATURE', { bold: true, size: 10, color: [0.06, 0.17, 0.29] })
  drawText(`Typed signature: ${args.typedSignature}`, { size: 10 })

  // Draw signature image if provided
  if (args.signaturePngDataUrl && args.signaturePngDataUrl.startsWith('data:image/png;base64,')) {
    try {
      const base64 = args.signaturePngDataUrl.slice('data:image/png;base64,'.length)
      const bytes = base64ToUint8Array(base64)
      const img = await doc.embedPng(bytes)
      const maxW = 260
      const scale = Math.min(1, maxW / img.width)
      const w = img.width * scale
      const h = img.height * scale
      ensure(h + 12)
      y -= 4
      page.drawText('Drawn signature:', { x: MARGIN, y, size: 10, font, color: rgb(0.1, 0.1, 0.1) })
      y -= h + 4
      page.drawImage(img, { x: MARGIN, y, width: w, height: h })
      y -= 8
    } catch {
      // ignore image failures
    }
  }

  y -= 14
  drawText(
    `Signed electronically by ${args.customerName} <${args.customerEmail}> on ${new Date(args.submittedAtIso).toLocaleString()}.`,
    { size: 9, color: [0.4, 0.4, 0.4] },
  )

  return await doc.save()
}

function wrapText(text: string, font: any, size: number, maxWidth: number): string[] {
  const paragraphs = String(text ?? '').split(/\n/)
  const lines: string[] = []
  for (const para of paragraphs) {
    const words = para.split(/\s+/)
    let current = ''
    for (const word of words) {
      const trial = current ? current + ' ' + word : word
      const width = font.widthOfTextAtSize(trial, size)
      if (width > maxWidth && current) {
        lines.push(current)
        current = word
      } else {
        current = trial
      }
    }
    if (current) lines.push(current)
    if (paragraphs.length > 1) lines.push('')
  }
  return lines
}

function base64ToUint8Array(b64: string): Uint8Array {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}
