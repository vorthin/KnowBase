<script setup>
/**
 * 刷题组件
 * 数据来自 scripts/gen-quiz.mjs 生成的 ../quiz-data.json
 * 支持：专业大类（多选）/ 章节 / 题型 / 难度筛选、题目乱序、三种题型判分、错题重出、错题本、localStorage 持久化
 */
import { computed, onMounted, reactive, ref, watch } from 'vue'
import rawData from '../quiz-data.json'
import { choiceAnswerText, displayChoiceOptions } from './quiz-choice.mjs'
import { blankAnswerText, blankBoxCount, checkBlankAnswer } from './quiz-blank.mjs'

const QUESTIONS = Array.isArray(rawData) ? rawData : rawData.questions || []
const STATS_KEY = 'kb-quiz-stats-v1'
const WRONG_KEY = 'kb-quiz-wrong-v1'
const FILTERS_KEY = 'kb-quiz-filters-v1'

/* ---------------- 状态 ---------------- */

const filters = reactive({
  majors: [], // 已选专业大类（多选）；为空表示未选择，不出题
  category: 'all',
  type: 'all',
  difficulty: 'all',
  wrongOnly: false
})

// 累计统计（localStorage）+ 错题次数
const lifetime = reactive({ answered: 0, correct: 0, bestStreak: 0 })
const wrongCounts = reactive({}) // id -> 答错次数
// 本轮统计
const session = reactive({ answered: 0, correct: 0, streak: 0 })

const queue = ref([]) // 待答题队列，queue[0] 为当前题
const done = ref(0) // 本轮已完成题数
const skipped = ref(0)
const phase = ref('idle') // idle | answering | judged | finished
const filtersExpanded = ref(false) // 手机端默认收起筛选，让当前题尽早出现在屏幕内

const displayedOptions = ref([])
const selected = ref([]) // 已选中的原始选项 key
const blankInputs = ref([])
const qaRevealed = ref(false)
const judgedCorrect = ref(null)

const current = computed(() => queue.value[0] || null)

/* ---------------- 筛选 ---------------- */

/** 专业大类列表（按题量降序），形如 [{ name: '人力资源管理', count: 750 }] */
const majors = computed(() => {
  const counts = new Map()
  for (const q of QUESTIONS) {
    if (!q.major) continue
    counts.set(q.major, (counts.get(q.major) || 0) + 1)
  }
  return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
})

const allMajorsSelected = computed(
  () => majors.value.length > 0 && filters.majors.length === majors.value.length
)

/** 章节列表：随所选大类联动，只列出选中大类下的章节 */
const chapters = computed(() => {
  const selected = new Set(filters.majors)
  return [
    ...new Set(
      QUESTIONS.filter((q) => q.category && selected.has(q.major)).map((q) => q.category)
    )
  ]
})

const types = computed(() => [...new Set(QUESTIONS.map((q) => q.type).filter(Boolean))])
const difficulties = computed(() =>
  [...new Set(QUESTIONS.map((q) => q.difficulty))].sort((a, b) => a - b)
)

const wrongBook = computed(() => {
  const selected = new Set(filters.majors)
  return QUESTIONS.filter((q) => (wrongCounts[q.id] || 0) >= 2 && selected.has(q.major))
})

const pool = computed(() => {
  if (filters.wrongOnly) return wrongBook.value
  if (!filters.majors.length) return []
  const selected = new Set(filters.majors)
  return QUESTIONS.filter((q) => {
    if (!selected.has(q.major)) return false
    if (filters.category !== 'all' && q.category !== filters.category) return false
    if (filters.type !== 'all' && q.type !== filters.type) return false
    if (filters.difficulty !== 'all' && String(q.difficulty) !== String(filters.difficulty)) return false
    return true
  })
})

const accuracy = computed(() =>
  session.answered ? Math.round((session.correct / session.answered) * 100) : 0
)
const lifetimeAccuracy = computed(() =>
  lifetime.answered ? Math.round((lifetime.correct / lifetime.answered) * 100) : 0
)
const progressText = computed(() => `第 ${done.value + 1} / ${done.value + queue.value.length} 题`)

const isMulti = computed(() => current.value && current.value.answer.length > 1)

/* ---------------- 工具 ---------------- */

/** Fisher-Yates 洗牌，返回新数组 */
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function typeLabel(type) {
  return { choice: '选择题', blank: '填空题', qa: '问答题' }[type] || type
}

