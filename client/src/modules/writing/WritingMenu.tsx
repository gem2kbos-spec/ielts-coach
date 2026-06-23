import { Link, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import MockSessionBanner from '@/modules/mock/MockSessionBanner'

export default function WritingMenu() {
  const [searchParams] = useSearchParams()
  const mockSession = searchParams.get('mockSession')
  const suffix = mockSession ? `?mockSession=${mockSession}` : ''

  return (
    <div className="max-w-xl mx-auto p-8 space-y-4">
      <MockSessionBanner />
      <Link to="/" className="text-sm text-muted-foreground hover:underline">
        ← 返回首页
      </Link>
      <h1 className="text-2xl font-semibold">写作</h1>
      <p className="text-sm text-muted-foreground">
        雅思写作由 Task1(20分钟,150字起,图表/表格描述) 和 Task2(40分钟,250字起,议论文) 组成，按1:2权重算总分。
      </p>

      <Link to={`/writing/task1${suffix}`}>
        <Card className="hover:border-primary transition-colors">
          <CardHeader>
            <CardTitle className="text-base">Task 1</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            描述柱状图/折线图/饼图/表格数据，20分钟，150字起，权重1
          </CardContent>
        </Card>
      </Link>

      <Link to={`/writing/task2${suffix}`}>
        <Card className="hover:border-primary transition-colors">
          <CardHeader>
            <CardTitle className="text-base">Task 2</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            议论文/双边讨论/利弊分析，40分钟，250字起，权重2
          </CardContent>
        </Card>
      </Link>
    </div>
  )
}
