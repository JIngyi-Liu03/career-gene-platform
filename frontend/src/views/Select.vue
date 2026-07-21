<template>
  <div id="select">
    <div class="sel-card">
      <div class="sel-head">
        <h2>{{ greeting }}</h2>
        <p>每个部分需一次性答完，中途退出不保留本次作答。<br>无需一次性做完 5 个部分——随时可退出，下次用同一手机号登录即可继续。</p>
      </div>
      <div class="sel-notice-item" @click="goNotice">
        <div class="notice-no">须</div>
        <div class="sel-info">
          <div class="t">测试须知　<span style="font-size:13px;color:var(--sub);font-weight:400">开始前必读</span></div>
          <div class="d">请仔细阅读全部须知，了解测试规则与作答指引</div>
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
          style="cursor:pointer"
          @click="onPartClick(p)"
        >
          <div class="sel-no">{{ ['一', '二', '三', '四', '五'][p] }}</div>
          <div class="sel-info">
            <div class="t">{{ c.title }}　<span>{{ c.count }}</span></div>
            <div class="d">{{ c.intro.split('\n')[0].slice(0, 40) + (c.intro.length > 40 ? '…' : '') }}</div>
          </div>
          <div class="sel-right">
            <div class="sel-status" :class="doneParts[p] ? 's-done' : 's-new'">
              {{ doneParts[p] ? '已完成' : '未开始' }}
            </div>
            <div v-if="doneParts[p]" style="display:flex;gap:8px">
              <button class="sel-retry-btn" @click.stop="retry(p)">重新测试</button>
              <button class="sel-view-btn" @click.stop="viewRecord(p)">查看记录</button>
            </div>
          </div>
        </div>
      </div>
      <div class="sel-progress-wrap">
        <div class="sel-progress-label">完成进度 <span>{{ progressCount }}/5</span></div>
        <div class="sel-progress-bar">
          <div v-for="p in 5" :key="p" class="sel-progress-seg" :class="{ lit: doneParts[p - 1] }"></div>
        </div>
        <button
          class="btn-primary sel-result-btn"
          :class="{ disabled: progressCount < 5 }"
          :disabled="progressCount < 5"
          @click="goResult"
        >查看报告</button>
      </div>
      <div class="sel-actions">
        <button class="btn-ghost" @click="onLogout">退出登录</button>
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
const greeting = computed(() => surveyStore.displayName() + '，请选择测试部分')

async function ensure(): Promise<void> {
  if (!hasTokens()) { router.replace('/login'); return }
  if (!surveyStore.state.meta) await surveyStore.init()
}

onMounted(ensure)

function onPartClick(p: number): void {
  if (doneParts.value[p]) viewRecord(p)
  else { surveyStore.startChapter(p); router.push('/chapter') }
}
function retry(p: number): void {
  surveyStore.startChapter(p)
  router.push('/quiz')
}
function viewRecord(p: number): void { surveyStore.openViewRecord(p) }
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