function difficultyLabel(level) {
  return { 1: '简单', 2: '中等', 3: '偏难' }[level] || `难度 ${level}`
}

/* ---------------- 持久化 ---------------- */

function loadPersisted() {
  try {
    const s = JSON.parse(localStorage.getItem(STATS_KEY) || '{}')
    lifetime.answered = s.answered || 0
    lifetime.correct = s.correct || 0
    lifetime.bestStreak = s.bestStreak || 0
    const w = JSON.parse(localStorage.getItem(WRONG_KEY) || '{}')
    Object.keys(w).forEach((k) => (wrongCounts[k] = w[k]))
  } catch (err) {
    console.warn('[quiz] 读取本地记录失败：', err)
  }
}

function persist() {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify({ ...lifetime }))
    localStorage.setItem(WRONG_KEY, JSON.stringify({ ...wrongCounts }))
  } catch (err) {
    console.warn('[quiz] 保存本地记录失败：', err)
  }
}

/** 恢复上次的筛选配置（大类组合 / 章节 / 题型 / 难度），大类无效或为空时回退为全选 */
function loadFilters() {
  try {
    const saved = JSON.parse(localStorage.getItem(FILTERS_KEY) || '{}')
    const validMajors = new Set(majors.value.map((m) => m.name))
    const savedMajors = Array.isArray(saved.majors)
      ? saved.majors.filter((m) => validMajors.has(m))
      : []
    filters.majors = savedMajors.length ? savedMajors : majors.value.map((m) => m.name)
    if (saved.category && chapters.value.includes(saved.category)) filters.category = saved.category
    if (saved.type && types.value.includes(saved.type)) filters.type = saved.type
    if (
      saved.difficulty &&
      difficulties.value.map(String).includes(String(saved.difficulty))
    ) {
      filters.difficulty = String(saved.difficulty)
    }
  } catch (err) {
    console.warn('[quiz] 读取筛选配置失败：', err)
    filters.majors = majors.value.map((m) => m.name)
  }
}

function persistFilters() {
  try {
    localStorage.setItem(
      FILTERS_KEY,
      JSON.stringify({
        majors: filters.majors,
        category: filters.category,
        type: filters.type,
        difficulty: filters.difficulty
      })
    )
  } catch (err) {
    console.warn('[quiz] 保存筛选配置失败：', err)
  }
}

// 筛选条件变化即时持久化；大类变化时若已选章节不在新大类下，自动重置为「全部章节」
watch(
  filters,
  () => {
    persistFilters()
    if (filters.category !== 'all' && !chapters.value.includes(filters.category)) {
      filters.category = 'all'
    }
  },
  { deep: true }
)

/* ---------------- 流程 ---------------- */

function cloneQuestion(q) {
  return { ...q, options: (q.options || []).map((o) => ({ ...o })) }
}

function enterQuestion() {
  selected.value = []
  blankInputs.value = []
  qaRevealed.value = false
  judgedCorrect.value = null

  const q = current.value
  if (!q) {
    phase.value = 'finished'
    return
  }
  if (q.type === 'choice') {
    displayedOptions.value = displayChoiceOptions(q)
  } else if (q.type === 'blank') {
    // 输入框数量按题干空位决定：单空多候选只给一个框，任填其一
    blankInputs.value = new Array(blankBoxCount(q.question, q.answer)).fill('')
  }
  phase.value = 'answering'
}

const notice = ref('')

function toggleAllMajors(event) {
  filters.majors = event.target.checked ? majors.value.map((m) => m.name) : []
}

function start() {
  const source = pool.value
  if (!source.length) {
    notice.value = !filters.majors.length
      ? '请先勾选至少一个专业大类。'
      : filters.wrongOnly
        ? '错题本还是空的，先去刷几道题吧。'
        : '当前筛选条件下没有题目，换个条件试试。'
    return
  }
  notice.value = ''
  queue.value = shuffle(source).map(cloneQuestion)
  done.value = 0
  skipped.value = 0
  session.answered = 0
  session.correct = 0
  session.streak = 0
  enterQuestion()
}

