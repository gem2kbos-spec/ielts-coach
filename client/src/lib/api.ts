export type AuthUser = {
  id: string
  email: string
  planType: string
  subscriptionExpiresAt: string | null
  aiCallsToday: number
  aiCallsMonth: number
  createdAt: string
}

async function readJsonOrThrow(res: Response, fallback: string) {
  const contentType = res.headers.get('content-type') || ''
  let data: unknown

  if (contentType.includes('application/json')) {
    try {
      data = await res.json()
    } catch {
      data = null
    }
  } else {
    try {
      const text = await res.text()
      data = text ? { error: text } : null
    } catch {
      data = null
    }
  }

  if (!res.ok) {
    const message =
      typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string'
        ? data.error
        : res.status >= 500
          ? '服务暂时不可用，请确认本地后端已启动后重试。'
          : fallback
    throw new Error(message)
  }

  return data
}

export async function register(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
  let res: Response
  try {
    res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
  } catch {
    throw new Error('连不上本地服务，请先启动 IELTS Coach 后端。')
  }
  return await readJsonOrThrow(res, '注册失败') as { token: string; user: AuthUser }
}

export async function login(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
  let res: Response
  try {
    res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
  } catch {
    throw new Error('连不上本地服务，请先启动 IELTS Coach 后端。')
  }
  return await readJsonOrThrow(res, '登录失败') as { token: string; user: AuthUser }
}

export async function getMe(): Promise<AuthUser> {
  let res: Response
  try {
    res = await fetch('/api/auth/me')
  } catch {
    throw new Error('连不上本地服务，请先启动 IELTS Coach 后端。')
  }
  return await readJsonOrThrow(res, '获取用户信息失败') as AuthUser
}

export async function importFile(file: File, hints: { module?: string; subtype?: string; tags?: string } = {}) {
  const form = new FormData()
  form.append('file', file)
  if (hints.module) form.append('module', hints.module)
  if (hints.subtype) form.append('subtype', hints.subtype)
  if (hints.tags) form.append('tags', hints.tags)
  const res = await fetch('/api/items/import', { method: 'POST', body: form })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '导入失败')
  return data.created as Array<{ id: string; module: string; subtype: string }>
}

export async function listItems(params: { module?: string; subtype?: string } = {}) {
  const qs = new URLSearchParams(params as Record<string, string>).toString()
  const res = await fetch(`/api/items${qs ? `?${qs}` : ''}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '加载失败')
  return data
}

export type WritingItem = {
  id: string
  content: { prompt: string; essay_type: string }
}

export type Task1ChartContent = {
  chartType: 'bar' | 'line' | 'pie' | 'table'
  description: string
  unit?: string
  xKey?: string
  seriesKeys?: string[]
  columns?: string[]
  data?: Record<string, string | number>[]
  pies?: { title: string; data: { name: string; value: number }[] }[]
}

export type Task1Item = {
  id: string
  content: Task1ChartContent
}

export async function getRandomTask1(): Promise<Task1Item> {
  const res = await fetch('/api/writing/task1/random')
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '加载失败')
  return data
}

export async function getWritingItemById(id: string): Promise<Task1Item | WritingItem> {
  const res = await fetch(`/api/writing/item/${id}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '加载失败')
  return data
}

