<template>
  <div class="up" v-if="stats && users && visits">
    <h2>用户面板</h2>

    <div class="stat-grid">
      <div class="stat-card total">
        <div class="stat-num">{{ stats.registered }}</div>
        <div class="stat-label">已注册人数</div>
      </div>
      <div class="stat-card" v-for="(label, i) in stats.partLabels" :key="i">
        <div class="stat-num">{{ stats.partDoneCounts[i] }}</div>
        <div class="stat-label">{{ label }} 完成人数</div>
      </div>
      <div class="stat-card all">
        <div class="stat-num">{{ stats.allCompleted }}</div>
        <div class="stat-label">完成全部问卷</div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head">
        <h3>每日访问人数</h3>
        <div class="days">
          <button
            v-for="d in [7, 30, 90]"
            :key="d"
            :class="{ active: days === d }"
            @click="setDays(d)"
          >近{{ d }}天</button>
        </div>
      </div>
      <LineChart :data="visits" />
      <div class="visit-sum">
        区间总访问：<b>{{ totalVisits }}</b> 次 · 日均：<b>{{ avgVisits }}</b> 次
      </div>
    </div>

    <div class="panel">
      <div class="panel-head">
        <h3>每用户完成情况（共 {{ users.length }} 人）</h3>
        <div class="export-btns">
          <button class="btn-export" @click="doExport('excel', false)">导出Excel（不含结果）</button>
          <button class="btn-export" @click="doExport('excel', true)">导出Excel（含结果）</button>
          <button class="btn-export" @click="doExport('word', false)">导出Word（不含结果）</button>
          <button class="btn-export" @click="doExport('word', true)">导出Word（含结果）</button>
        </div>
      </div>
      <div class="table-wrap">
        <table class="user-table">
          <thead>
            <tr>
              <th>手机号</th>
              <th>姓名</th>
              <th>公司</th>
              <th>注册时间</th>
              <th v-for="(label, i) in stats.partLabels" :key="i" class="center">{{ shortLabel(label) }}</th>
              <th class="center">完成度</th>
              <th class="center">已答/总</th>
              <th class="center">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in users" :key="u.id">
              <td>{{ u.phone }}</td>
              <td>{{ u.name }}</td>
              <td>{{ u.company || '-' }}</td>
              <td>{{ fmtTime(u.registeredAt) }}</td>
              <td v-for="(done, i) in u.doneParts" :key="i" class="center">
                <span :class="done ? 'ok' : 'no'">{{ done ? '✓' : '—' }}</span>
              </td>
              <td class="center">
                <div class="bar">
                  <div class="bar-fill" :style="{ width: u.completion + '%' }"></div>
                  <span class="bar-text">{{ u.completion }}%</span>
                </div>
              </td>
              <td class="center">{{ u.answeredCount }}/{{ u.total }}</td>
              <td class="center">
                <button
                  v-if="u.allCompleted"
                  class="btn-view"
                  @click="openResult(u.id, u.name)"
                >查看结果</button>
                <span v-else class="no">—</span>
              </td>
            </tr>
            <tr v-if="!users.length">
              <td :colspan="8 + stats.partLabels.length" class="empty">暂无用户数据</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 结果弹窗 -->
    <Teleport to="body">
      <div class="modal-overlay" v-if="resultModal.visible" @click.self="closeResult">
        <div class="modal-box result-modal">
          <div class="modal-head">
            <h3>{{ resultModal.userName }} 的测试结果</h3>
            <button class="modal-close" @click="closeResult">&times;</button>
          </div>
          <div class="modal-body" v-if="resultModal.loading">加载中…</div>
          <div class="modal-body" v-else-if="resultModal.error">{{ resultModal.error }}</div>
          <div class="modal-body result-content" v-else-if="resultModal.data">
            <!-- MBTI -->
            <div class="r-section" v-if="resultModal.data.result.mbti">
              <h4>MBTI · 性格类型</h4>
              <div class="mbti-pairs">
                <div class="pair-row" v-for="(pr, i) in mbtiMappedPairs" :key="i">
                  <div class="pair-labels">
                    <span class="pair-a">{{ pr.a }}</span>
                    <span class="pair-vs">vs</span>
                    <span class="pair-b">{{ pr.b }}</span>
                  </div>
                  <div class="pair-bar-wrap">
                    <div class="pair-bar-a" :style="{ width: pr.pa + '%' }">{{ pr.pa }}%</div>
                    <div class="pair-bar-b" :style="{ width: pr.pb + '%' }">{{ pr.pb }}%</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- DISC -->
            <div class="r-section" v-if="resultModal.data.result.disc?.length">
              <h4>DISC · 行为与沟通风格</h4>
              <div class="axis-list">
                <div v-for="ax in mappedResultAxes('disc')" :key="ax.label" class="axis-row">
                  <span class="axis-label">{{ ax.label }}</span>
                  <div class="axis-bar-bg"><div class="axis-bar-fill" :style="{ width: ax.rate + '%', background: discColor }"></div></div>
                  <span class="axis-rate">{{ ax.rate }}%</span>
                </div>
              </div>
            </div>

            <!-- PDP -->
            <div class="r-section" v-if="resultModal.data.result.pdp?.length">
              <h4>PDP · 能量特质与气场</h4>
              <div class="axis-list">
                <div v-for="ax in mappedResultAxes('pdp')" :key="ax.label" class="axis-row">
                  <span class="axis-label">{{ ax.label }}</span>
                  <div class="axis-bar-bg"><div class="axis-bar-fill" :style="{ width: ax.rate + '%', background: pdpColor }"></div></div>
                  <span class="axis-rate">{{ ax.rate }}%</span>
                </div>
              </div>
            </div>

            <!-- 九型 -->
            <div class="r-section" v-if="resultModal.data.result.ennea?.length">
              <h4>九型 · 核心动机与注意力焦点</h4>
              <div class="axis-list">
                <div v-for="ax in mappedResultAxes('ennea')" :key="ax.label" class="axis-row">
                  <span class="axis-label">{{ ax.label }}</span>
                  <div class="axis-bar-bg"><div class="axis-bar-fill" :style="{ width: ax.rate + '%', background: enneaColor }"></div></div>
                  <span class="axis-rate">{{ ax.rate }}%</span>
                </div>
              </div>
            </div>

            <!-- 职业锚 -->
            <div class="r-section" v-if="resultModal.data.result.career?.length">
              <h4>职业锚 · 驱动力排序</h4>
              <div class="axis-list">
                <div v-for="ax in mappedResultAxes('career')" :key="ax.label" class="axis-row">
                  <span class="axis-label">{{ ax.label }}</span>
                  <div class="axis-bar-bg"><div class="axis-bar-fill" :style="{ width: ax.rate + '%', background: careerColor }"></div></div>
                  <span class="axis-rate">{{ ax.rate }}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <div class="err-banner" v-if="error">{{ error }}</div>
  </div>
  <div v-else class="loading">加载中…</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { getStats, getUsers, getVisits, getUserResult, getExportUrl } from '@/api/admin'