/** 统一记账：正确 / 错误 */
function record(isCorrect) {
  const q = current.value
  session.answered++
  lifetime.answered++
  if (isCorrect) {
    session.correct++
    lifetime.correct++
    session.streak++
    if (session.streak > lifetime.bestStreak) lifetime.bestStreak = session.streak
  } else {
    session.streak = 0
    wrongCounts[q.id] = (wrongCounts[q.id] || 0) + 1
    queue.value.push(q) // 错题重出：回到队尾
  }
  judgedCorrect.value = isCorrect
  phase.value = 'judged'
  persist()
}

function next() {
  queue.value.shift()
  done.value++
  enterQuestion()
}

function skip() {
  const q = queue.value.shift()
  queue.value.push(q)
  skipped.value++
  enterQuestion()
}

/** 从错题本移除（清零错题次数） */
function removeFromWrongBook(id) {
  delete wrongCounts[id]
  persist()
}

/* ---------------- 三种题型作答 ---------------- */

function pickOption(option) {
  if (phase.value !== 'answering') return
  const q = current.value
  if (q.answer.length === 1) {
    selected.value = [option.key]
    submitChoice()
    return
  }
  const idx = selected.value.indexOf(option.key)
  if (idx >= 0) selected.value.splice(idx, 1)
  else selected.value.push(option.key)
}

function submitChoice() {
  const q = current.value
  if (!selected.value.length) return
  const a = [...q.answer].sort().join('')
  const b = [...selected.value].sort().join('')
  record(a === b)
}

function submitBlank() {
  const q = current.value
  record(checkBlankAnswer(q.question, q.answer, blankInputs.value))
}

function selfAssess(ok) {
  record(ok)
}

function optionState(option) {
  if (phase.value !== 'judged') {
    return selected.value.includes(option.key) ? 'selected' : ''
  }
  const isRight = current.value.answer.includes(option.key)
  const chosen = selected.value.includes(option.key)
  if (isRight) return 'right'
  if (chosen) return 'wrong'
  return ''
}

function answerText(q) {
  if (!q) return ''
  if (q.type === 'choice') return choiceAnswerText(q)
  if (q.type === 'blank') return blankAnswerText(q.question, q.answer)
  return q.answer || '（见解析）'
}

onMounted(() => {
  loadPersisted()
  if (QUESTIONS.length) {
    loadFilters()
    start()
  }
})
</script>

