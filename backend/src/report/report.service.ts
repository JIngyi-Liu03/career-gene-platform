import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import * as fs from 'fs'
import * as path from 'path'
import { questions, partOrder, partRange, chapters } from '../quiz/bank'
import { cleanText, cleanOpt } from '../quiz/clean'
import type { SurveyResult, RadarAxis } from '../types/quiz'

// 字母 -> 中文文字（与前端 src/utils/labels.ts 保持一致）
const CN_LABELS: Record<string, Record<string, string>> = {
  mbti: { E: '外倾', I: '内倾', N: '直觉', S: '感觉', T: '思考', F: '情感', J: '判断', P: '知觉' },
  disc: { D: '支配型', I: '影响型', S: '稳健型', C: '服从型' },
  pdp: { T: '老虎型', P: '孔雀型', K: '考拉型', O: '猫头鹰型', C: '变色龙型' },
  ennea: { A: '完美型', B: '助人型', C: '成就型', D: '浪漫型', E: '理智型', F: '忠诚型', G: '活跃型', H: '领袖型', I: '和平型' },
  career: { X: '自由型', Y: '平衡型', Z: '活力型', W: '安全型', V: '进取型' },
}

function cnLabel(type: keyof typeof CN_LABELS, letter: string): string {
  return CN_LABELS[type]?.[letter] ?? letter
}

const PAGE_W = 595.28
const PAGE_H = 841.89
const MARGIN = 48
const CONTENT_W = PAGE_W - MARGIN * 2

const C_PRIMARY = rgb(0.31, 0.49, 1.0)
const C_BG = rgb(0.93, 0.95, 0.97)
const C_TEXT = rgb(0.12, 0.16, 0.27)
const C_SUB = rgb(0.45, 0.5, 0.6)
const C_LINE = rgb(0.9, 0.92, 0.95)
const C_WHITE = rgb(1, 1, 1)

interface AxisRow { label: string; rate: number }

@Injectable()
export class ReportService {
  private fontPath = path.join(__dirname, '..', 'fonts', 'NotoSansSC-Regular.otf')
  private pdfDoc!: PDFDocument
  private font!: PDFFont
  private page!: PDFPage
  private y = 0

  constructor(private readonly prisma: PrismaService) {}