import type { StatsResp, UserRow, VisitPoint, UserResult } from '@/api/admin'
import LineChart from '@/components/LineChart.vue'

const stats = ref<StatsResp | null>(null)
const users = ref<UserRow[] | null>(null)
const visits = ref<VisitPoint[] | null>(null)
const days = ref(30)
const error = ref('')

const resultModal = reactive({
  visible: false,
  loading: false,
  error: '',
  userName: '',
  data: null as UserResult | null,
})

// 标签映射
const labelMap: Record<string, Record<string, string>> = {
  mbti: { E: '外倾E', I: '内倾I', N: '直觉N', S: '感觉S', F: '情感F', T: '思考T', J: '判断J', P: '知觉P' },
  disc: { D: '支配型D', I: '影响型I', S: '稳健型S', C: '服从型C' },
  pdp: { T: '老虎型T', P: '孔雀型P', K: '考拉型K', O: '猫头鹰型O', C: '变色龙型C' },
  ennea: { A: '完美型A', B: '助人型B', C: '成就型C', D: '浪漫型D', E: '理智型E', F: '忠诚型F', G: '活跃型G', H: '领袖型H', I: '和平型I' },
  career: { X: '自由型X', Y: '平衡型Y', Z: '活力型Z', W: '安全型W', V: '进取型V' },
}

