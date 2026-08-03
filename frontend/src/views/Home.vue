<template>
  <div id="welcome">
    <div class="home">
      <header class="home-top">
        <img class="brand-logo" src="@/assets/mentoringco-logo.png" alt="MentoringCo" />
      </header>

      <section class="hero">
        <div class="hero-glow"></div>
        <div class="hero-inner">
          <div class="hero-text">
            <h1 class="hero-title">职场基因检测</h1>
            <p class="hero-sub">看清天赋 · 找准方向 · 规划成长</p>
            <p class="hero-desc">融合心理学与组织行为学的科学测评体系，从性格特质、职业动机、优势能力、协作风格到抗压模式，5 大维度立体描绘你的职业画像——把「不知道自己适合什么」的迷茫，变成清晰可执行的成长路线。</p>
            <div class="hero-actions">
              <button class="start" @click="goLogin">
                免费开始
              </button>
            </div>
            <ul class="hero-stats">
              <li><b>5 大维度</b><span>科学立体测评</span></li>
              <li><b>98%</b><span>更了解自己</span></li>
            </ul>
          </div>
          <div class="hero-visual">
            <img class="gene-face" src="@/assets/gene-face.png" alt="职场基因元素" />
          </div>
        </div>
        <div class="hero-foot">
          <span class="hero-foot-label">覆盖行业</span>
            <div class="hero-tags">
            <span>互联网</span><span>金融</span><span>智能制造</span><span>专业咨询</span><span>教育培训</span><span>医疗健康</span>
          </div>
        </div>
      </section>

      <!-- 1. 四步流程：横向路径 -->
      <section class="block steps-sec">
        <div class="sec-head">
          <span class="sec-eyebrow">使用流程</span>
          <h2 class="sec-title">简单四步，生成你的专属能力报告</h2>
          <p class="sec-sub">从测试到规划，每一步都给你清晰反馈</p>
        </div>
        <ol class="steps">
          <li class="step reveal" style="--c:var(--accent)">
            <div class="step-ic">01</div>
            <h3 class="step-name">专业测评</h3>
            <p class="step-desc">依次完成 5 个维度的专业测试，每完成一个模块即可即时获得分项结果反馈。</p>
          </li>
          <li class="step reveal" style="--c:var(--accent2)">
            <div class="step-ic">02</div>
            <h3 class="step-name">生成报告</h3>
            <p class="step-desc">全部测评完成后，自动生成专属完整报告，内含雷达图、占比分析等多维度数据可视化呈现。</p>
          </li>
          <li class="step reveal" style="--c:var(--accent)">
            <div class="step-ic">03</div>
            <h3 class="step-name">深度解读</h3>
            <p class="step-desc">基于你的测评数据，提供一对一专业解读，帮你看懂数据背后的职业特质与核心优势。</p>
          </li>
          <li class="step reveal" style="--c:var(--accent2)">
            <div class="step-ic">04</div>
            <h3 class="step-name">职业规划</h3>
            <p class="step-desc">结合解读结果，为你梳理清晰的职业发展方向与成长路径，助力职业进阶。</p>
          </li>
        </ol>
      </section>

      <!-- 2. 职场困惑：全宽横条列表 -->
      <section class="block pain-sec">
        <div class="sec-head">
          <span class="sec-eyebrow">职场人的 4 道坎</span>
          <h2 class="sec-title">这些职场困境，你中了几个？</h2>
          <p class="sec-sub">看不清自己，是绝大多数职场焦虑的根源——下面 4 道坎，几乎人人都绕不开。</p>
        </div>
        <ul class="pains">
          <li class="pain reveal" style="--c:var(--accent)">
            <span class="pain-no">01</span>
            <div class="pain-main">
              <h3 class="pain-name">定位模糊</h3>
              <p class="pain-desc">「我是谁、适合什么」说不清，职业起步总在绕路。</p>
            </div>
            <span class="pain-tag">新人</span>
          </li>
          <li class="pain reveal" style="--c:var(--accent2)">
            <span class="pain-no">02</span>
            <div class="pain-main">
              <h3 class="pain-name">转型焦虑</h3>
              <p class="pain-desc">想换赛道却怕选错，缺乏客观判断，在纠结中内耗。</p>
            </div>
            <span class="pain-tag">转型期</span>
          </li>
          <li class="pain reveal" style="--c:var(--accent)">
            <span class="pain-no">03</span>
            <div class="pain-main">
              <h3 class="pain-name">优势缺位</h3>
              <p class="pain-desc">看不清核心竞争力，难以形成差异化，容易被替代。</p>
            </div>
            <span class="pain-tag">在职</span>
          </li>
          <li class="pain reveal" style="--c:var(--accent2)">
            <span class="pain-no">04</span>
            <div class="pain-main">
              <h3 class="pain-name">晋升遇阻</h3>
              <p class="pain-desc">多年卡在同一层级，找不到瓶颈根源，缺乏破局路径。</p>
            </div>
            <span class="pain-tag">瓶颈期</span>
          </li>
        </ul>
      </section>

      <!-- 3. 天赋与方向：轻量图标卡 + 应用场景滚动带 -->
      <section class="block why-sec">
        <div class="sec-head">
          <span class="sec-eyebrow">产品价值</span>
          <h2 class="sec-title">一次测评，读懂你的天赋与方向</h2>
          <p class="sec-sub">从个人成长到团队配置，一套体系，多种用法。</p>
        </div>
        <div class="why-grid">
          <div class="why-card reveal" style="--c:var(--accent)">
            <span class="why-ic">◎</span>
            <div>
              <h3 class="why-name">科学测评</h3>
              <p class="why-desc">多维度体系精准描绘职业画像</p>
            </div>
          </div>
          <div class="why-card reveal" style="--c:var(--accent2)">
            <span class="why-ic">▦</span>
            <div>
              <h3 class="why-name">数据可视</h3>
              <p class="why-desc">优势与方向一目了然</p>
            </div>
          </div>
          <div class="why-card reveal" style="--c:var(--accent)">
            <span class="why-ic">✦</span>
            <div>
              <h3 class="why-name">五大维度</h3>
              <p class="why-desc">深度解析助力每次职业选择</p>
            </div>
          </div>
          <div class="why-card reveal" style="--c:var(--accent2)">
            <span class="why-ic">⬡</span>
            <div>
              <h3 class="why-name">全面赋能</h3>
              <p class="why-desc">从个人成长到团队配置</p>
            </div>
          </div>
        </div>

        <!-- 应用场景横向无缝滚动展示带 -->
        <div class="marquee" aria-label="应用场景展示">
          <div class="marquee-track">
            <template v-for="g in gallery" :key="g.name">
              <div class="m-item">
                <span class="m-dot"></span>
                <div class="m-name">{{ g.name }}</div>
                <p class="m-desc">{{ g.desc }}</p>
              </div>
            </template>
            <!-- 复制一份实现无缝循环 -->
            <template v-for="g in gallery" :key="'dup-' + g.name">
              <div class="m-item" aria-hidden="true">
                <span class="m-dot"></span>
                <div class="m-name">{{ g.name }}</div>
                <p class="m-desc">{{ g.desc }}</p>
              </div>
            </template>
          </div>
        </div>
      </section>

      <footer class="home-foot">MentoringCo &middot; 职场基因检测</footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { authModal } from '@/stores/authModal'
const gallery = [
  { name: '精准招聘', desc: '用基因数据评估人岗适配，降低招人试错成本。' },
  { name: '人岗匹配', desc: '看清成员特质与优势，把对的人放在对的位置。' },
  { name: '高效管理', desc: '一键掌握团队画像，因材施教、精准带教。' },
  { name: '人才盘点', desc: '输出团队能力雷达图，辅助梯队与晋升决策。' },
  { name: '精准定位', desc: '多维度测评描绘特质画像，找到适配方向。' },
  { name: '科学转型', desc: '用数据评估转型适配度，降低试错焦虑。' },
  { name: '发掘优势', desc: '识别核心天赋，放大你的不可替代性。' },
  { name: '破局晋升', desc: '定位瓶颈与短板，给出针对性成长路径。' },
]
function goLogin(): void {
  authModal.openAuth('login')
}
onMounted(() => {
  const els = document.querySelectorAll<HTMLElement>('.reveal')
  if (!('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('in'))
    return
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in')
          io.unobserve(e.target)
        }
      })
    },
    { threshold: 0.15 },
  )
  els.forEach((el) => io.observe(el))
})
</script>
