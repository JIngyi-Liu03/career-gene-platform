<template>
  <div
    id="custom-confirm"
    :style="{ display: ui.state.confirm.show ? 'flex' : 'none' }"
    style="position:fixed;inset:0;background:rgba(15,22,38,.55);z-index:99999;align-items:center;justify-content:center;-webkit-overflow-scrolling:touch;touch-action:none"
  >
    <div
      id="cc-box"
      style="background:#fff;border-radius:18px;padding:32px 28px 24px;max-width:340px;width:90vw;text-align:center;box-shadow:0 16px 48px rgba(31,42,68,.30)"
    >
      <div id="cc-msg" style="font-size:15px;font-weight:600;color:#1f2a44;line-height:1.7;margin-bottom:22px">
        {{ ui.state.confirm.msg }}
      </div>
      <div style="display:flex;gap:12px;justify-content:center">
        <button id="cc-cancel" @click="ui.closeConfirm(false)">取消</button>
        <button id="cc-ok" @click="ui.closeConfirm(true)">确定</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { uiStore as ui } from '@/stores/ui'
</script>