function mapLabel(type: string) { return (l: string) => (labelMap[type] || {})[l] || l }

const mbtiMappedPairs = computed(() => {
  const m = resultModal.data?.result?.mbti
  if (!m || !Array.isArray(m.pairs)) return []
  return m.pairs.map((pr: any) => ({
    ...pr,
    a: (labelMap.mbti || {})[pr.a] || pr.a,
    b: (labelMap.mbti || {})[pr.b] || pr.b,
  }))
})

function mappedResultAxes(type: 'disc' | 'pdp' | 'ennea' | 'career') {
  const axes = resultModal.data?.result?.[type]
  if (!Array.isArray(axes)) return []
  return axes.map((a: any) => ({ ...a, label: (labelMap[type] || {})[a.label] || a.label }))
}

const discColor = '#e4572e'
const pdpColor = '#3b6ef0'
const enneaColor = '#10b3a3'
const careerColor = '#8b5cf6'

function openResult(userId: number, name: string) {
  resultModal.visible = true
  resultModal.loading = true
  resultModal.error = ''
  resultModal.userName = name
  resultModal.data = null
  getUserResult(userId).then((d) => {
    resultModal.data = d
    resultModal.loading = false
  }).catch((e: any) => {
    resultModal.error = e?.message || '加载失败'
    resultModal.loading = false
  })
}

function closeResult() {
  resultModal.visible = false
  resultModal.data = null
}

function doExport(format: 'excel' | 'word', includeResults: boolean) {
  const token = localStorage.getItem('admin_access_token') || ''
  const url = getExportUrl(format, includeResults)
  // 使用带 token 的下载方式
  fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then((res) => {
    if (!res.ok) throw new Error('导出失败')
    return res.blob()
  }).then((blob) => {
    const ext = format === 'word' ? 'doc' : 'xlsx'
    const objUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objUrl
    a.download = `用户数据导出.${ext}`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(objUrl)
  }).catch((e: any) => {
    alert('导出失败: ' + (e?.message || '未知错误'))
  })
}

const totalVisits = computed(() =>
  (visits.value || []).reduce((s, v) => s + v.count, 0),
)
const avgVisits = computed(() => {
  const n = visits.value?.length || 1
  return (totalVisits.value / n).toFixed(1)
})

