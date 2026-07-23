<template>
  <div id="select">
    <div class="sel-card">
      <div class="sel-head">
        <h2>{{ name }}，请选择测试部分</h2>
        <p class="sel-tip">开始前请仔细阅读测试须知，了解测试规则与答题指引。</p>
      </div>

      <div class="sel-notice-item" @click="goNotice">
        <div class="sel-info">
          <div class="t">测试须知</div>
        </div>
        <div class="sel-right">
          <button class="sel-notice-btn" @click.stop="goNotice">查 看</button>
        </div>
      </div>

      <div class="sel-grid">
        <div
          v-for="(c, p) in parts"
          :key="p"
          class="sel-item"
          :class="{ done: doneParts[p] }"
        >
          <div class="sel-info">
            <div class="t">{{ partLabel(p) }}　<span>{{ c.count }}</span></div>
          </div>
          <div class="sel-right">
            <button v-if="!doneParts[p]" class="sel-start-btn" @click="startQuiz(p)">开 始</button>
            <template v-else>
              <button class="sel-retry-btn" @click="confirmRetry(p)">重新测试</button>
              <button class="sel-view-btn" @click="viewRecord(p)">查看记录</button>
            </template>
          </div>
        </div>
      </div>

      <button
        class="btn-primary sel-result-btn"
        :class="{ disabled: progressCount < 5 }"
        :disabled="progressCount < 5"
        @click="goResult"
      >
        <span class="rb-main">查看报告</span>
        <span class="rb-sub">完成进度 {{ progressCount }}/5</span>
      </button>

      <div class="sel-actions">
        <button class="sel-logout-btn" @click="onLogout">退出登录</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { surveyStore } from '@/stores/survey'
import { uiStore } from '@/stores/ui'
import { hasTokens } from '@/api/http'

const router = useRouter()
const parts = computed(() => surveyStore.state.meta?.parts || [])
const doneParts = computed(() => surveyStore.state.doneParts)
const progress = surveyStore.progress
const progressCount = computed(() => progress.value.count)
const name = computed(() => surveyStore.displayName())

const PART_LABELS = ['第一部分', '第二部分', '第三部分', '第四部分', '第五部分']
function partLabel(p: number): string {
  return PART_LABELS[p] || `第${p + 1}部分`
}

async function ensure(): Promise<void> {
  if (!hasTokens()) { router.replace('/login'); return }
  if (!surveyStore.state.meta) await surveyStore.init()
}
onMounted(ensure)

// 开始 / 重新测试：直接进入答题，不经分隔确认页。fresh 表示重测（清空原作答）。
async function startQuiz(p: number, fresh = false): Promise<void> {
  surveyStore.startChapter(p)
  await surveyStore.enterChapter(fresh)
  router.push('/quiz')
}
function viewRecord(p: number): void { surveyStore.openViewRecord(p) }
function confirmRetry(p: number): void {
  uiStore.showConfirm(`重新测试将覆盖「${partLabel(p)}」已完成的作答记录，确定重新测试吗？`, () => startQuiz(p, true))
}
function goNotice(): void { router.push('/notice') }
function goResult(): void { if (progressCount.value === 5) router.push('/result') }
function onLogout(): void {
  if (surveyStore.state.sessionPart >= 0) {
    uiStore.showConfirm('当前部分正在作答中，中途退出则本次测试不做记录。确定退出吗？', () => {
      surveyStore.discardSession()
      surveyStore.logout()
      router.push('/')
    })
  } else {
    surveyStore.logout()
    router.push('/')
  }
}
</script>
