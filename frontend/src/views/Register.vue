<template>
  <div id="register">
    <div class="login-card">
      <h2>注册账号</h2>
      <p class="sub">首次使用请先注册。设置密码与安全问题，用于日后找回密码。</p>
      <input class="nick" v-model="name" placeholder="请输入姓名" maxlength="20" />
      <input class="nick" v-model="phone" placeholder="请输入手机号（11 位）" maxlength="11" inputmode="numeric" @input="onPhoneInput" style="margin-top:12px" />
      <input class="nick" v-model="password" type="password" placeholder="设置密码（至少 6 位）" style="margin-top:12px" />
      <input class="nick" v-model="password2" type="password" placeholder="确认密码" style="margin-top:12px" />

      <label class="field-label">安全问题（用于找回密码）</label>
      <select class="nick" v-model="securityQuestion" style="margin-top:8px">
        <option disabled value="">请选择安全问题</option>
        <option v-for="(q, i) in questions" :key="i" :value="q">{{ q }}</option>
      </select>
      <input class="nick" v-model="securityAnswer" placeholder="安全问题的答案" style="margin-top:12px" />

      <p class="nick-err" v-if="err">{{ err }}</p>
      <button class="btn-primary" :disabled="loading" @click="doRegister">
        {{ loading ? '注册中…' : '注 册' }}
      </button>
      <div class="login-links">
        <a href="javascript:void(0)" @click="goLogin">已有账号？去登录</a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { surveyStore } from '@/stores/survey'
import { uiStore } from '@/stores/ui'
import { securityQuestions } from '@/api/auth'
import { isValidName, isValidPhone, isValidPassword } from '@/utils/validator'

const router = useRouter()
const name = ref('')
const phone = ref('')
const password = ref('')
const password2 = ref('')
const securityQuestion = ref('')
const securityAnswer = ref('')
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

async function doRegister(): Promise<void> {
  err.value = ''
  if (!isValidName(name.value)) { err.value = '请输入姓名'; return }
  if (!isValidPhone(phone.value)) { err.value = '手机号格式有误'; return }
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
    })
    uiStore.showToast('注册成功')
    router.push('/select')
  } catch (e: any) {
    err.value = e?.message || '注册失败'
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