function shortLabel(label: string): string {
  const m = label.match(/第.部分/)
  return m ? m[0] : label
}
function fmtTime(s: string): string {
  const d = new Date(s)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function loadAll() {
  error.value = ''
  try {
    const [s, u, v] = await Promise.all([getStats(), getUsers(), getVisits(days.value)])
    stats.value = s
    users.value = u
    visits.value = v
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  }
}

async function setDays(d: number) {
  days.value = d
  try {
    visits.value = await getVisits(d)
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  }
}

onMounted(loadAll)
</script>

<style scoped>
/* -- 复用原有大部分样式并通过追加覆盖 -- */

.loading { text-align: center; color: #888; padding: 40px 0; }
.err-banner { background: #fdecea; color: #b71c1c; padding: 10px 16px; border-radius: 6px; margin-top: 16px; }
h2 { margin-bottom: 16px; }

.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}
.stat-card {
  background: #fff;
  border-radius: 10px;
  padding: 18px 14px;
  box-shadow: 0 2px 8px rgba(0,0,0,.06);
  text-align: center;
}
.stat-num { font-size: 32px; font-weight: 700; color: var(--accent,#3b6ef0); }
.stat-label { font-size: 13px; color: #666; margin-top: 4px; }

.panel {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,.06);
  padding: 20px;
  margin-bottom: 20px;
}
.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}
.panel-head h3 { margin: 0; font-size: 16px; }

.export-btns { display: flex; gap: 8px; flex-wrap: wrap; }
.btn-export {
  border: 1px solid var(--accent,#3b6ef0);
  background: #fff;
  color: var(--accent,#3b6ef0);
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}
.btn-export:hover { background: #e8f0fe; }

.days button {
  margin-left: 8px;
  padding: 4px 12px;
  border: 1px solid #ccc;
  background: #fff;
  border-radius: 4px;
  cursor: pointer;
}
.days button.active { background: var(--accent,#3b6ef0); color: #fff; border-color: var(--accent,#3b6ef0); }

.visit-sum { margin-top: 12px; text-align: center; font-size: 13px; color: #555; }

.table-wrap { overflow-x: auto; }

.user-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.user-table th, .user-table td {
  border: 1px solid #e0e0e0;
  padding: 8px 10px;
  white-space: nowrap;
}
.user-table thead { background: #f5f7fa; }
.user-table th.center, .user-table td.center { text-align: center; }
.user-table .empty { text-align: center; color: #999; padding: 24px; }

.ok { color: #2e7d32; font-weight: 700; }
.no { color: #ccc; }

.bar {
  position: relative;
  height: 20px;
  background: #eee;
  border-radius: 4px;
  min-width: 60px;
}
.bar-fill {
  height: 100%;
  border-radius: 4px;
  background: linear-gradient(90deg, #3b6ef0, #10b3a3);
}
.bar-text {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  font-size: 11px;
  font-weight: 600;
  color: #333;
}

.btn-view {
  background: var(--accent,#3b6ef0);
  color: #fff;
  border: none;
  padding: 3px 10px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}
.btn-view:hover { opacity: 0.85; }

/* 结果弹窗 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.45);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  z-index: 9999;
  padding: 40px 16px;
  overflow-y: auto;
}
.modal-box {
  background: #fff;
  border-radius: 12px;
  max-width: 720px;
  width: 100%;
  box-shadow: 0 8px 32px rgba(0,0,0,.2);
}
.modal-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
}
.modal-head h3 { margin: 0; font-size: 17px; }
.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
  line-height: 1;
}
.modal-close:hover { color: #333; }
.modal-body { padding: 20px; max-height: 70vh; overflow-y: auto; }

.result-content h4 { margin: 16px 0 10px; font-size: 15px; color: #333; border-left: 3px solid var(--accent,#3b6ef0); padding-left: 10px; }

.mbti-pairs { display: flex; flex-direction: column; gap: 12px; }
.pair-row { display: flex; flex-direction: column; gap: 4px; }
.pair-labels { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; }
.pair-a { color: #3b6ef0; }
.pair-vs { color: #999; font-size: 11px; }
.pair-b { color: #f3a712; }
.pair-bar-wrap {
  display: flex;
  height: 18px;
  border-radius: 4px;
  overflow: hidden;
  font-size: 11px;
}
.pair-bar-a { background: #3b6ef0; color: #fff; display: flex; align-items: center; justify-content: flex-end; padding-right: 4px; min-width: 20px; }
.pair-bar-b { background: #f3a712; color: #fff; display: flex; align-items: center; padding-left: 4px; min-width: 20px; }

.axis-list { display: flex; flex-direction: column; gap: 6px; }
.axis-row { display: flex; align-items: center; gap: 10px; }
.axis-label { width: 90px; font-size: 12px; font-weight: 600; text-align: right; flex-shrink: 0; }
.axis-bar-bg { flex: 1; height: 16px; background: #eee; border-radius: 4px; overflow: hidden; }
.axis-bar-fill { height: 100%; border-radius: 4px; }
.axis-rate { width: 40px; font-size: 12px; color: #555; }
</style>
