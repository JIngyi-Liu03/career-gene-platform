import type { PartType } from '../types/quiz'

// 各部分的合法维度集合（算分键强校验用）。
//   MBTI: E I S N T F J P
//   DISC: D I S C
//   九型: A B C D E F G H I
//   职业锚: V X Y Z W
//   PDP : T P K O C（每题一个维度，计分 5 − 选项序号）
export const PART_DIMENSIONS: Record<PartType, string[]> = {
  mbti: ['E', 'I', 'S', 'N', 'T', 'F', 'J', 'P'],
  disc: ['D', 'I', 'S', 'C'],
  enneagram: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'],
  career: ['V', 'X', 'Y', 'Z', 'W'],
  pdp: ['T', 'P', 'K', 'O', 'C'],
}

export const PART_LABELS: Record<PartType, string> = {
  mbti: '第一部分 · MBTI',
  disc: '第二部分 · DISC',
  pdp: '第三部分 · PDP',
  enneagram: '第四部分 · 九型人格',
  career: '第五部分 · 职业锚',
}

// 各部分的算分口径说明（前端图例展示用）。
export const PART_SCORING_NOTE: Record<PartType, string> = {
  mbti: '每题每个选项对应一个维度字母，选中即给该维度 +1 分',
  disc: '每题每个选项对应一个维度字母，选中即给该维度 +1 分',
  pdp: '每题对应一个维度，计分 = 5 − 选项序号（越靠前分值越高）',
  enneagram: '每题每个选项对应一个维度字母，选中即给该维度 +1 分',
  career: '每题每个选项对应一个维度字母，选中即给该维度 +1 分',
}
