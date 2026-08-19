import jsPDF from 'jspdf'
import { PC_QUESTIONS, SM_QUESTIONS, SM_QUESTIONS_SET2 } from '../components/athlete/questions'

// ── Layout constants ────────────────────────────────────────────
const PAGE_W = 8.5
const PAGE_H = 11
const MARGIN = 0.75
const CONTENT_W = PAGE_W - MARGIN * 2
const CONTENT_BOTTOM = PAGE_H - MARGIN - 0.35 // reserve room for footer

const GREEN = [26, 122, 74]   // #1A7A4A
const BODY  = [17, 17, 17]    // #111111
const MID   = [100, 100, 100]
const LIGHT = [245, 245, 245] // #f5f5f5
const LINE  = [180, 180, 180]

function pt(fontSize) { return fontSize / 72 }
function lh(fontSize) { return pt(fontSize) * 1.35 }

// ── Image loading (rasterizes SVG/PNG logos to a PNG data URL for jsPDF) ──
async function loadImageDataUrl(url) {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    const objUrl = URL.createObjectURL(blob)
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = objUrl
      })
      const w = img.naturalWidth || img.width
      const h = img.naturalHeight || img.height
      if (!w || !h) return null
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx2d = canvas.getContext('2d')
      ctx2d.drawImage(img, 0, 0, w, h)
      const dataUrl = canvas.toDataURL('image/png')
      return { dataUrl, width: w, height: h }
    } finally {
      URL.revokeObjectURL(objUrl)
    }
  } catch {
    return null
  }
}

function placeImage(doc, img, xRef, y, targetH, align) {
  if (!img) return
  const ratio = img.width / img.height
  const w = targetH * ratio
  const x = align === 'left' ? xRef : align === 'right' ? xRef - w : xRef - w / 2
  doc.addImage(img.dataUrl, 'PNG', x, y, w, targetH)
}

// ── Drawing primitives ───────────────────────────────────────────
function drawMarker(doc, cx, cy, shape) {
  doc.setDrawColor(...[80, 80, 80])
  if (shape === 'circle') doc.circle(cx, cy, 0.07, 'S')
  else doc.rect(cx - 0.07, cy - 0.07, 0.14, 0.14, 'S')
}

function drawPageHeader(ctx) {
  const { doc, teamName } = ctx
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...MID)
  doc.text(teamName, MARGIN, MARGIN - 0.25)
}

function newPage(ctx) {
  ctx.doc.addPage()
  ctx.y = MARGIN
  drawPageHeader(ctx)
}

function ensureSpace(ctx, needed) {
  if (ctx.y + needed > CONTENT_BOTTOM) newPage(ctx)
}

// ── Page 1 — Cover ───────────────────────────────────────────────
function drawCoverPage(ctx, team, rpmLogo, teamLogo) {
  const { doc } = ctx
  let y = MARGIN
  const logoH = 0.55

  if (teamLogo) {
    placeImage(doc, rpmLogo, MARGIN, y, logoH, 'left')
    placeImage(doc, teamLogo, PAGE_W - MARGIN, y, logoH, 'right')
  } else if (rpmLogo) {
    placeImage(doc, rpmLogo, PAGE_W / 2, y, logoH, 'center')
  }
  y += logoH + 0.55

  doc.setFont('helvetica', 'bold'); doc.setFontSize(24); doc.setTextColor(...GREEN)
  doc.text('RPM Assessment — Backup Copy', PAGE_W / 2, y, { align: 'center' })
  y += 0.32

  doc.setFont('helvetica', 'normal'); doc.setFontSize(12); doc.setTextColor(...MID)
  doc.text('For manual completion when portal is unavailable', PAGE_W / 2, y, { align: 'center' })
  y += 0.55

  doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(...BODY)
  doc.text(team.name, PAGE_W / 2, y, { align: 'center' })
  y += 0.5

  doc.setFont('helvetica', 'normal'); doc.setFontSize(12)
  doc.text('Date: _______________', PAGE_W / 2, y, { align: 'center' })
  y += 0.65

  doc.setFontSize(10.5); doc.setTextColor(...BODY)
  const instr = 'Complete all sections honestly. Your responses are confidential and will not be shared with your coaching staff. Return completed forms to your RPM practitioner.'
  doc.splitTextToSize(instr, CONTENT_W * 0.75).forEach(line => {
    doc.text(line, PAGE_W / 2, y, { align: 'center' }); y += lh(10.5)
  })
  y += 0.5

  doc.setFont('helvetica', 'italic'); doc.setFontSize(9); doc.setTextColor(...MID)
  doc.text('Data will be entered into the RPM portal by your practitioner. rpmsystemsgroup.com', PAGE_W / 2, y, { align: 'center' })
}

