// 维度标签映射：将单字母标签转为「文字+字母」格式，用于报告展示
const MBTI_MAP: Record<string, string> = {
  E: '外向E', I: '内向I',
  N: '直觉N', S: '感觉S',
  F: '情感F', T: '思考T',
  J: '判断J', P: '知觉P',
}

const DISC_MAP: Record<string, string> = {
  D: '支配型D', I: '影响型I', S: '稳健型S', C: '服从型C',
}

const PDP_MAP: Record<string, string> = {
  T: '老虎型T', P: '孔雀型P', K: '考拉型K', O: '猫头鹰型O', C: '变色龙型C',
}

// 九型人格：保留后端算分键 A–I，仅展示时映射为 1–9 序号
const ENNEA_LETTER_TO_NUM: Record<string, string> = {
  A: '1', B: '2', C: '3', D: '4', E: '5', F: '6', G: '7', H: '8', I: '9',
}
const ENNEA_MAP: Record<string, string> = {
  A: '1号·完美型', B: '2号·助人型', C: '3号·成就型', D: '4号·浪漫型',
  E: '5号·理智型', F: '6号·忠诚型', G: '7号·活跃型', H: '8号·领袖型', I: '9号·和平型',
}

const CAREER_MAP: Record<string, string> = {
  X: '自由型X', Y: '平衡型Y', Z: '活力型Z', W: '安全型W', V: '进取型V',
}

/** 根据维度类型获取映射表 */
function getMap(type: 'mbti' | 'disc' | 'pdp' | 'ennea' | 'career'): Record<string, string> {
  switch (type) {
    case 'mbti': return MBTI_MAP
    case 'disc': return DISC_MAP
    case 'pdp': return PDP_MAP
    case 'ennea': return ENNEA_MAP
    case 'career': return CAREER_MAP
  }
}

/** 将 RadarAxis 数组中的 label 替换为「文字+字母」格式 */
export function mapAxisLabels(
  axes: Array<{ label: string; rate: number }> | null | undefined,
  type: 'disc' | 'pdp' | 'ennea' | 'career',
): Array<{ label: string; rate: number }> {
  if (!Array.isArray(axes)) return []
  const map = getMap(type)
  return axes.map((a) => ({ ...a, label: map[a.label] ?? a.label }))
}

/** 将 MBTI pair 中的 a/b 替换为「文字+字母」格式 */
export function mapMbtiPair(
  pair: { a: string; b: string; pa: number; pb: number },
): { a: string; b: string; pa: number; pb: number } {
  const map = getMap('mbti')
  return { ...pair, a: map[pair.a] ?? pair.a, b: map[pair.b] ?? pair.b }
}

/** 将单个 MBTI 字母（如 E/I/S/N…）替换为「文字+字母」格式 */
export function mapMbtiLetter(label: string): string {
  return getMap('mbti')[label] ?? label
}

/** 将单个九型字母（A–I）映射为展示用的「序号·类型」与纯序号 */
export function mapEnneaLetter(label: string): string {
  return getMap('ennea')[label] ?? label
}
export function enneaNumber(label: string): string {
  return ENNEA_LETTER_TO_NUM[label] ?? label
}