export async function gradeTask1(payload: { itemId: string; essayText: string; durationSec: number; onTime: boolean; overtimeSeconds: number }) {
  const res = await fetch('/api/writing/task1/grade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '评分失败')
  return data
}

export async function getRandomTask2(): Promise<WritingItem> {
  const res = await fetch('/api/writing/task2/random')
  if (!res.ok) throw new Error((await res.json()).error)
  return res.json()
}

export async function gradeTask2(payload: { itemId: string; essayText: string; durationSec: number; onTime: boolean; overtimeSeconds: number }) {
  const res = await fetch('/api/writing/task2/grade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '评分失败')
  return data
}

export type WritingGenerateParams = {
  taskType: 'task1' | 'task2'
  essayType?: string
  chartType?: string
  topic?: string
  difficulty?: 'easy' | 'medium' | 'hard'
  extraRequirements?: string
}

export async function generateWritingPreview(params: WritingGenerateParams) {
  const res = await fetch('/api/writing/generate/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '生成失败')
  return data as { taskType: 'task1' | 'task2'; content: Record<string, unknown>; costUsd: number }
}

export async function saveWritingItem(params: { taskType: 'task1' | 'task2'; content: Record<string, unknown>; difficulty?: string }) {
  const res = await fetch('/api/writing/generate/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '保存失败')
  return data as { id: string }
}

export type SpeakingPart1Item = {
  id: string
  tags: string[]
  content: { topic: string; questions: string[] }
}

export async function getRandomPart1(): Promise<SpeakingPart1Item> {
  const res = await fetch('/api/speaking/part1/random')
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '加载失败')
  return data
}

export type SpeakingScoreResult = {
  attemptId: string
  band_overall: number
  scores: Record<string, number>
  comments: Record<string, string>
  suggestions: string[]
  transcript: string
  fillerStats: { total: number; counts: Record<string, number> }
  errorTags?: string[]
}

export async function submitPart1(payload: { itemId: string; speakSec: number; audioBlob: Blob }) {
  const form = new FormData()
  form.append('itemId', payload.itemId)
  form.append('speakSec', String(payload.speakSec))
  form.append('audio', payload.audioBlob, 'answer.webm')
  const res = await fetch('/api/speaking/part1/submit', { method: 'POST', body: form })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '处理失败')
  return data as SpeakingScoreResult
}

export type SpeakingPart2Item = {
  id: string
  tags: string[]
  content: { topic: string; bullets: string[] }
}

export async function getRandomPart2(): Promise<SpeakingPart2Item> {
  const res = await fetch('/api/speaking/part2/random')
  if (!res.ok) throw new Error((await res.json()).error)
  return res.json()
}

export async function submitPart2(payload: { itemId: string; speakSec: number; audioBlob: Blob }) {
  const form = new FormData()
  form.append('itemId', payload.itemId)
  form.append('speakSec', String(payload.speakSec))
  form.append('audio', payload.audioBlob, 'answer.webm')
  const res = await fetch('/api/speaking/part2/submit', { method: 'POST', body: form })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '处理失败')
  return data as SpeakingScoreResult
}

export type ShadowItem = { id: string; content: { audio_path: string; original_filename: string } }

export async function listShadowItems(): Promise<ShadowItem[]> {
  const res = await fetch('/api/speaking/shadow/items')
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '加载失败')
  return data
}

export async function compareShadow(payload: { referenceItemId: string; audioBlob: Blob }) {
  const form = new FormData()
  form.append('referenceItemId', payload.referenceItemId)
  form.append('audio', payload.audioBlob, 'shadow.webm')
  const res = await fetch('/api/speaking/shadow/compare', { method: 'POST', body: form })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '对比失败')
  return data as ShadowCompareResult
}

export type ShadowCompareResult = {
  reference: { transcript: string; wpm: number; durationSec: number; pauseCount: number }
  user: { transcript: string; wpm: number; durationSec: number; pauseCount: number }
  diff: { wpmDiff: number; durationDiffSec: number; pauseDiff: number }
}

export type ExaminerStartResult = {
  sessionId: string
  topic: string
  questionText: string
  questionAudioUrl: string
  turnIndex: number
  maxTurns: number
}

