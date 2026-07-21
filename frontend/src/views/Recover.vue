<template>
  <div id="recover">
    <div class="login-card">
      <h2>找回密码</h2>
      <p class="sub">通过「手机号 + 姓名 + 安全问题」验证身份后，重设密码。</p>
      <input class="nick" v-model="phone" placeholder="请输入手机号（11 位）" maxlength="11" inputmode="numeric" @input="onPhoneInput" />
      <input class="nick" v-model="name" placeholder="请输入注册时填写的姓名" style="margin-top:12px" />
      <label class="field-label">安全问题</label>
      <select class="nick" v-model="securityQuestion" style="margin-top:8px">
        <option disabled value="">请选择安全问题</option>
        <option v-for="(q, i) in questions" :key="i" :value="q">{{ q }}</option>
      </select>
      <input class="nick" v-model="securityAnswer" placeholder="安全问题的答案" style="margin-top:12px" />
      <input class="nick" v-model="newPassword" type="password" placeholder="设置新密码（至少 6 位）" style="margin-top:12px" />

      <p class="nick-err" v-if="err">{{ err }}</p>
      <button class="btn-primary" :disabled="loading" @click="doRecover">
        {{ loading ? '提交中…' : '重 置 密 码' }}
      </button>
      <div class="login-links">
        <a href="javascript:void(0)" @click="goLogin">返回登录</a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { uiStore } from '@/stores/ui'
import { securityQuestions, recover } from '@/api/auth'
import { isValidPhone, isValidName, isValidPassword } from '@/utils/validator'

const router = useRouter()
const phone = ref('')
const name = ref('')
const securityQuestion = ref('')
const securityAnswer = ref('')
const newPassword = ref('')
const questions = ref<string[]>([])
const err = ref('')
const loading = ref(false)

onMounted(async () => {
  try { questions.value = (await securityQuestions()).questions } catch { questions.value = [] }
})

function onPhoneInput(e: Event): void {
  const t = e.target as HTMLInputElement
  t.value = t.value.replace(/\D/g, '')
  phone.value = t.value
  err.value = ''
}

async function doRecover(): Promise<void> {
  err.value = ''
  if (!isValidPhone(phone.value)) { err.value = '手机号格式有误'; return }
  if (!isValidName(name.value)) { err.value = '请输入姓名'; return }
  if (!securityQuestion.value) { err.value = '请选择安全问题'; return }
  if (!securityAnswer.value.trim()) { err.value = '请填写安全问题答案'; return }
  if (!isValidPassword(newPassword.value)) { err.value = '新密码至少 6 位'; return }
  loading.value = true
  try {
    await recover({
      phone: phone.value,
      name: name.value.trim(),
      securityQuestion: securityQuestion.value,
      securityAnswer: securityAnswer.value.trim(),
      newPassword: newPassword.value,
    })
    uiStore.showToast('密码已重置，请用新密码登录')
    router.push('/login')
  } catch (e: any) {
    err.value = e?.message || '重置失败'
  } finally {
    loading.value = false
  }
}

function goLogin(): void { router.push('/login') }
</script>

<style scoped>
.field-label { display: block; margin-top: 14px; font-size: 13px; color: var(--sub); }
.login-links { display: flex; justify-content: flex-end; margin-top: 14px; font-size: 13px; }
.login-links a { color: var(--accent); cursor: pointer; }
</style>
