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
      </div>
      <div class="table-wrap">
        <table class="user-table">
          <thead>
            <tr>
              <th>手机号</th>
              <th>姓名</th>
              <th>注册时间</th>
              <th v-for="(label, i) in stats.partLabels" :key="i" class="center">{{ shortLabel(label) }}</th>
              <th class="center">完成度</th>
              <th class="center">已答/总</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in users" :key="u.id">
              <td>{{ u.phone }}</td>
              <td>{{ u.name }}</td>
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
            </tr>
            <tr v-if="!users.length">
              <td :colspan="6 + stats.partLabels.length" class="empty">暂无用户数据</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="err-banner" v-if="error">{{ error }}</div>
  </div>
  <div v-else class="loading">加载中…</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getStats, getUsers, getVisits } from '@/api/admin'
import type { StatsResp, UserRow, VisitPoint } from '@/api/admin'
import LineChart from '@/components/LineChart.vue'

const stats = ref<StatsResp | null>(null)
const users = ref<UserRow[] | null>(null)
const visits = ref<VisitPoint[] | null>(null)
const days = ref(30)
const error = ref('')

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
