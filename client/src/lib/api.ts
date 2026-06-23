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

export async function gradeTask1(payload: { itemId: string; essayText: string; durationSec: number }) {
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

export async function gradeTask2(payload: { itemId: string; essayText: string; durationSec: number }) {
  const res = await fetch('/api/writing/task2/grade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '评分失败')
  return data
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

export async function submitPart1(payload: { itemId: string; speakSec: number; audioBlob: Blob }) {
  const form = new FormData()
  form.append('itemId', payload.itemId)
  form.append('speakSec', String(payload.speakSec))
  form.append('audio', payload.audioBlob, 'answer.webm')
  const res = await fetch('/api/speaking/part1/submit', { method: 'POST', body: form })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '处理失败')
  return data
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
  return data
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
  return data
}

export async function startExaminer(tag?: string) {
  const res = await fetch(`/api/speaking/examiner/start${tag ? `?tag=${encodeURIComponent(tag)}` : ''}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '开始失败')
  return data
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
  return data
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
  return data as VocabEntry & { costUsd: number }
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

export async function getReadingPassageForExam(id: string) {
  const res = await fetch(`/api/reading/passages/${id}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '加载失败')
  return data as { id: string; title: string; passage_text: string; injected_vocab: string[]; questions: Omit<ReadingQuestion, 'correct_answer' | 'answer_confidence'>[] }
}

export async function submitReadingPassage(id: string, answers: { number: number; userAnswer: string }[], durationSec: number) {
  const res = await fetch(`/api/reading/passages/${id}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers, durationSec }),
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

export type ListeningSectionListItem = {
  id: string
  title: string
  section: string | null
  durationSec: number | null
  questionCount: number
  completed: boolean
  lastAccuracy: number | null
  source: string
  created_at: string
}

export async function listListeningSections(): Promise<ListeningSectionListItem[]> {
  const res = await fetch('/api/listening/sections')
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '加载失败')
  return data
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
  durationSec: number
) {
  const res = await fetch(`/api/listening/sections/${id}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers, durationSec }),
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