export async function startExaminer(tag?: string): Promise<ExaminerStartResult> {
  const res = await fetch(`/api/speaking/examiner/start${tag ? `?tag=${encodeURIComponent(tag)}` : ''}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '开始失败')
  return data as ExaminerStartResult
}

export type ExaminerTurnResult = SpeakingScoreResult & {
  done: boolean
  questionText?: string
  nextQuestion?: string
  questionAudioUrl?: string
  turnIndex?: number
  maxTurns?: number
  history: { question: string; answer: string }[]
}

export async function finishSpeakingFull(payload: {
  part1?: { scores: Record<string, number>; band_overall: number; errorTags?: string[] }
  part2?: { scores: Record<string, number>; band_overall: number; errorTags?: string[] }
  part3?: { scores: Record<string, number>; band_overall: number; errorTags?: string[] }
}) {
  const res = await fetch('/api/speaking/full/finish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '提交失败')
  return data as { attemptId: string; bandOverall: number; partsIncluded: number }
}

export async function submitExaminerTurn(payload: { sessionId: string; audioBlob: Blob }) {
  const form = new FormData()
  form.append('sessionId', payload.sessionId)
  form.append('audio', payload.audioBlob, 'turn.webm')
  const res = await fetch('/api/speaking/examiner/turn', { method: 'POST', body: form })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '提交失败')
  return data as ExaminerTurnResult
}

export type PassageItem = { id: string; module: string; content: { raw_text: string; original_filename?: string; prompt?: string } }

export async function listPassages(): Promise<PassageItem[]> {
  const items = await listItems()
  return items.filter((i: PassageItem) => i.content?.raw_text)
}

export type VocabEntry = {
  id: string
  word: string
  context_sentence: string | null
  chinese_gloss: string | null
  detail: { part_of_speech?: string; explanation?: string; examples?: string[]; collocations?: string[] } | null
  tags: string[]
  needs_reinforcement: boolean
  created_at: string
  source: { module: string; label: string | null } | null
}

export async function listVocab(q?: string): Promise<VocabEntry[]> {
  const res = await fetch(`/api/vocab${q ? `?q=${encodeURIComponent(q)}` : ''}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '加载失败')
  return data
}

export async function addVocab(payload: { word: string; contextSentence?: string; sourceItemId?: string }) {
  const res = await fetch('/api/vocab', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '添加失败')
  return data as (VocabEntry & { costUsd: number; alreadyExists?: false }) | { alreadyExists: true; duplicateCount: number; word: string }
}

export async function updateVocab(id: string, patch: Partial<Pick<VocabEntry, 'needs_reinforcement'>>) {
  const res = await fetch(`/api/vocab/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '更新失败')
  return data as VocabEntry
}

export async function deleteVocab(id: string) {
  await fetch(`/api/vocab/${id}`, { method: 'DELETE' })
}

export type ReadingQuestionType =
  | 'true_false_ng'
  | 'multiple_choice'
  | 'short_answer'
  | 'sentence_completion'
  | 'summary_completion'
  | 'matching_heading'
  | 'matching_information'
  | 'table_completion'

export type ReadingQuestion = {
  number: number
  type: ReadingQuestionType
  instructions?: string
  prompt: string
  options: string[] | null
  correct_answer?: string
  explanation?: string
  answer_confidence?: 'high' | 'low'
}

export type ReadingPassageDraft = {
  title: string
  passageText: string
  questions: ReadingQuestion[]
  source?: 'user_import' | 'ai_generated'
  difficulty?: string
  topicTag?: string | null
  injectedVocab?: string[]
  paragraphs?: { letter: string; text: string }[] | null
}

export async function parseReadingPdf(file: File) {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch('/api/reading/parse-pdf', { method: 'POST', body: form })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '解析失败')
  return data as { previewId: string; confidence: 'high' | 'low'; passages: ReadingPassageDraft[]; pageCount: number }
}

export async function reparseReadingManualRange(
  previewId: string,
  ranges: { title: string; startPage: number; endPage: number }[]
) {
  const res = await fetch('/api/reading/parse-pdf/manual-range', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ previewId, ranges }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '手动切分失败')
  return data.passages as ReadingPassageDraft[]
}

export async function importReadingPassages(passages: ReadingPassageDraft[], previewId?: string) {
  const res = await fetch('/api/reading/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passages, previewId }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '导入失败')
  return data.created
}

export type ReadingPassageListItem = {
  id: string
  title: string
  questionCount: number
  completed: boolean
  lastAccuracy: number | null
  lastCorrectCount: number | null
  difficulty: string | null
  source: 'user_import' | 'ai_generated' | 'builtin_public'
  topicTag: string | null
  created_at: string
}

export async function listReadingPassages(): Promise<ReadingPassageListItem[]> {
  const res = await fetch('/api/reading/passages')
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '加载失败')
  return data
}

export async function deleteReadingPassage(id: string): Promise<void> {
  const res = await fetch(`/api/reading/passages/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error((await res.json()).error || '删除失败')
}

export type DeletedPassageItem = {
  id: string
  title: string
  questionCount: number
  difficulty: string | null
  source: string
  deletedAt: string
  attempts: { id: string; createdAt: string; correctCount: number | null; total: number | null; accuracy: number | null }[]
}

export async function listDeletedReadingPassages(): Promise<DeletedPassageItem[]> {
  const res = await fetch('/api/reading/passages/deleted')
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '加载失败')
  return data
}

