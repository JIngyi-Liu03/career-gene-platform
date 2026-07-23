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
            <h1 class="hero-title">解码职场基因</h1>
            <p class="hero-sub">探索专属职业发展路径</p>
            <p class="hero-desc">每个人都有独特的职业特质，通过职场基因检测，发现你的优势密码，规划未来成长路径。</p>
            <button class="start" @click="goLogin">
              开始基因检测
              <span class="start-arrow">&rarr;</span>
            </button>
          </div>
          <div class="hero-visual">
            <img class="gene-face" src="@/assets/gene-face.png" alt="职场基因元素" />
          </div>
        </div>
      </section>

      <!-- 1. 简单四步 -->
      <section class="block">
        <h2 class="block-title">简单四步，生成你的职业能力报告</h2>
        <div class="step-grid">
          <div class="step-card reveal" style="--c:var(--accent)">
            <div class="step-no">01</div>
            <div class="step-name">专业测评</div>
            <p class="step-desc">依次完成 5 个维度的专业测试，每完成一个模块即可即时获得分项结果反馈。</p>
          </div>
          <div class="step-card reveal" style="--c:var(--accent2)">
            <div class="step-no">02</div>
            <div class="step-name">生成报告</div>
            <p class="step-desc">全部测评完成后，自动生成专属完整报告，内含雷达图、占比分析等多维度数据可视化呈现。</p>
          </div>
          <div class="step-card reveal" style="--c:var(--mbB)">
            <div class="step-no">03</div>
            <div class="step-name">深度解读</div>
            <p class="step-desc">基于你的测评数据，提供一对一专业解读，帮你看懂数据背后的职业特质与核心优势。</p>
          </div>
          <div class="step-card reveal" style="--c:#8b5cf6">
            <div class="step-no">04</div>
            <div class="step-name">职业规划</div>
            <p class="step-desc">结合解读结果，为你梳理清晰的职业发展方向与成长路径，助力职业进阶。</p>
          </div>
        </div>
      </section>

      <!-- 2. 未被解码的职场困惑 -->
      <section class="block">
        <h2 class="block-title">你是否正在经历？</h2>
        <p class="block-subtitle">职场人普遍面临的问题</p>
        <div class="pain-grid">
          <div class="pain-card reveal" style="--c:var(--accent)">
            <div class="pain-thumb"><img src="/images/how.png" alt="定位模糊" /></div>
            <div class="pain-name">定位模糊</div>
            <p class="pain-desc">初入职场的新人，对自身能力与职业方向缺乏清晰认知，不知道自己擅长什么、适合什么岗位，职业起步阶段容易走弯路。</p>
          </div>
          <div class="pain-card reveal" style="--c:var(--accent2)">
            <div class="pain-thumb"><img src="/images/way.png" alt="转型焦虑" /></div>
            <div class="pain-name">转型焦虑</div>
            <p class="pain-desc">对现有工作感到不适配、不喜欢，渴望换赛道或转行，但缺乏对自我特质的客观判断，害怕再次选错方向，陷入纠结内耗。</p>
          </div>
          <div class="pain-card reveal" style="--c:var(--mbB)">
            <div class="pain-thumb"><img src="/images/sad.png" alt="优势缺位" /></div>
            <div class="pain-name">优势缺位</div>
            <p class="pain-desc">有一定工作经验的在职者，对自身核心竞争力认知不清，难以形成差异化优势，成长缓慢，在职场中容易被替代。</p>
          </div>
          <div class="pain-card reveal" style="--c:#8b5cf6">
            <div class="pain-thumb"><img src="/images/job.png" alt="晋升遇阻" /></div>
            <div class="pain-name">晋升遇阻</div>
            <p class="pain-desc">工作多年却长期卡在同一层级，努力却看不到上升空间，找不到发展瓶颈的根源，缺乏清晰的破局路径与方法。</p>
          </div>
        </div>
      </section>

      <!-- 3. 为什么选择 MentoringCo -->
      <section class="block">
        <h2 class="block-title">一份测评，读懂你的职场天赋与发展方向</h2>
        <ul class="block-points">
          <li>数据可视化呈现，让优势与方向一目了然</li>
          <li>五大维度深度解析，助力每一次职业选择</li>
          <li>多维度科学测评体系，精准描绘你的职业画像</li>
          <li>从个人成长到团队配置，全方位赋能职业发展</li>
        </ul>

        <!-- 应用场景横向无缝滚动展示带 -->
        <div class="marquee" aria-label="应用场景展示">
          <div class="marquee-track">
            <template v-for="g in gallery" :key="g.name">
              <div class="m-item">
                <img :src="`/images/${g.img}`" :alt="g.name" loading="lazy" />
                <div class="m-name">{{ g.name }}</div>
                <p class="m-desc">{{ g.desc }}</p>
              </div>
            </template>
            <!-- 复制一份实现无缝循环 -->
            <template v-for="g in gallery" :key="'dup-' + g.name">
              <div class="m-item" aria-hidden="true">
                <img :src="`/images/${g.img}`" :alt="g.name" loading="lazy" />
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
  { img: '精准招聘.jpg', name: '精准招聘', desc: '基于职场基因数据评估候选人与岗位的适配度，降低招人试错成本，提升录用准确率。' },
  { img: '人岗匹配.jpg', name: '人岗匹配', desc: '清晰掌握每位成员的特质与优势，科学分配岗位、安排协作，把对的人放在对的位置。' },
  { img: '高效管理.jpg', name: '高效管理', desc: '管理者一目了然团队成员的性格与能力画像，因材施教，针对性沟通与带教，提升管理效率。' },
  { img: '人才盘点.jpg', name: '人才盘点', desc: '快速输出团队整体能力雷达图，辅助人才梯队建设与晋升决策，做好组织人才储备。' },
  { img: '精准定位.jpg', name: '精准定位', desc: '通过多维度测评数据，科学描绘你的职业特质画像，帮你清晰找到最适合的职业方向与岗位匹配。' },
  { img: '科学转型.jpg', name: '科学转型', desc: '基于你的职场基因数据，客观分析转型适配度，用数据支撑决策，降低转行试错成本与焦虑。' },
  { img: '发掘优势.jpg', name: '发掘优势', desc: '深度识别你的核心竞争力与天赋特质，帮你看清自身差异化价值，放大职场不可替代性。' },
  { img: '破局晋升.jpg', name: '破局晋升', desc: '精准定位你的发展瓶颈与短板，结合数据给出针对性成长路径，助力突破职业天花板。' },
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