// ── Page 2 — Athlete Information ────────────────────────────────
function drawAthleteInfoPage(ctx, team) {
  newPage(ctx)
  const { doc } = ctx
  let y = ctx.y + 0.25

  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(...GREEN)
  doc.text('Athlete Information', MARGIN, y)
  y += 0.5

  const blank = '_______________________________________________'
  const fields = [
    ['Full Name:', blank],
    ['Team:', team.name],
    ['Position:', blank],
    ['Year:', blank],
  ]
  doc.setFontSize(13)
  fields.forEach(([label, val]) => {
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...BODY)
    doc.text(label, MARGIN, y)
    doc.setFont('helvetica', 'normal')
    doc.text(val, MARGIN + 1.5, y)
    y += 0.55
  })
  ctx.y = y
}

// ── Panic Cycle section ──────────────────────────────────────────
function drawPcIntro(ctx) {
  newPage(ctx)
  const { doc } = ctx
  let y = ctx.y + 0.2

  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(...GREEN)
  doc.text('Part 1 — Panic Cycle Assessment', MARGIN, y)
  y += 0.32

  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...BODY)
  doc.text('Before You Begin', MARGIN, y)
  y += 0.24

  doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
  const intro = "These questions map your pattern — the automatic reactions that impact your performance under pressure. We assess your triggers, thoughts, bodily responses, behaviors, and what comes next. Your responses build your Panic Cycle, which becomes the foundation for your Performance Cycle — the system that breaks the pattern. No wrong answers. Honest ones give us the clearest picture. Your responses are confidential and will never be shared with your coaching staff."
  doc.splitTextToSize(intro, CONTENT_W).forEach(line => {
    doc.text(line, MARGIN, y); y += lh(10)
  })
  y += 0.3
  ctx.y = y
}

function drawPcQuestion(ctx, q) {
  const { doc } = ctx
  const dimension = q.meta.replace(/^Panic Cycle — /, '')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12)
  const qLines = doc.splitTextToSize(q.q, CONTENT_W - 0.4)

  let blockH = 0.2 + qLines.length * lh(11.5) + 0.1
  if (q.type === 'multi') blockH += 0.22
  if (q.type === 'text') {
    blockH += 4 * 0.32
  } else {
    blockH += (q.choices.length + 1) * 0.26 // +1 for the "Other" row
  }
  blockH += 0.28

  ensureSpace(ctx, blockH + 0.18)
  const top = ctx.y
  doc.setFillColor(...LIGHT)
  doc.rect(MARGIN, top, CONTENT_W, blockH, 'F')

  let y = top + 0.2
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...GREEN)
  doc.text(`Q${q.n} — ${dimension}`, MARGIN + 0.22, y)
  y += 0.22

  doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5); doc.setTextColor(...BODY)
  qLines.forEach(line => { doc.text(line, MARGIN + 0.22, y); y += lh(11.5) })
  y += 0.06

  if (q.type === 'multi') {
    doc.setFont('helvetica', 'italic'); doc.setFontSize(9); doc.setTextColor(...MID)
    doc.text('Choose up to 2.', MARGIN + 0.22, y)
    y += 0.24
  }

  doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(...BODY)
  if (q.type === 'text') {
    doc.setDrawColor(...LINE)
    for (let i = 0; i < 4; i++) {
      doc.line(MARGIN + 0.22, y + 0.22, MARGIN + CONTENT_W - 0.22, y + 0.22)
      y += 0.32
    }
  } else {
    const shape = q.type === 'single' ? 'circle' : 'square'
    q.choices.forEach(c => {
      drawMarker(doc, MARGIN + 0.3, y - 0.07, shape)
      doc.text(c, MARGIN + 0.5, y)
      y += 0.26
    })
    drawMarker(doc, MARGIN + 0.3, y - 0.07, shape)
    doc.text('Other:', MARGIN + 0.5, y)
    doc.setDrawColor(...LINE)
    doc.line(MARGIN + 0.95, y + 0.03, MARGIN + CONTENT_W - 0.22, y + 0.03)
  }

  ctx.y = top + blockH + 0.2
}