<template>
  <div class="quiz">
    <!-- 筛选区 -->
    <section class="quiz-panel">
      <button
        class="quiz-filter-toggle"
        type="button"
        :aria-expanded="filtersExpanded"
        aria-controls="quiz-filter-controls"
        @click="filtersExpanded = !filtersExpanded"
      >
        {{ filtersExpanded ? '收起筛选' : '筛选条件 / 重新开始' }}
        <span aria-hidden="true">{{ filtersExpanded ? '⌃' : '⌄' }}</span>
      </button>
      <div id="quiz-filter-controls" class="quiz-filter-controls" :class="{ 'mobile-collapsed': !filtersExpanded }">
        <div class="quiz-filters quiz-filters-majors">
          <span class="quiz-filters-label">专业大类</span>
          <label
            v-for="m in majors"
            :key="m.name"
            class="quiz-check"
            :title="`${m.name}：${m.count} 题`"
          >
            <input
              v-model="filters.majors"
              :value="m.name"
              type="checkbox"
              :disabled="filters.wrongOnly"
            />
            {{ m.name }}（{{ m.count }} 题）
          </label>
          <label class="quiz-check">
            <input
              :checked="allMajorsSelected"
              :indeterminate="filters.majors.length > 0 && !allMajorsSelected"
              type="checkbox"
              :disabled="filters.wrongOnly"
              @change="toggleAllMajors"
            />
            全选
          </label>
        </div>
        <div class="quiz-filters">
          <label>
            章节
            <select v-model="filters.category" :disabled="filters.wrongOnly">
              <option value="all">全部章节</option>
              <option v-for="c in chapters" :key="c" :value="c">{{ c }}</option>
            </select>
          </label>
          <label>
            题型
            <select v-model="filters.type" :disabled="filters.wrongOnly">
              <option value="all">全部题型</option>
              <option v-for="t in types" :key="t" :value="t">{{ typeLabel(t) }}</option>
            </select>
          </label>
          <label>
            难度
            <select v-model="filters.difficulty" :disabled="filters.wrongOnly">
              <option value="all">全部难度</option>
              <option v-for="d in difficulties" :key="d" :value="String(d)">
                {{ difficultyLabel(d) }}
              </option>
            </select>
          </label>
          <label class="quiz-check">
            <input v-model="filters.wrongOnly" type="checkbox" />
            只刷错题本（错 ≥ 2 次）
          </label>
          <button class="quiz-btn" @click="start">开始 / 重新开始</button>
        </div>
      </div>
      <p class="quiz-hint">
        当前筛选命中 <strong>{{ pool.length }}</strong> 题 ｜ 全站题库
        <strong>{{ QUESTIONS.length }}</strong> 题 ｜ 错题本
        <strong>{{ wrongBook.length }}</strong> 题
        <span v-if="notice" class="quiz-notice">{{ notice }}</span>
        <span v-else-if="phase !== 'idle' && phase !== 'finished'"
          >（筛选变更需点「重新开始」生效）</span
        >
      </p>
    </section>

    <!-- 计分板 -->
    <section class="quiz-panel quiz-score">
      <span>本轮：正确 <strong>{{ session.correct }}</strong> / {{ session.answered }}</span>
      <span>正确率 <strong>{{ accuracy }}%</strong></span>
      <span>连续答对 <strong>{{ session.streak }}</strong></span>
      <span>跳过 <strong>{{ skipped }}</strong></span>
      <span class="quiz-score-dim"
        >累计：{{ lifetime.correct }}/{{ lifetime.answered }}（{{ lifetimeAccuracy }}%）· 最高连对
        {{ lifetime.bestStreak }}</span
      >
    </section>

    <!-- 未开始 -->
    <section v-if="phase === 'idle'" class="quiz-panel quiz-empty">
      <p v-if="!QUESTIONS.length">题库为空，请先运行 <code>node scripts/gen-quiz.mjs</code>。</p>
      <p v-else>选好筛选条件后点「开始 / 重新开始」即可刷题。</p>
    </section>

    <!-- 答题区 -->
    <section v-else-if="current" class="quiz-panel quiz-card">
      <header class="quiz-meta">
        <span class="quiz-tag">{{ progressText }}</span>
        <span class="quiz-tag">{{ typeLabel(current.type) }}</span>
        <span class="quiz-tag">{{ difficultyLabel(current.difficulty) }}</span>
        <span class="quiz-tag">{{ current.category }}</span>
        <span v-if="current.source" class="quiz-tag">真题：{{ current.source }}</span>
        <span v-if="wrongCounts[current.id]" class="quiz-tag quiz-tag-wrong"
          >错过 {{ wrongCounts[current.id] }} 次</span
        >
      </header>

      <p class="quiz-question">{{ current.question }}</p>

      <!-- 选择题 -->
      <div v-if="current.type === 'choice'" class="quiz-options">
        <button
          v-for="opt in displayedOptions"
          :key="opt.key"
          class="quiz-option"
          :class="optionState(opt)"
          :disabled="phase === 'judged'"
          @click="pickOption(opt)"
        >
          <span class="quiz-option-key">{{ opt.label }}</span>
          <span>{{ opt.text }}</span>
        </button>
        <p v-if="isMulti && phase === 'answering'" class="quiz-hint">
          多选题：选完后点「提交答案」
        </p>
        <button
          v-if="isMulti && phase === 'answering'"
          class="quiz-btn"
          :disabled="!selected.length"
          @click="submitChoice"
        >
          提交答案
        </button>
      </div>

      <!-- 填空题 -->
      <div v-else-if="current.type === 'blank'" class="quiz-blanks">
        <div v-for="(_, i) in blankInputs" :key="i" class="quiz-blank-row">
          <span class="quiz-option-key">{{ i + 1 }}</span>
          <input
            v-model="blankInputs[i]"
            type="text"
            :disabled="phase === 'judged'"
            placeholder="填写答案"
            @keyup.enter="phase === 'answering' && submitBlank()"
          />
        </div>
        <button
          v-if="phase === 'answering'"
          class="quiz-btn"
          :disabled="blankInputs.every((v) => !v)"
          @click="submitBlank"
        >
          提交答案
        </button>
      </div>

      <!-- 问答题 -->
      <div v-else class="quiz-qa">
        <button v-if="!qaRevealed" class="quiz-btn" @click="qaRevealed = true">查看参考答案</button>
        <template v-else>
          <pre class="quiz-answer">{{ answerText(current) }}</pre>
          <div v-if="phase === 'answering'" class="quiz-self">
            <span>自评：</span>
            <button class="quiz-btn quiz-btn-ok" @click="selfAssess(true)">会了</button>
            <button class="quiz-btn quiz-btn-no" @click="selfAssess(false)">不会</button>
          </div>
        </template>
      </div>

      <!-- 判题结果 -->
      <div v-if="phase === 'judged'" class="quiz-result" :class="judgedCorrect ? 'ok' : 'no'">
        <p class="quiz-verdict">
          {{ judgedCorrect ? '✅ 答对了' : '❌ 答错了' }}
          <span v-if="!judgedCorrect" class="quiz-right-answer"
            >正确答案：{{ answerText(current) }}</span
          >
        </p>
        <p v-if="current.explanation" class="quiz-explanation">
          <strong>解析：</strong>{{ current.explanation }}
        </p>
        <div class="quiz-actions">
          <button class="quiz-btn" @click="next">下一题</button>
        </div>
      </div>

      <div v-else-if="phase === 'answering'" class="quiz-actions">
        <button class="quiz-btn quiz-btn-ghost" @click="skip">跳过本题</button>
      </div>
    </section>

    <!-- 本轮结束 -->
    <section v-else-if="phase === 'finished'" class="quiz-panel quiz-card">
      <h3>本轮完成 🎉</h3>
      <p>
        作答 {{ session.answered }} 题，正确 {{ session.correct }} 题，正确率
        {{ accuracy }}%，最高连续答对 {{ session.streak }}。
      </p>
      <p v-if="wrongBook.length" class="quiz-hint">
        错题本现有 {{ wrongBook.length }} 题，可勾选「只刷错题本」再来一轮。
      </p>
      <button class="quiz-btn" @click="start">再来一轮</button>
    </section>

    <!-- 错题本 -->
    <section v-if="wrongBook.length" class="quiz-panel">
      <h3 class="quiz-subtitle">错题本（错 ≥ 2 次，仅统计当前所选大类）</h3>
      <ul class="quiz-wrong-list">
        <li v-for="q in wrongBook" :key="q.id">
          <span class="quiz-tag quiz-tag-wrong">错 {{ wrongCounts[q.id] }} 次</span>
          <span>{{ q.question.slice(0, 60) }}{{ q.question.length > 60 ? '…' : '' }}</span>
          <button class="quiz-btn quiz-btn-ghost quiz-btn-sm" @click="removeFromWrongBook(q.id)">
            移出错题本
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.quiz {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 16px;
  min-width: 0;
}

