import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import {
  blankAnswerText,
  blankBoxCount,
  checkBlankAnswer,
  countBlanks,
  normalizeAnswer
} from '../.vitepress/theme/quiz-blank.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const questions = JSON.parse(fs.readFileSync(path.join(root, '.vitepress/quiz-data.json'), 'utf8'))
const blanks = questions.filter((q) => q.type === 'blank')

test('题库所有填空题的输入框数量与题干空位数一致', () => {
  assert.ok(blanks.length > 0)
  for (const q of blanks) {
    assert.ok(countBlanks(q.question) >= 1, `${q.id}: 题干缺少空位标记（______ 或 （ ））`)
    assert.equal(blankBoxCount(q.question, q.answer), countBlanks(q.question), `${q.id}: 输入框数量与题干空位不一致`)
  }
})

test('回归：单空多个可接受答案只渲染一个输入框，任填其一即判对', () => {
  // 这四道题曾按答案个数渲染出 2~3 个输入框，且要求按序全部填对，实际永远判错
  for (const id of ['ft01-q011', 'jc19-q006', 'jc22-q004', 'jc33-q010']) {
    const q = blanks.find((x) => x.id === id)
    assert.ok(q, `${id} 应存在于题库`)
    assert.equal(countBlanks(q.question), 1, `${id}: 题干应只有一个空`)
    assert.ok(q.answer.length > 1, `${id}: 应有多个可接受答案`)
    assert.equal(blankBoxCount(q.question, q.answer), 1, `${id}: 只应渲染一个输入框`)
    for (const ans of q.answer) {
      assert.ok(checkBlankAnswer(q.question, q.answer, [ans]), `${id}: 填写「${ans}」应判对`)
    }
    assert.ok(!checkBlankAnswer(q.question, q.answer, ['不相关的答案']), `${id}: 错误答案应判错`)
  }
})

test('多空填空题按题干空位顺序逐一对应，顺序颠倒判错', () => {
  const q = blanks.find((x) => x.id === 'jc01-q007')
  assert.ok(q)
  assert.equal(blankBoxCount(q.question, q.answer), 2)
  assert.ok(checkBlankAnswer(q.question, q.answer, ['基础', '关键']))
  assert.ok(!checkBlankAnswer(q.question, q.answer, ['关键', '基础']))
  assert.ok(!checkBlankAnswer(q.question, q.answer, ['基础']))
})

test('全角半角与标点不影响判分', () => {
  const q = { question: '我国货币政策目标是保持货币币值稳定，并以此促进（ ）。', answer: ['经济的增长', '经济增长'] }
  assert.equal(blankBoxCount(q.question, q.answer), 1)
  assert.ok(checkBlankAnswer(q.question, q.answer, [' 经济的增长 ']))
  assert.ok(checkBlankAnswer(q.question, q.answer, ['经济增长。']))
  assert.ok(checkBlankAnswer(q.question, q.answer, ['（经济增长）']))
  assert.ok(!checkBlankAnswer(q.question, q.answer, ['币值稳定']))
  assert.ok(!checkBlankAnswer(q.question, q.answer, ['']))
})

test('单空单答案保持原行为', () => {
  const q = blanks.find((x) => x.answer.length === 1 && countBlanks(x.question) === 1)
  assert.ok(q)
  assert.equal(blankBoxCount(q.question, q.answer), 1)
  assert.ok(checkBlankAnswer(q.question, q.answer, [q.answer[0]]))
  assert.ok(!checkBlankAnswer(q.question, q.answer, ['其他答案']))
})

test('正确答案展示：单空多候选提示任填其一，多空按顺序罗列', () => {
  const multi = blanks.find((x) => x.id === 'jc22-q004')
  assert.match(blankAnswerText(multi.question, multi.answer), /^任一：/)
  assert.ok(blankAnswerText(multi.question, multi.answer).includes('2%'))

  const two = blanks.find((x) => x.id === 'jc01-q007')
  assert.ok(!blankAnswerText(two.question, two.answer).startsWith('任一：'))
  assert.equal(blankAnswerText(two.question, two.answer), '基础 ｜ 关键')

  const single = blanks.find((x) => x.answer.length === 1 && countBlanks(x.question) === 1)
  assert.equal(blankAnswerText(single.question, single.answer), single.answer[0])
})

test('题干里带内容的括号不算空位', () => {
  assert.equal(countBlanks('规模报酬研究的是______（填"长期"或"短期"）生产决策问题。'), 1)
  assert.equal(countBlanks('位于平均可变成本（AVC）______的那一段______成本曲线。'), 2)
  assert.equal(countBlanks('指的是（ ）；指的是（ ）。'), 2)
  assert.equal(normalizeAnswer('ＡＢＣ　１２３'), 'abc123')
})
