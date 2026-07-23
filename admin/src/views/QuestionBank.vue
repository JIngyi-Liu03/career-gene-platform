<template>
  <div class="qb" v-if="bank">
    <aside class="sidebar">
      <div class="side-title">五个题库（分开编辑）</div>
      <button
        v-for="(p, i) in bank.parts"
        :key="i"
        class="side-item"
        :class="{ active: i === selected }"
        @click="selectPart(i)"
      >
        <span>{{ p.label }}</span>
        <span v-if="isPartDirty(i)" class="dot" title="有未保存修改"></span>
      </button>

      <div class="versions-toggle" @click="toggleVersions">
        {{ showVersions ? '收起版本历史 ▲' : '版本历史 / 回滚 ▼' }}
      </div>
      <div v-if="showVersions" class="versions">
        <div v-if="!versions.length" class="v-empty">暂无版本记录</div>
        <div v-for="v in versions" :key="v.version" class="v-item">
          <div class="v-meta">
            <b>v{{ v.version }}</b>
            <span class="v-op">{{ v.operator }}</span>
            <span class="v-time">{{ fmtTime(v.createdAt) }}</span>
          </div>
          <div class="v-note">{{ v.note || '（无说明）' }}</div>
          <button class="v-rollback" :disabled="rollbacking === v.version" @click="doRollback(v.version)">
            {{ rollbacking === v.version ? '回滚中…' : '回滚到此版本' }}
          </button>
        </div>
      </div>
    </aside>

    <section class="main">
      <div class="part-head">
        <div>
          <h2>{{ part?.label }}</h2>
          <p class="scoring-note">{{ part?.scoringNote }}</p>
        </div>
        <div class="legend">
          <span class="legend-label">合法维度：</span>
          <span v-for="d in dimensions" :key="d" class="dim-chip">{{ d }}</span>
        </div>
      </div>

      <div class="q-list">
        <div v-for="(q, qi) in editing" :key="qi" class="q-card" :class="{ deleted: q._deleted }">
          <div class="q-top">
            <span class="q-no">第 {{ qi + 1 }} 题</span>
            <span v-if="q._deleted" class="del-badge">待删除</span>
            <button v-if="q._deleted" class="q-restore" @click="restoreQuestion(qi)">撤销删除</button>
            <button v-else-if="activeQuestions > 1" class="q-del" @click="removeQuestion(qi)">删除</button>
          </div>
          <input v-model="q.text" class="q-text" placeholder="题干（可空）" :disabled="q._deleted" />

          <div class="opts">
            <div v-for="(opt, oi) in q.options" :key="oi" class="opt-row" :class="{ deleted: q._optDel?.[oi] }">
              <span class="opt-idx">{{ String.fromCharCode(65 + oi) }}.</span>
              <input v-model="q.options[oi]" class="opt-input" placeholder="选项文本" :disabled="q._optDel?.[oi]" />
              <select
                v-if="!isPdp"
                v-model="q.m[oi]"
                class="dim-sel"
                :disabled="q._optDel?.[oi]"
                :title="'选项 ' + String.fromCharCode(65 + oi) + ' 算分键'"
              >
                <option v-for="d in dimensions" :key="d" :value="d">{{ d }}</option>
              </select>
              <button v-if="q._optDel?.[oi]" class="opt-restore" @click="restoreOption(q, oi)">撤销</button>
              <button v-else-if="activeOptCount(q) > 2" class="opt-del" @click="removeOption(q, oi)">×</button>
            </div>
          </div>
          <div v-if="isPdp" class="pdp-dim">
            <span class="pdp-dim-label">本题维度：</span>
            <select v-model="q.dim" class="dim-sel">
              <option v-for="d in dimensions" :key="d" :value="d">{{ d }}</option>
            </select>
            <span class="pdp-dim-hint">（计分 = 5 − 选项序号，越靠前分值越高）</span>
          </div>
          <button class="opt-add" @click="addOption(q)">+ 添加选项</button>
        </div>
        <button class="q-add" @click="addQuestion">+ 新增题目</button>
      </div>

      <div class="footer-actions">
        <span class="dirty-hint" v-if="dirty">● 当前部分有未保存修改</span>
        <span class="dirty-hint ok" v-else>✓ 无改动</span>
        <button class="btn-save" :disabled="!dirty || saving" @click="openConfirm">
          {{ saving ? '保存中…' : '确定修改' }}
        </button>
      </div>
    </section>

    <PasswordModal
      :show="showModal"
      :diff="modalDiff"
      :part-label="part?.label || ''"
      @cancel="showModal = false"
      @confirm="onConfirm"
    />

    <div class="toast" v-if="toast">{{ toast }}</div>
    <div class="err-banner" v-if="error">{{ error }}</div>
  </div>
  <div v-else class="loading">加载题库中…</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getBank, updatePart, getVersions, rollback } from '@/api/admin'
