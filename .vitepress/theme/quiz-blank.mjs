/**
 * 填空题的输入框数量、判分与答案展示。
 *
 * 题干里的空位（连续两个及以上下划线，或空括号 （ ））决定输入框数量：
 *   - 单空：@answer 用 `|` `｜` `;` `；` 分隔的多个可接受答案，任填其一即判对；
 *   - 多空：@answer 按题干空位顺序逐一对应，顺序不能颠倒。
 *
 * 历史上按「答案个数」渲染输入框，导致单空多候选的题渲染出多个输入框、
 * 且要求按序全部填对，实际永远判错（ft01-q011 / jc19-q006 / jc22-q004 / jc33-q010）。
 * 回归测试见 tests/quiz-blank.test.mjs。
 */

/** 全角 → 半角 + 去空白标点 + 转小写，用于答案比较 */
export function normalizeAnswer(value) {
  return String(value || '')
    .replace(/[\uFF01-\uFF5E]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/\u3000/g, ' ')
    .replace(/[\s，。、；：""''（）()【】\[\]《》,.;:!?！？"'`~·\-—_/\\|]/g, '')
    .toLowerCase()
}

/** 题干中的空位数：连续下划线，或空括号。（AVC）、（填"之上"或"之下"）这类有内容的括号不算空位 */
export function countBlanks(question) {
  return (String(question || '').match(/_{2,}|[（(]\s*[）)]/g) || []).length
}

/** 输入框数量：按题干空位；题干没有空位标记时退回答案个数 */
export function blankBoxCount(question, answer) {
  const blanks = countBlanks(question)
  if (blanks >= 1) return blanks
  return Math.max((answer || []).length, 1)
}

/** 判分：inputs 为各输入框的原始值 */
export function checkBlankAnswer(question, answer, inputs) {
  const list = answer || []
  const boxes = (inputs || []).map(normalizeAnswer)
  if (blankBoxCount(question, list) <= 1) {
    return list.some((ans) => normalizeAnswer(ans) === boxes[0])
  }
  return list.length === boxes.length && list.every((ans, i) => normalizeAnswer(ans) === boxes[i])
}

/** 正确答案展示：单空多候选时提示「任一」 */
export function blankAnswerText(question, answer) {
  const list = (answer || []).join(' ｜ ')
  const boxes = blankBoxCount(question, answer)
  if (boxes <= 1 && (answer || []).length > 1) return `任一：${list}`
  return list
}
