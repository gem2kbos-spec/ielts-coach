import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

export default function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const { login, register } = useAuth()
  const location = useLocation() as { state?: { from?: { pathname: string } } }

  const submit = async () => {
    if (!email.trim() || !password) return
    setSubmitting(true)
    setError('')
    try {
      if (mode === 'login') {
        await login(email.trim(), password)
      } else {
        await register(email.trim(), password)
      }
      // 登录成功后用整页跳转而不是react-router的navigate()——
      // 这样新页面是完全重新挂载的(AuthProvider从头跑一遍mount检查)，
      // 不会跟"刚登录瞬间"那一帧的过渡动画/路由状态产生任何竞态，最不容易出"卡在加载中"这类问题。
      window.location.href = location.state?.from?.pathname || '/'
    } catch (e) {
      setError((e as Error).message)
      setSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6">
      <div className="absolute top-0 left-0 right-0 h-px bg-[linear-gradient(90deg,var(--gradient-from),var(--gradient-to))]" />
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[radial-gradient(circle,var(--gradient-from),transparent_70%)] opacity-20 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-[radial-gradient(circle,var(--gradient-to),transparent_70%)] opacity-20 blur-3xl" />

      <div className="relative z-10 grid w-full max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="hidden rounded-[32px] border-border/70 bg-card/80 p-10 shadow-[0_24px_60px_rgba(15,23,42,0.12)] lg:block">
          <CardContent className="space-y-8 p-0">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                Private IELTS Training
              </div>
              <h1 className="text-4xl font-semibold tracking-tight text-foreground">G2Band</h1>
              <p className="max-w-xl text-sm leading-7 text-muted-foreground">
                一套更接近真实考试节奏的本地 IELTS 训练系统：题库、作答、批改、复盘都在同一个地方完成。
              </p>
            </div>
            <div className="grid gap-3">
              {[
                { icon: ShieldCheck, label: '本地保存', desc: '练习记录默认留在这台电脑上，方便长期积累。' },
                { icon: Mail, label: '独立档案', desc: '不同邮箱对应不同练习轨迹和题库状态。' },
                { icon: LockKeyhole, label: '持续训练', desc: '登录后直接回到训练台，继续上一次的学习节奏。' },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="rounded-2xl border border-border/70 bg-background/55 p-4">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <div className="text-sm font-medium">{item.label}</div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.desc}</p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="relative z-10 w-full rounded-[32px] border-border/70 bg-card/90 p-8 shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
          <CardContent className="space-y-6 p-0">
          <div className="text-center">
            <h1 className="text-3xl font-black tracking-[0.02em] text-foreground">G2Band</h1>
            <div className="w-12 h-1.5 rounded-full mt-3 mb-3 mx-auto bg-[linear-gradient(90deg,var(--gradient-from),var(--gradient-to))]" />
            <p className="text-sm text-muted-foreground">本地运行 · 数据只存在你自己的电脑上</p>
          </div>

          <div className="flex gap-2 rounded-2xl border border-border/70 bg-muted/40 p-1.5">
            <Badge
              variant={mode === 'login' ? 'default' : 'outline'}
              className={cn('flex-1 justify-center cursor-pointer rounded-xl py-2')}
              onClick={() => {
                setMode('login')
                setError('')
              }}
            >
              登录
            </Badge>
            <Badge
              variant={mode === 'register' ? 'default' : 'outline'}
              className={cn('flex-1 justify-center cursor-pointer rounded-xl py-2')}
              onClick={() => {
                setMode('register')
                setError('')
              }}
            >
              注册
            </Badge>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-2 block text-sm text-muted-foreground">邮箱</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                onKeyDown={(e) => e.key === 'Enter' && submit()}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-muted-foreground">密码</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'register' ? '至少6位' : '输入密码'}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button onClick={submit} disabled={submitting || !email.trim() || !password} className="w-full">
            {submitting ? (mode === 'login' ? '登录中…' : '注册中…') : mode === 'login' ? '登录' : '注册'}
          </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
