// 轻量 ESM 加载器：将 @/ 别名映射到 <root>/src，并为缺扩展名的相对/绝对导入补 .ts。
// 仅用于 Node 直接运行测试，不依赖 vitest。
import { dirname, resolve as pathResolve, extname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { register } from 'node:module'

const root = pathResolve(dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = pathResolve(root, 'src')

register(new URL('./alias-loader.mjs', import.meta.url))

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const abs = pathResolve(srcDir, specifier.slice(2)) + '.ts'
    return nextResolve(pathToFileURL(abs).href, context)
  }
  // 相对/绝对路径：若缺扩展名，补 .ts（支持 TS 源文件之间的相对互引）
  if ((specifier.startsWith('.') || specifier.startsWith('/')) && !extname(specifier)) {
    const parent = context.parentURL ? dirname(fileURLToPath(context.parentURL)) : process.cwd()
    const abs = pathResolve(parent, specifier) + '.ts'
    return nextResolve(pathToFileURL(abs).href, context)
  }
  return nextResolve(specifier, context)
}