export async function restoreReadingPassage(id: string): Promise<void> {
  const res = await fetch(`/api/reading/passages/${id}/restore`, { method: 'POST' })
  if (!res.ok) throw new Error((await res.json()).error || '恢复失败')
}

export async function getReadingPassageForExam(id: string) {
  const res = await fetch(`/api/reading/passages/${id}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '加载失败')
  return data as { id: string; title: string; passage_text: string; injected_vocab: string[]; questions: Omit<ReadingQuestion, 'correct_answer' | 'answer_confidence'>[] }
}

export async function submitReadingPassage(
  id: string,
  answers: { number: number; userAnswer: string }[],
  durationSec: number,
  onTime: boolean,
  overtimeSeconds: number,
  questionNumbers?: number[],
) {
  const res = await fetch(`/api/reading/passages/${id}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers, durationSec, onTime, overtimeSeconds, questionNumbers }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '提交失败')
  return data as {
    attemptId: string
    accuracy: number
    correctCount: number
    total: number
    perQuestion: { number: number; prompt: string; type: string; userAnswer: string; correctAnswer: string; explanation: string | null; correct: boolean }[]
    errorTags: string[]
    perQuestionTags: { number: number; tag: string; reason: string }[]
  }
}

export type ReadingGenerateParams = {
  difficulty?: 'easy' | 'medium' | 'hard'
  topic?: string
  questionTypes?: string[]
  extraRequirements?: string
}

export async function generateReadingPreview(params: ReadingGenerateParams) {
  const res = await fetch('/api/reading/generate/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '生成失败')
  return data as { draft: ReadingPassageDraft; weakTypesUsed: string[]; reinforcementWordsUsed: string[]; costUsd: number }
}

// ---------- 听力 ----------

export type ListeningQuestionType =
  | 'fill_blank'
  | 'multiple_choice'
  | 'multiple_select'
  | 'matching'
  | 'map_label'

export type ListeningQuestion = {
  number: number
  type: ListeningQuestionType
  prompt: string
  options: string[] | null
  expectedCount?: number
  correct_answer?: string | string[]
  explanation?: string | null
  page?: number
}

export type ListeningSectionDraft = {
  stem?: string | null
  audioFilename?: string
  questionFilename?: string
  audioPath?: string
  questionPath?: string
  durationSec: number | null
  title: string
  section: string | null
  transcript: string | null
  questions: ListeningQuestion[]
  mapPageGuess?: number | null
  confidence?: 'high' | 'low'
  defaultDurationSec?: number
  audioMissing?: boolean
  parseError?: string
}

export async function uploadListeningFiles(files: File[]) {
  const form = new FormData()
  files.forEach((f) => form.append('files', f))
  const res = await fetch('/api/listening/upload', { method: 'POST', body: form })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '上传失败')
  return data as {
    previewId: string
    batchSections: ListeningSectionDraft[]
    pairedSections: ListeningSectionDraft[]
    unpaired: { originalname: string; kind: 'audio' | 'question' }[]
  }
}