import type { AdminQuestion, BankPart, BankVersion } from '@/api/admin'
import PasswordModal from '@/components/PasswordModal.vue'

type EditQuestion = AdminQuestion & { _deleted?: boolean; _optDel?: boolean[] }

const bank = ref<{ currentVersion: number | null; parts: BankPart[] } | null>(null)
const selected = ref(0)
const editing = ref<EditQuestion[]>([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const toast = ref('')
const showModal = ref(false)
const modalDiff = ref<{ q: number; changes: string[] }[]>([])
const versions = ref<BankVersion[]>([])
const showVersions = ref(false)
const rollbacking = ref<number | null>(null)

const part = computed(() => bank.value?.parts[selected.value])
const isPdp = computed(() => part.value?.type === 'pdp')
const dimensions = computed(() => part.value?.dimensions || [])

function stripInner(v: any): any {
  const c = JSON.parse(JSON.stringify(v))
  delete c._deleted
  delete c._optDel
  return c
}
// 应用删除标记后的“预期生效结果”，用于判断是否有改动 & 真正提交
function previewResult(): AdminQuestion[] {
  return editing.value
    .filter((q) => !q._deleted)
    .map((q) => {
      const c = stripInner(q)
      const del = q._optDel || []
      c.options = c.options.filter((_: any, k: number) => !del[k])
      if (c.m) c.m = c.m.filter((_: any, k: number) => !del[k])
      return c
    })
}
const dirty = computed(
  () => JSON.stringify(previewResult()) !== JSON.stringify(part.value?.questions || []),
)
const activeQuestions = computed(() => editing.value.filter((q) => !q._deleted).length)
function activeOptCount(q: EditQuestion): number {
  const del = q._optDel?.filter(Boolean).length || 0
  return q.options.length - del
}

function isPartDirty(i: number): boolean {
  if (!bank.value) return false
  if (i === selected.value) return dirty.value
  return false
}

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v))
}

