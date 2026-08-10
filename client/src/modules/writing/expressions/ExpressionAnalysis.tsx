import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Languages, Lightbulb, TextQuote } from 'lucide-react'

const RESULT_LABEL: Record<string, { label: string; className: string }> = {
  correct: { label: '完全正确', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
  partial: { label: '基本正确', className: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400' },
  wrong: { label: '有误', className: 'bg-destructive/15 text-destructive' },
}

type VocabNote = { word: string; chinese: string; usage: string }
type GrammarError = { error: string; fix: string }

type AnalysisData = {
  result: string
  // phrase
  feedback?: string
  standard?: string
  alternatives?: string[]
  example_sentence?: string
  glossary?: VocabNote[]
  // sentence
  accuracy_note?: string
  expression_note?: string
  grammar_errors?: GrammarError[]
  band7_upgrade?: string
  band8_upgrade?: string
  vocabNotes?: VocabNote[]
}

export default function ExpressionAnalysis({
  result,
  isPhrase,
  compact = false,
}: {
  result: AnalysisData
  isPhrase: boolean
  compact?: boolean
}) {
  const label = RESULT_LABEL[result.result]
  const sectionClass = 'rounded-2xl border border-border/70 bg-background/62 p-3.5'
  const headingClass = 'mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground'
  const shortTextClass = 'text-sm leading-6'
  const vocab = (isPhrase ? result.glossary : result.vocabNotes) || []
  const visibleVocab = vocab.slice(0, compact ? 2 : 3)
  const visibleAlternatives = (result.alternatives || []).slice(0, compact ? 1 : 2)
  const visibleGrammar = (result.grammar_errors || []).slice(0, 2)

  return (
    <div className="space-y-2.5">
      {label && <Badge className={`rounded-full px-3 py-1 ${label.className}`}>{label.label}</Badge>}

      {isPhrase ? (
        <>
          {result.feedback && (
            <div className={sectionClass}>
              <div className={headingClass}>
                <CheckCircle2 className="h-3.5 w-3.5" />
                判定说明
              </div>
              <p className={shortTextClass}>{result.feedback}</p>
            </div>
          )}
          {(result.standard || visibleAlternatives.length > 0) && (
            <div className={sectionClass}>
              <div className={headingClass}>
                <Languages className="h-3.5 w-3.5" />
                推荐表达
              </div>
              {result.standard && <p className="text-base font-medium leading-6">{result.standard}</p>}
              {visibleAlternatives.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {visibleAlternatives.map((a, i) => (
                    <Badge key={i} variant="outline" className="h-auto rounded-full px-2 py-1 text-[12px] normal-case">
                      {a}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
          {!compact && result.example_sentence && (
            <div className="rounded-2xl border border-border/60 bg-background/45 px-3.5 py-3">
              <div className={headingClass}>
                <TextQuote className="h-3.5 w-3.5" />
                例句
              </div>
              <p className="text-sm leading-6 text-muted-foreground">{result.example_sentence}</p>
            </div>
          )}
          {!compact && visibleVocab.length > 0 && (
            <div className="rounded-2xl border border-border/60 bg-background/45 px-3.5 py-3">
              <div className={headingClass}>
                <Lightbulb className="h-3.5 w-3.5" />
                生词
              </div>
              <ul className="space-y-1.5 text-sm">
                {visibleVocab.map((v, i) => (
                  <li key={i} className="leading-6">
                    <span className="font-medium">{v.word}</span>
                    <span className="text-muted-foreground">：{v.chinese}{v.usage ? `，${v.usage}` : ''}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <>
          {(result.accuracy_note || result.expression_note) && (
            <div className={sectionClass}>
              <div className={headingClass}>
                <CheckCircle2 className="h-3.5 w-3.5" />
                简评
              </div>
              <div className="space-y-1.5">
                {result.accuracy_note && <p className={shortTextClass}>{result.accuracy_note}</p>}
                {result.expression_note && <p className="text-sm leading-6 text-muted-foreground">{result.expression_note}</p>}
              </div>
            </div>
          )}
          {!compact && visibleGrammar.length > 0 && (
            <div className={sectionClass}>
              <div className={headingClass}>
                <Languages className="h-3.5 w-3.5" />
                关键修改
              </div>
              <ul className="space-y-1.5 text-sm leading-6">
                {visibleGrammar.map((g, i) => (
                  <li key={i}><span className="text-destructive">{g.error}</span> → {g.fix}</li>
                ))}
              </ul>
            </div>
          )}
          {(result.standard || result.band7_upgrade || result.band8_upgrade) && (
            <div className={sectionClass}>
              <div className={headingClass}>
                <TextQuote className="h-3.5 w-3.5" />
                推荐译法
              </div>
              <div className="space-y-2">
                {result.standard && (
                  <p className="text-sm leading-6">
                    <span className="text-muted-foreground">参考：</span>{result.standard}
                  </p>
                )}
                {!compact && result.band7_upgrade && (
                  <p className="text-sm leading-6">
                    <span className="text-muted-foreground">Band 7：</span>{result.band7_upgrade}
                  </p>
                )}
                {!compact && result.band8_upgrade && (
                  <p className="text-sm leading-6">
                    <span className="text-muted-foreground">Band 8：</span>{result.band8_upgrade}
                  </p>
                )}
              </div>
            </div>
          )}
          {!compact && visibleVocab.length > 0 && (
            <div className="rounded-2xl border border-border/60 bg-background/45 px-3.5 py-3">
              <div className={headingClass}>
                <Lightbulb className="h-3.5 w-3.5" />
                生词
              </div>
              <ul className="space-y-1.5 text-sm">
                {visibleVocab.map((v, i) => (
                  <li key={i} className="leading-6">
                    <span className="font-medium">{v.word}</span> {v.chinese}
                    {v.usage && <span className="text-muted-foreground">，{v.usage}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}