  async generate(userId: number): Promise<Uint8Array> {
    const a = await this.prisma.assessment.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { answers: true, results: true, user: true },
    })
    if (!a) throw new NotFoundException('未找到该用户的测评记录')
    if (a.results.length < 5) throw new NotFoundException('该用户尚未完成完整测评，无法生成报告')

    // 重建完整画像（后端自带题库重算，不依赖前端上报）
    const map: Record<string, any> = {}
    a.results.forEach((r) => (map[r.category] = JSON.parse(r.payload as string)))
    const results: SurveyResult = {
      mbti: map.mbti, disc: map.disc, pdp: map.pdp, ennea: map.ennea, career: map.career,
    }

    // 重建逐题明细（后端从题库 + Answer 重算，不再依赖前端 partRecords）
    const answerByIndex = new Map<number, number>()
    a.answers.forEach((x) => answerByIndex.set(x.questionIndex, x.choice))
    const partRecords = partOrder.map((_, p) => {
      const { start, end } = partRange(p)
      const qs: { text: string; options: string[]; answer: number | null }[] = []
      for (let g = start; g < end; g++) {
        const q = questions[g]
        qs.push({
          text: cleanText(q.text) || '请选择更合你心意的一项',
          options: q.a.map((o) => cleanOpt(o)),
          answer: answerByIndex.has(g) ? answerByIndex.get(g)! : null,
        })
      }
      return { partIndex: p, partTitle: chapters[p].title, questions: qs }
    })

    // —— 初始化 PDF 与字体 ——
    this.pdfDoc = await PDFDocument.create()
    this.pdfDoc.registerFontkit(fontkit)
    if (fs.existsSync(this.fontPath)) {
      const fontBytes = fs.readFileSync(this.fontPath)
      this.font = await this.pdfDoc.embedFont(fontBytes)
    } else {
      this.font = await this.pdfDoc.embedFont(StandardFonts.Helvetica)
    }
    this.page = this.pdfDoc.addPage([PAGE_W, PAGE_H])
    this.y = PAGE_H - MARGIN

    this.drawTitle('职业基因测评报告')
    this.drawSubtitle('Career Gene Assessment Report')
    this.drawDivider()
    this.writeLine(`姓名：${a.user.name || '—'}`, 12, C_TEXT)
    this.writeLine(`手机号：${a.user.phone}`, 12, C_TEXT)
    this.writeLine(`生成时间：${new Date().toLocaleString('zh-CN')}`, 12, C_SUB)
    this.y -= 8

    const mbti = results.mbti
    if (mbti) {
      this.drawSection('一、MBTI 性格类型')
      this.writeLine(`类型：${mbti.type || '—'}  ${mbti.name || ''}`, 16, C_PRIMARY)
      if (mbti.desc) this.writeWrapped(mbti.desc, 11, C_TEXT)
      this.y -= 4
      const pairs: any[] = mbti.pairs || []
      for (const p of pairs) {
        this.drawBarRow(`${cnLabel('mbti', p.a)}  ${p.pa ?? 0}%`, p.pa ?? 0, C_PRIMARY)
        this.drawBarRow(`${cnLabel('mbti', p.b)}  ${p.pb ?? 0}%`, p.pb ?? 0, C_SUB)
        this.y -= 4
      }
      this.y -= 6
    }

    this.drawDimensionSection('二、DISC 行为风格', results.disc, 'disc')
    this.drawDimensionSection('三、PDP 天性特质', results.pdp, 'pdp')
    this.drawDimensionSection('四、九型人格', results.ennea, 'ennea')
    this.drawDimensionSection('五、职业锚', results.career, 'career')

    if (Array.isArray(partRecords) && partRecords.length) {
      this.ensureSpace(80)
      this.drawSection('六、作答明细')
      for (const part of partRecords) {
        this.ensureSpace(60)
        this.writeLine(`第 ${(part.partIndex ?? 0) + 1} 部分 · ${part.partTitle || ''}`, 13, C_PRIMARY)
        this.y -= 2
        const qs: any[] = part.questions || []
        for (let i = 0; i < qs.length; i++) {
          const q = qs[i]
          const opts: string[] = Array.isArray(q.options) ? q.options : []
          const ans = q.answer
          this.ensureSpace(40)
          this.writeWrapped(`${i + 1}. ${q.text || ''}`, 10, C_TEXT)
          const chosen = ans != null && opts[ans] != null ? opts[ans] : '（未作答）'
          this.writeWrapped(`→ 你的选择：${chosen}`, 10, C_PRIMARY)
          this.y -= 6
        }
        this.y -= 6
      }
    }

    const pages = this.pdfDoc.getPages()
    pages.forEach((pg, idx) => {
      pg.drawText(`职业基因测评 · 第 ${idx + 1} / ${pages.length} 页`, {
        x: MARGIN, y: 24, size: 9, font: this.font, color: C_SUB,
      })
    })

    // 记录报告生成
    await this.prisma.report.create({ data: { assessmentId: a.id, format: 'pdf' } })

    return this.pdfDoc.save()
  }

  private ensureSpace(h: number) {
    if (this.y - h < MARGIN) {
      this.page = this.pdfDoc.addPage([PAGE_W, PAGE_H])
      this.y = PAGE_H - MARGIN
    }
  }
  private drawTitle(text: string) {
    this.page.drawText(text, { x: MARGIN, y: this.y, size: 24, font: this.font, color: C_TEXT })
    this.y -= 30
  }
  private drawSubtitle(text: string) {
    this.page.drawText(text, { x: MARGIN, y: this.y, size: 11, font: this.font, color: C_SUB })
    this.y -= 18
  }
  private drawDivider() {
    this.page.drawLine({ start: { x: MARGIN, y: this.y }, end: { x: PAGE_W - MARGIN, y: this.y }, thickness: 1, color: C_LINE })
    this.y -= 14
  }
  private drawSection(title: string) {
    this.ensureSpace(40)
    this.page.drawRectangle({ x: MARGIN, y: this.y - 4, width: 5, height: 16, color: C_PRIMARY })
    this.page.drawText(title, { x: MARGIN + 12, y: this.y, size: 15, font: this.font, color: C_TEXT })
    this.y -= 26
  }
  private drawDimensionSection(title: string, axes: AxisRow[], type: keyof typeof CN_LABELS) {
    if (!Array.isArray(axes) || !axes.length) return
    this.drawSection(title)
    for (const ax of axes) this.drawBarRow(`${cnLabel(type, ax.label)}  ${ax.rate ?? 0}%`, ax.rate ?? 0, C_PRIMARY)
    this.y -= 8
  }
  private drawBarRow(label: string, rate: number, color: any) {
    this.ensureSpace(30)
    const safeRate = Math.max(0, Math.min(100, Number(rate) || 0))
    this.writeLineRaw(label, 11, C_TEXT, MARGIN)
    const barY = this.y
    const barH = 9
    const barW = CONTENT_W
    this.page.drawRectangle({ x: MARGIN, y: barY, width: barW, height: barH, color: C_BG })
    if (safeRate > 0) {
      this.page.drawRectangle({ x: MARGIN, y: barY, width: (barW * safeRate) / 100, height: barH, color })
    }
    this.y = barY - barH - 10
  }
  private writeLine(text: string, size: number, color: any) {
    this.ensureSpace(size + 6)
    this.page.drawText(text, { x: MARGIN, y: this.y, size, font: this.font, color })
    this.y -= size + 8
  }
  private writeLineRaw(text: string, size: number, color: any, x: number) {
    this.ensureSpace(size + 6)
    this.page.drawText(text, { x, y: this.y, size, font: this.font, color })
    this.y -= size + 6
  }
  private writeWrapped(text: string, size: number, color: any) {
    const maxWidth = CONTENT_W
    let line = ''
    const lines: string[] = []
    const chars = Array.from(text || '')
    for (const ch of chars) {
      const test = line + ch
      if (this.font.widthOfTextAtSize(test, size) > maxWidth && line) {
        lines.push(line)
        line = ch
      } else {
        line = test
      }
    }
    if (line) lines.push(line)
    for (const l of lines) {
      this.ensureSpace(size + 6)
      this.page.drawText(l, { x: MARGIN, y: this.y, size, font: this.font, color })
      this.y -= size + 6
    }
    this.y -= 2
  }
}