.quiz-panel {
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--vp-c-bg-soft);
  padding: 14px 16px;
  min-width: 0;
}

.quiz-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 16px;
  align-items: center;
}

.quiz-filter-toggle {
  display: none;
}

.quiz-filters + .quiz-filters {
  margin-top: 10px;
}

.quiz-filters-label {
  font-size: 14px;
  color: var(--vp-c-text-2);
}

.quiz-filters-majors .quiz-check {
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  padding: 3px 10px;
  background: var(--vp-c-bg);
  cursor: pointer;
}

.quiz-filters-majors .quiz-check:hover {
  border-color: var(--vp-c-brand-1);
}

.quiz-filters label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--vp-c-text-2);
}

.quiz-filters select {
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  padding: 4px 8px;
  font-size: 14px;
}

.quiz-check {
  gap: 6px;
}

.quiz-hint {
  margin: 10px 0 0;
  font-size: 13px;
  color: var(--vp-c-text-3);
}

.quiz-notice {
  display: block;
  margin-top: 4px;
  color: var(--vp-c-danger-1, #ef4444);
}

.quiz-score {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
  font-size: 14px;
}

.quiz-score strong {
  color: var(--vp-c-brand-1);
}

.quiz-score-dim {
  color: var(--vp-c-text-3);
}

.quiz-btn {
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 6px;
  background: var(--vp-c-brand-1);
  color: #fff;
  padding: 5px 14px;
  font-size: 14px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.quiz-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.quiz-btn-ghost {
  background: transparent;
  color: var(--vp-c-text-1);
  border-color: var(--vp-c-divider);
}

.quiz-btn-sm {
  padding: 2px 8px;
  font-size: 12px;
}

.quiz-btn-ok {
  background: var(--vp-c-green-1, #10b981);
  border-color: var(--vp-c-green-1, #10b981);
}

.quiz-btn-no {
  background: var(--vp-c-red-1, #ef4444);
  border-color: var(--vp-c-red-1, #ef4444);
}

.quiz-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.quiz-tag {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
  background: var(--vp-c-default-soft);
  color: var(--vp-c-text-2);
}

.quiz-tag-wrong {
  background: var(--vp-c-danger-soft, rgba(239, 68, 68, 0.15));
  color: var(--vp-c-danger-1, #ef4444);
}

.quiz-question {
  font-size: 16px;
  line-height: 1.7;
  white-space: pre-wrap;
  margin: 0 0 14px;
}

.quiz-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.quiz-option {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  text-align: left;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  padding: 10px 12px;
  font-size: 15px;
  line-height: 1.6;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  overflow-wrap: anywhere;
}

.quiz-option:not(:disabled):hover {
  border-color: var(--vp-c-brand-1);
}

.quiz-option.selected {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}

.quiz-option.right {
  border-color: var(--vp-c-green-1, #10b981);
  background: rgba(16, 185, 129, 0.12);
}

.quiz-option.wrong {
  border-color: var(--vp-c-danger-1, #ef4444);
  background: rgba(239, 68, 68, 0.12);
}

.quiz-option-key {
  flex: none;
  font-weight: 600;
  color: var(--vp-c-brand-1);
}

.quiz-blanks {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.quiz-blank-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.quiz-blank-row input {
  flex: 1;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  padding: 6px 10px;
  font-size: 15px;
}

.quiz-answer {
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 10px 12px;
  margin: 10px 0;
  font-size: 14px;
  line-height: 1.7;
}

.quiz-self {
  display: flex;
  align-items: center;
  gap: 10px;
}

.quiz-result {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px dashed var(--vp-c-divider);
}

.quiz-verdict {
  font-weight: 600;
  margin: 0 0 8px;
}

.quiz-result.ok .quiz-verdict {
  color: var(--vp-c-green-1, #10b981);
}

.quiz-result.no .quiz-verdict {
  color: var(--vp-c-danger-1, #ef4444);
}

.quiz-right-answer {
  display: block;
  margin-top: 4px;
  font-weight: 400;
  color: var(--vp-c-text-1);
  white-space: pre-wrap;
}

.quiz-explanation {
  font-size: 14px;
  line-height: 1.7;
  color: var(--vp-c-text-2);
  margin: 0 0 12px;
}

.quiz-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 12px;
}

.quiz-empty p {
  margin: 0;
  color: var(--vp-c-text-2);
}

.quiz-subtitle {
  margin: 0 0 10px;
  font-size: 15px;
}

.quiz-wrong-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.quiz-wrong-list li {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: var(--vp-c-text-2);
}

@media (max-width: 640px) {
  .quiz-panel {
    padding: 12px;
  }

  .quiz-filter-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    min-height: 44px;
    border-radius: 6px;
    padding: 0 10px;
    background: var(--vp-c-bg);
    color: var(--vp-c-brand-1);
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
  }

  .quiz-filter-toggle:focus-visible {
    outline: 2px solid var(--vp-c-brand-1);
  }

  .quiz-filter-controls:not(.mobile-collapsed) {
    margin-top: 10px;
  }

  .quiz-filter-controls.mobile-collapsed {
    display: none;
  }

  .quiz-filters {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .quiz-filters > label:not(.quiz-check) {
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
  }

  .quiz-filters-majors .quiz-check,
  .quiz-filters > .quiz-check {
    min-height: 44px;
    padding: 8px 12px;
  }

  .quiz-check input[type='checkbox'] {
    width: 18px;
    height: 18px;
    flex: none;
    accent-color: var(--vp-c-brand-1);
  }

  .quiz-filters select {
    width: 100%;
    min-height: 44px;
    font-size: 16px;
  }

  .quiz-btn:not(.quiz-btn-sm) {
    min-height: 44px;
  }

  .quiz-option {
    min-height: 48px;
    font-size: 16px;
  }

  .quiz-blanks input {
    min-width: 0;
    min-height: 44px;
    font-size: 16px;
  }

  .quiz-question,
  .quiz-right-answer,
  .quiz-explanation {
    overflow-wrap: anywhere;
  }

  .quiz-wrong-list li {
    flex-wrap: wrap;
  }
}
</style>