export async function manualPairListening(previewId: string, audioFilename: string, questionFilename: string) {
  const res = await fetch('/api/listening/upload/manual-pair', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ previewId, audioFilename, questionFilename }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '配对失败')
  return data.section as ListeningSectionDraft
}

export async function suggestListeningAnswers(transcript: string, questions: ListeningQuestion[]) {
  const res = await fetch('/api/listening/suggest-answers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript, questions }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'AI辅助填答案失败')
  return data.answers as { number: number; correct_answer: string | string[]; confidence: 'high' | 'low' }[]
}

export async function importListeningSections(sections: ListeningSectionDraft[]) {
  const res = await fetch('/api/listening/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sections }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '入库失败')
  return data.created
}

export type ListeningGenerateParams = {
  count: number
  section: 'S1' | 'S2' | 'S3' | 'S4' | 'mixed'
  difficulty: 'easy' | 'medium' | 'hard'
  topic?: string
  extraRequirements?: string
  voice?: string
  rate?: number
}

export async function generateListeningSections(params: ListeningGenerateParams) {
  const res = await fetch('/api/listening/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '生成听力题失败')
  return data as {
    created: { id: string; title: string; section: string | null; questionCount: number; durationSec: number | null; costUsd?: number }[]
    failed: { index: number; section: string; error: string }[]
  }
}

export type ListeningSectionListItem = {
  id: string
  title: string
  section: string | null
  durationSec: number | null
  questionCount: number
  completed: boolean
  lastAccuracy: number | null
  source: string
  hasTranscript: boolean
  audioProvider: string | null
  audioStyle: string | null
  created_at: string
}

export async function listListeningSections(): Promise<ListeningSectionListItem[]> {
  const res = await fetch('/api/listening/sections')
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '加载失败')
  return data
}

export async function revoiceListeningSection(id: string) {
  const res = await fetch(`/api/listening/sections/${id}/revoice`, { method: 'POST' })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'AI重配音失败')
  return data as { id: string; title: string; durationSec: number | null; audioMeta: Record<string, unknown> }
}

export async function getListeningSectionForExam(id: string) {
  const res = await fetch(`/api/listening/sections/${id}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '加载失败')
  return data as {
    id: string
    title: string
    section: string | null
    defaultDurationSec: number
    hasImage: boolean
    hasTranscript: boolean
    questions: Omit<ListeningQuestion, 'correct_answer' | 'explanation'>[]
  }
}

export async function submitListeningSection(
  id: string,
  answers: { number: number; userAnswer: string | string[] }[],
  durationSec: number,
  questionNumbers?: number[],
) {
  const res = await fetch(`/api/listening/sections/${id}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers, durationSec, questionNumbers }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '提交失败')
  return data as {
    attemptId: string
    accuracy: number
    correctCount: number
    total: number
    perQuestion: {
      number: number
      prompt: string
      type: string
      userAnswer: string | string[]
      correctAnswer: string | string[]
      explanation: string | null
      correct: boolean
    }[]
    errorTags: string[]
    perQuestionTags: { number: number; tag: string; reason: string }[]
    transcript: string | null
  }
}

export async function submitListeningMock(
  sectionResults: { sectionId: string; answers: { number: number; userAnswer: string | string[] }[]; durationSec: number }[],
  durationSec: number
) {
  const res = await fetch('/api/listening/mock/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sectionResults, durationSec }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '提交失败')
  return data as {
    attemptId: string
    totalCorrect: number
    totalQuestions: number
    band: number
    perSection: {
      sectionId: string
      title: string
      section: string | null
      correctCount: number
      total: number
      perQuestion: { number: number; prompt: string; type: string; userAnswer: string | string[]; correctAnswer: string | string[]; explanation: string | null; correct: boolean }[]
    }[]
    errorTags: string[]
  }
}

// ---------- 完整模考 ----------

export type MockStage = 'writing' | 'speaking' | 'reading' | 'listening'

export type MockSession = {
  id: string
  type: string
  status: string
  scheduled_at: string
  locked_until: string
  progress: {
    stages: MockStage[]
    currentStageIndex: number
    stageStartedAt: string
    results: { stage: MockStage; attemptIds: string[]; completedAt: string }[]
  }
}

export type MockReport = {
  sessionId: string
  status: string
  legs: {
    stage: MockStage
    label: string
    attemptIds: string[]
    band: number | null
    approxBand: boolean
    detail: Record<string, unknown> | null
    skipped: boolean
  }[]
  overallBand: number | null
}

export async function startMockSession(scheduledAt?: string) {
  const res = await fetch('/api/exam-sessions/mock/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scheduledAt }),
  })
  const data = await res.json()
  if (!res.ok) {
    const err = new Error(data.error || '启动失败') as Error & { session?: MockSession }
    err.session = data.session
    throw err
  }
  return data as MockSession
}

