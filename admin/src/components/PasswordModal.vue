<template>
  <div v-if="show" class="modal-mask" @click.self="$emit('cancel')">
    <div class="modal">
      <h3>确认本次全部修改</h3>
      <p class="scope">目标：{{ partLabel }}　·　以下为本次所有改动，请逐项核对</p>

      <div class="diff-box">
        <div class="diff-head">本次所有改动（共 {{ diff.length }} 处）</div>
        <div v-if="diff.length === 0" class="diff-empty">无变更</div>
        <div v-for="d in diff" :key="d.q" class="diff-item">
          <div class="diff-q">第 {{ d.q }} 题</div>
          <div v-for="(c, ci) in d.changes" :key="ci" class="diff-change">{{ c }}</div>
        </div>
      </div>

      <label class="field">
        <span>修改说明（审计 / 版本备注）</span>
        <textarea v-model="note" rows="2" placeholder="例如：修正第三题选项表述、调整算分键…"></textarea>
      </label>

      <label class="field">
        <span>管理员密码</span>
        <input v-model="password" type="password" placeholder="请输入管理员密码" @keyup.enter="tryConfirm" />
      </label>

      <label class="check">
        <input type="checkbox" v-model="confirmed" />
        <span>我已逐项核对以上变更，确认无误</span>
      </label>

      <div class="modal-actions">
        <button class="btn-cancel" @click="$emit('cancel')">放弃修改</button>
        <button class="btn-ok" :disabled="!canConfirm" @click="tryConfirm">最终提交</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface DiffRow {
  q: number
  changes: string[]
}

const props = defineProps<{
  show: boolean
  diff: DiffRow[]
  partLabel: string
}>()
const emit = defineEmits<{
  (e: 'cancel'): void
  (e: 'confirm', payload: { note: string; password: string }): void
}>()

const note = ref('')
const password = ref('')
const confirmed = ref(false)

watch(
  () => props.show,
  (v) => {
    if (v) {
      note.value = ''
      password.value = ''
      confirmed.value = false
    }
  },
)

const canConfirm = computed(() => !!password.value && confirmed.value)

function tryConfirm() {
  if (!canConfirm.value) return
  emit('confirm', { note: note.value.trim(), password: password.value })
}
</script>