function fmtTime(s: string): string {
  const d = new Date(s)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

async function loadBank() {
  loading.value = true
  error.value = ''
  try {
    const b = await getBank()
    bank.value = b
    selected.value = 0
    editing.value = deepClone(b.parts[0].questions)
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function selectPart(i: number) {
  if (i === selected.value) return
  if (dirty.value && !confirm('当前部分有未保存的修改，切换将丢失。确定切换？')) return
  selected.value = i
  editing.value = deepClone(part.value!.questions)
  error.value = ''
}

function newQuestion(): EditQuestion {
  const p = part.value!
  return {
    type: p.type,
    sec: p.questions[0]?.sec ?? null,
    text: '',
    options: ['', ''],
    m: p.type === 'pdp' ? null : ['', ''],
    dim: p.type === 'pdp' ? p.dimensions[0] || null : null,
    _optDel: [],
  }
}

function addOption(q: EditQuestion) {
  q.options.push('')
  ;(q._optDel = q._optDel || []).push(false)
  if (q.type !== 'pdp') (q.m = q.m || []).push('')
}
function removeOption(q: EditQuestion, idx: number) {
  if (activeOptCount(q) <= 2) return
  q._optDel = q._optDel || []
  q._optDel[idx] = true
}
function restoreOption(q: EditQuestion, idx: number) {
  if (q._optDel) q._optDel[idx] = false
}
function addQuestion() {
  editing.value.push(newQuestion())
}
function removeQuestion(idx: number) {
  if (activeQuestions.value <= 1) return
  editing.value[idx]._deleted = true
}
function restoreQuestion(idx: number) {
  delete editing.value[idx]._deleted
}

function computeDiff(): { q: number; changes: string[] }[] {
  const orig = part.value?.questions || []
  const out: { q: number; changes: string[] }[] = []
  for (let i = 0; i < editing.value.length; i++) {
    const e = editing.value[i]
    const o = orig[i]
    const qNo = i + 1
    // 删除本题（变灰，待确认）
    if (e._deleted) {
      const txt = e.text ? `题干：“${e.text}”` : '（空题干）'
      const opts = e.options.map((t, k) => `${String.fromCharCode(65 + k)}.${t || '（空）'}`).join('　')
      out.push({ q: qNo, changes: [`删除本题 —— ${txt}；选项：${opts || '（无）'}`] })
      continue
    }
    // 新增题目
    if (!o) {
      out.push({ q: qNo, changes: ['（新增题目，保存后生效）'] })
      continue
    }
    const changes: string[] = []
    if ((o.text || '') !== (e.text || '')) {
      changes.push(`题干：${o.text || '（空）'} → ${e.text || '（空）'}`)
    }
    // 删除的选项
    ;(e._optDel || []).forEach((del, oi) => {
      if (del && o.options[oi] !== undefined) {
        changes.push(`删除选项 ${String.fromCharCode(65 + oi)}：${o.options[oi] || '（空）'}`)
      }
    })
    // 选项文本 / 数量变化
    if (JSON.stringify(o.options) !== JSON.stringify(e.options)) {
      e.options.forEach((opt, oi) => {
        const before = o.options[oi]
        if (!e._optDel?.[oi] && before !== opt) changes.push(`选项${oi + 1}：${before ?? '（无）'} → ${opt}`)
      })
      if (o.options.length !== e.options.length) {
        changes.push(`选项数量：${o.options.length} → ${e.options.length}`)
      }
    }
    if (e.type === 'pdp') {
      if ((o.dim || '') !== (e.dim || '')) {
        changes.push(`维度：${o.dim || '（空）'} → ${e.dim || '（空）'}`)
      }
    } else if (JSON.stringify(o.m || []) !== JSON.stringify(e.m || [])) {
      const em = e.m || []
      const om = o.m || []
      em.forEach((mm, oi) => {
        const before = om[oi]
        if (before !== mm) changes.push(`选项${oi + 1} 算分键：${before ?? '（空）'} → ${mm}`)
      })
      if (om.length !== em.length) changes.push('算分键数量变化')
    }
    if (changes.length) out.push({ q: qNo, changes })
  }
  return out
}

function openConfirm() {
  modalDiff.value = computeDiff()
  showModal.value = true
}

async function onConfirm(payload: { note: string; password: string }) {
  saving.value = true
  error.value = ''
  try {
    const r = await updatePart(selected.value, {
      note: payload.note,
      questions: previewResult(),
    })
    showModal.value = false
    showToast(`已保存并全网生效 · 版本 v${r.version}`)
    await loadBank()
  } catch (e: any) {
    error.value = e?.message || '保存失败'
  } finally {
    saving.value = false
  }
}

async function loadVersions() {
  try {
    versions.value = await getVersions()
  } catch (e: any) {
    error.value = e?.message || '版本加载失败'
  }
}
function toggleVersions() {
  showVersions.value = !showVersions.value
  if (showVersions.value && versions.value.length === 0) loadVersions()
}
async function doRollback(v: number) {
  if (!confirm(`确定回滚到版本 v${v}？将生成一条新版本记录。`)) return
  rollbacking.value = v
  try {
    const r = await rollback(v)
    showToast(`已回滚到 v${v} · 新版本 v${r.version}`)
    await loadBank()
    await loadVersions()
  } catch (e: any) {
    error.value = e?.message || '回滚失败'
  } finally {
    rollbacking.value = null
  }
}

function showToast(msg: string) {
  toast.value = msg
  setTimeout(() => {
    toast.value = ''
  }, 3000)
}

onMounted(loadBank)
</script>