// ── Social Map section ───────────────────────────────────────────
function lastNameKey(fullName) {
  const parts = fullName.trim().split(/\s+/)
  return (parts[parts.length - 1] || '').toLowerCase()
}

function sortedByLastName(roster) {
  return [...roster].sort((a, b) =>
    lastNameKey(a.full_name).localeCompare(lastNameKey(b.full_name)) ||
    a.full_name.localeCompare(b.full_name)
  )
}

function drawRosterBox(ctx, roster) {
  const { doc } = ctx
  const sorted = sortedByLastName(roster)
  const half = Math.ceil(sorted.length / 2)
  const rows = Math.max(half, sorted.length - half, 1)
  const rowH = 0.22
  const headerH = 0.4
  const boxH = headerH + rows * rowH + 0.2

  ensureSpace(ctx, boxH + 0.2)
  const top = ctx.y
  doc.setDrawColor(...GREEN)
  doc.setLineWidth(0.02)
  doc.rect(MARGIN, top, CONTENT_W, boxH, 'S')
  doc.setLineWidth(0.01)

  let y = top + 0.3
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...GREEN)
  doc.text('Your Teammates', MARGIN + 0.2, y)
  doc.setFont('helvetica', 'italic'); doc.setFontSize(9); doc.setTextColor(...MID)
  doc.text('— refer to this list when answering the questions below', MARGIN + 1.7, y)
  y += 0.28

  const colW = CONTENT_W / 2
  const left = sorted.slice(0, half)
  const right = sorted.slice(half)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...BODY)
  for (let i = 0; i < rows; i++) {
    if (left[i]) doc.text(left[i].full_name, MARGIN + 0.25, y)
    if (right[i]) doc.text(right[i].full_name, MARGIN + colW + 0.15, y)
    y += rowH
  }

  ctx.y = top + boxH + 0.25
}

function drawSmIntroPage(ctx, roster) {
  newPage(ctx)
  const { doc } = ctx
  let y = ctx.y + 0.2

  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(...GREEN)
  doc.text('Part 2 — Team Social Map', MARGIN, y)
  y += 0.32

  doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(...BODY)
  const intro = 'These questions map the relational dynamics of your team. Select up to 2 teammates per question. Your responses are confidential and will never be shared with your coaching staff.'
  doc.splitTextToSize(intro, CONTENT_W).forEach(line => { doc.text(line, MARGIN, y); y += lh(10.5) })
  y += 0.35

  ctx.y = y
  drawRosterBox(ctx, roster)
}

function drawSmQuestion(ctx, q, num) {
  const { doc } = ctx
  const dimension = q.meta.replace(/^Social Map — /, '')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12)
  const qLines = doc.splitTextToSize(q.q, CONTENT_W - 0.4)

  let blockH = 0.2 + qLines.length * lh(11.5) + 0.1
  blockH += 0.32 * 2  // two write-in lines
  blockH += 0.22      // "write up to 2..." instruction
  if (!q.positive) blockH += 0.2
  blockH += 0.26

  ensureSpace(ctx, blockH + 0.18)
  const top = ctx.y
  doc.setFillColor(...LIGHT)
  doc.rect(MARGIN, top, CONTENT_W, blockH, 'F')

  let y = top + 0.2
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...GREEN)
  doc.text(`Q${num} — ${dimension}`, MARGIN + 0.22, y)
  y += 0.22

  doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5); doc.setTextColor(...BODY)
  qLines.forEach(line => { doc.text(line, MARGIN + 0.22, y); y += lh(11.5) })
  y += 0.1

  doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(...BODY)
  doc.text('Teammate 1: ', MARGIN + 0.22, y)
  doc.setDrawColor(...LINE)
  doc.line(MARGIN + 1.15, y + 0.03, MARGIN + CONTENT_W - 0.22, y + 0.03)
  y += 0.32
  doc.text('Teammate 2: ', MARGIN + 0.22, y)
  doc.line(MARGIN + 1.15, y + 0.03, MARGIN + CONTENT_W - 0.22, y + 0.03)
  y += 0.28

  doc.setFont('helvetica', 'italic'); doc.setFontSize(8.5); doc.setTextColor(...MID)
  doc.text('Write up to 2 teammate names from the roster list on the previous page.', MARGIN + 0.22, y)
  y += 0.2

  if (!q.positive) {
    doc.setFont('helvetica', 'italic'); doc.setFontSize(8.5); doc.setTextColor(...MID)
    doc.text('Your response to this question is strictly confidential.', MARGIN + 0.22, y)
  }

  ctx.y = top + blockH + 0.18
}

