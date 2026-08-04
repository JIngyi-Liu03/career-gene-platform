// 维度标签映射：将单字母标签转为「文字+字母」格式，用于报告展示
const MBTI_MAP: Record<string, string> = {
  E: '外倾E', I: '内倾I',
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

const ENNEA_MAP: Record<string, string> = {
  A: '完美型A', B: '助人型B', C: '成就型C', D: '浪漫型D',
  E: '理智型E', F: '忠诚型F', G: '活跃型G', H: '领袖型H', I: '和平型I',
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
