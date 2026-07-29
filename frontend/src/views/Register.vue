<template>
  <div class="auth-form">
    <h2 class="auth-title">注册账号</h2>
    <input class="nick" v-model="name" placeholder="请输入姓名" maxlength="20" />
    <input class="nick" v-model="company" placeholder="请输入公司名称（选填）" maxlength="100" />
    <input class="nick" v-model="phone" placeholder="请输入手机号" maxlength="11" inputmode="numeric" @input="onPhoneInput" />
    <input class="nick" v-model="password" type="password" placeholder="设置密码" />
    <input class="nick" v-model="password2" type="password" placeholder="确认密码" />

    <label class="field-label">安全问题（用于找回密码）</label>
    <select class="nick" v-model="securityQuestion">
      <option disabled value="">请选择安全问题</option>
      <option v-for="(q, i) in questions" :key="i" :value="q">{{ q }}</option>
    </select>
    <input class="nick" v-model="securityAnswer" placeholder="安全问题的答案" />

    <p class="nick-err" v-if="err">{{ err }}</p>
    <button class="btn-primary" :disabled="loading" @click="doRegister">
      {{ loading ? '注册中…' : '注 册' }}
    </button>
    <div class="auth-links" style="justify-content: flex-end">
      <a @click="emit('switch', 'login')">已有账号？去登录</a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { surveyStore } from '@/stores/survey'
import { uiStore } from '@/stores/ui'
import { securityQuestions } from '@/api/auth'
import { isValidName, isValidPhone, isValidPassword } from '@/utils/validator'
import type { AuthMode } from '@/stores/authModal'

const emit = defineEmits<{ success: []; switch: [mode: AuthMode] }>()

const name = ref('')
const company = ref('')
const phone = ref('')
const password = ref('')
const password2 = ref('')
const securityQuestion = ref('')
const securityAnswer = ref('')
const questions = ref<string[]>([])
const err = ref('')
const loading = ref(false)

// 接口异常时的兜底 4 个安全问题
const FALLBACK_Q = [
  '您母亲的姓名是？',
  '您出生城市的名称是？',
  '您小学班主任的姓名是？',
  '您最喜欢的电影是？',
]

onMounted(async () => {
  try {
    const q = (await securityQuestions()).questions
    questions.value = q.length ? q : FALLBACK_Q
  } catch {
    questions.value = FALLBACK_Q
  }
})

function onPhoneInput(e: Event): void {
  const t = e.target as HTMLInputElement
  t.value = t.value.replace(/\D/g, '')
  phone.value = t.value
  err.value = ''
}

async function doRegister(): Promise<void> {
  err.value = ''
  if (!isValidName(name.value)) { err.value = '请输入姓名'; return }
  if (!isValidPhone(phone.value)) { err.value = '手机号需为 11 位'; return }
  if (!isValidPassword(password.value)) { err.value = '密码至少 6 位'; return }
  if (password.value !== password2.value) { err.value = '两次输入的密码不一致'; return }
  if (!securityQuestion.value) { err.value = '请选择安全问题'; return }
  if (!securityAnswer.value.trim()) { err.value = '请填写安全问题答案'; return }
  loading.value = true
  try {
    await surveyStore.register({
      name: name.value.trim(),
      phone: phone.value,
      password: password.value,
      securityQuestion: securityQuestion.value,
      securityAnswer: securityAnswer.value.trim(),
      company: company.value.trim() || undefined,
    })
    uiStore.showToast('注册成功')
    emit('success')
  } catch (e: any) {
    err.value = e?.message || '注册失败'
  } finally {
    loading.value = false
  }
}
</script>