export async function getPendingMockSession() {
  const res = await fetch('/api/exam-sessions/mock/pending')
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '加载失败')
  return data as MockSession | null
}

export async function cancelMockSession(id: string) {
  await fetch(`/api/exam-sessions/${id}`, { method: 'DELETE' })
}

export async function getMockSession(id: string) {
  const res = await fetch(`/api/exam-sessions/mock/${id}`)
  if (!res.ok) throw new Error('模考session不存在')
  return (await res.json()) as MockSession
}

export async function advanceMockSession(id: string) {
  const res = await fetch(`/api/exam-sessions/mock/${id}/advance`, { method: 'POST' })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '推进失败')
  return data as MockSession
}

export async function getMockReport(id: string) {
  const res = await fetch(`/api/exam-sessions/mock/${id}/report`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '加载报告失败')
  return data as MockReport
}

// ---------- 练习历史 ----------

export type HistoryListItem = {
  id: string
  module: string
  created_at: string
  durationSec: number | null
  errorTags: string[]
  title: string | null
  label: { key: string; label: string }
  summary: { kind: 'band' | 'accuracy' | 'none'; value: number | null }
}

export async function listHistory(params: { module?: string; subtype?: string; limit?: number; offset?: number } = {}) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]))
  ).toString()
  const res = await fetch(`/api/history${qs ? `?${qs}` : ''}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '加载失败')
  return data as { items: HistoryListItem[]; total: number }
}

export type AttemptDetail = {
  id: string
  module: string
  item_id: string | null
  created_at: string
  duration_sec: number | null
  raw_response: Record<string, unknown> | null
  score: Record<string, unknown> | null
  band_overall: number | null
  error_tags: string[]
  audio_path: string | null
  transcript: string | null
  item: { id: string; subtype: string; source: string; content: Record<string, unknown> } | null
  label: { key: string; label: string }
  previous: { id: string; created_at: string; band_overall: number | null; score: Record<string, unknown> | null } | null
  delta: { kind: 'band' | 'accuracy'; bandDelta?: number; scoreDelta?: Record<string, number>; accuracyDelta?: number } | null
}

export async function getHistoryDetail(id: string) {
  const res = await fetch(`/api/history/${id}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '加载失败')
  return data as AttemptDetail
}

// ---------- 听力听写模式 ----------

export type DictationResult = {
  transcript: string
  refDiff: { word: string; matched: boolean }[]
  extraWords: string[]
  correctCount: number
  totalWords: number
  accuracy: number
}

export async function checkDictation(sectionId: string, userText: string) {
  const res = await fetch(`/api/listening/sections/${sectionId}/dictation-check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userText }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '对比失败')
  return data as DictationResult
}

// ---------- 跨模块弱点聚合本 ----------

export type WeaknessNotebook = {
  chinglish: { phrase: string; issue: string | null; suggestion: string | null; count: number; lastSeen: string }[]
  pronunciation: { word: string; category: string; categoryLabel: string; count: number; lastSeen: string }[]
  expressionMistakes: { itemId: string; chinese: string; standard: string; type: 'phrase' | 'sentence'; errorTypes: string[]; count: number; lastSeen: string }[]
  vocab: VocabEntry[]
}

export async function getWeaknessNotebook(days = 90) {
  const res = await fetch(`/api/weakness?days=${days}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '加载失败')
  return data as WeaknessNotebook
}