// ── Page 8 — Practitioner Use Only ──────────────────────────────
function drawPractitionerPage(ctx) {
  newPage(ctx)
  const { doc } = ctx
  let y = ctx.y + 0.25

  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(...GREEN)
  doc.text('For RPM Practitioner Use Only', MARGIN, y)
  y += 0.35

  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...BODY)
  doc.text('Data Entry Checklist', MARGIN, y)
  y += 0.32

  const items = [
    'Athlete name confirmed on roster',
    'Panic Cycle responses entered in portal',
    'Social Map responses entered in portal',
    'Submission marked complete in portal',
    'Assessment returned to athlete or securely destroyed',
  ]
  doc.setFont('helvetica', 'normal'); doc.setFontSize(11)
  items.forEach(text => {
    drawMarker(doc, MARGIN + 0.1, y - 0.08, 'square')
    doc.text(text, MARGIN + 0.3, y)
    y += 0.34
  })
  y += 0.2

  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...GREEN)
  doc.text('Notes:', MARGIN, y)
  y += 0.28
  doc.setDrawColor(...LINE)
  doc.setFont('helvetica', 'normal')
  for (let i = 0; i < 6; i++) {
    doc.line(MARGIN, y, MARGIN + CONTENT_W, y)
    y += 0.32
  }
  y += 0.15

  doc.setFont('helvetica', 'italic'); doc.setFontSize(9); doc.setTextColor(...MID)
  const warn = 'This completed form contains confidential athlete data. Store securely and destroy after portal entry is complete.'
  doc.splitTextToSize(warn, CONTENT_W).forEach(line => { doc.text(line, MARGIN, y); y += lh(9) })
}

// ── Footers (applied after all pages exist, so the total is accurate) ──
function drawFooters(doc) {
  const totalPages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...MID)
    doc.text('rpmsystemsgroup.com — Confidential', PAGE_W / 2, PAGE_H - 0.5, { align: 'center' })
    doc.text(`Page ${i} of ${totalPages}`, PAGE_W / 2, PAGE_H - 0.35, { align: 'center' })
  }
}

function safeFileName(name) {
  return name.trim().replace(/[/\\:*?"<>|]/g, '').replace(/\s+/g, '_') || 'Team'
}

// ── Main entry point ─────────────────────────────────────────────
export async function generateBackupAssessmentPdf(team, roster) {
  const doc = new jsPDF({ unit: 'in', format: 'letter' })
  doc.setLineWidth(0.01) // jsPDF's own default (0.2in) is enormous at this scale — every stroke/line relies on this
  const questionSet = team.current_administration === 2 ? 2 : 1
  const smQuestions = questionSet === 2 ? SM_QUESTIONS_SET2 : SM_QUESTIONS

  const [rpmLogo, teamLogo] = await Promise.all([
    loadImageDataUrl('/logo.svg'),
    team.logo_url ? loadImageDataUrl(team.logo_url) : Promise.resolve(null),
  ])

  const ctx = { doc, y: MARGIN, teamName: team.name }

  drawCoverPage(ctx, team, rpmLogo, teamLogo)
  drawAthleteInfoPage(ctx, team)
  drawPcIntro(ctx)
  PC_QUESTIONS.forEach(q => drawPcQuestion(ctx, q))
  drawSmIntroPage(ctx, roster)
  smQuestions.forEach((q, i) => drawSmQuestion(ctx, q, i + 1))
  drawPractitionerPage(ctx)

  drawFooters(doc)

  doc.save(`${safeFileName(team.name)}_Backup_Assessment.pdf`)
}