// ---------- 写作表达训练（词组训练 + 句子翻译） ----------

export type ExpressionItem = {
  id: string
  module: 'writing_expression'
  subtype: 'phrase_drill' | 'sentence_translation'
  difficulty: 'medium' | 'hard'
  tags: string[]
  content: {
    chinese: string
    standard: string
    alternatives?: string[]
    example_sentence?: string
    category: string
    band_target: number
  }
  reviewStatus: 'new' | 'learning' | 'mastered'
  lastResult?: 'correct' | 'partial' | 'wrong' | null
}

export type VocabNote = { word: string; chinese: string; usage: string }

export async function listExpressions(params: { type?: 'phrase' | 'sentence'; category?: string; difficulty?: string; task?: string; q?: string } = {}) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
  ).toString()
  const res = await fetch(`/api/expressions${qs ? `?${qs}` : ''}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '加载失败')
  return data as ExpressionItem[]
}

export type ExpressionQueueStatus = 'practiced' | 'correct' | 'partial' | 'wrong' | 'endless'

export async function getExpressionQueue(params: {
  status: ExpressionQueueStatus
  type?: 'phrase' | 'sentence'
  category?: string
  difficulty?: string
  task?: string
  excludeIds?: string[]
  limit?: number
}) {
  const { excludeIds, ...rest } = params
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)]))
  )
  if (excludeIds?.length) qs.set('excludeIds', excludeIds.join(','))
  const res = await fetch(`/api/expressions/queue?${qs.toString()}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '加载失败')
  return data as { items: ExpressionItem[]; totalMatching: number }
}

export async function getExpressionStats() {
  const res = await fetch('/api/expressions/stats')
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '加载失败')
  return data as { todayCount: number; totalCount: number }
}

export type PhraseGradeResult = {
  attemptId: string
  result: 'correct' | 'partial' | 'wrong'
  errorType: string | null
  feedback: string
  standard: string
  alternatives: string[]
  example_sentence: string
  glossary: VocabNote[]
  reviewStatus: 'new' | 'learning' | 'mastered'
}

export type SentenceGradeResult = {
  attemptId: string
  result: 'correct' | 'partial' | 'wrong'
  errorType: string | null
  accuracy_note: string
  expression_note: string
  grammar_errors: { error: string; fix: string }[]
  band7_upgrade: string
  band8_upgrade: string
  vocabNotes: VocabNote[]
  standard: string
  reviewStatus: 'new' | 'learning' | 'mastered'
}

export async function gradeExpression(itemId: string, answer: string, sessionId?: string) {
  const res = await fetch(`/api/expressions/${itemId}/grade`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answer, sessionId }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '判分失败')
  return data as PhraseGradeResult & SentenceGradeResult
}

export type ExpressionHistoryAttempt = {
  attemptId: string
  createdAt: string
  itemId: string
  subtype: 'phrase_drill' | 'sentence_translation'
  chinese: string
  answer: string
  analysis: Record<string, unknown> | null
  result: 'correct' | 'partial' | 'wrong' | null
}

export type ExpressionHistorySession = {
  sessionId: string
  date: string
  startedAt: string
  legacy?: boolean
  attempts: ExpressionHistoryAttempt[]
}

export async function getExpressionHistory(): Promise<ExpressionHistorySession[]> {
  const res = await fetch('/api/expressions/history')
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '加载失败')
  return data
}

export async function getExpressionHistorySession(sessionId: string): Promise<ExpressionHistorySession> {
  const res = await fetch(`/api/expressions/history/${sessionId}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '加载失败')
  return data
}

export async function addCustomExpression(payload: { type: 'phrase' | 'sentence'; chinese: string; standard: string }) {
  const res = await fetch('/api/expressions/custom', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '添加失败')
  return data as { item: ExpressionItem; costUsd: number }
}
