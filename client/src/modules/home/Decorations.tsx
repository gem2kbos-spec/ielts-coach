import TennisIcon from './icons/TennisIcon'
import BasketballIcon from './icons/BasketballIcon'
import CloverIcon from './icons/CloverIcon'
import CityTag from './icons/CityTag'
import Patch from './icons/Patch'

// 散落在背景四周的徽章式装饰元素，避开中间主内容区(顶部标题+卡片网格)，
// 营造"更衣室墙面"的个人化氛围，但克制留白，不堆叠。
// 小屏幕(<lg)隐藏，避免和主内容挤在一起。
export default function Decorations() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none hidden lg:block" aria-hidden="true">
      {/* 顶部角落：贴死边角，避开标题文字 */}
      <Patch color="#9CCC3C" size={64} className="absolute top-4 left-4 opacity-90 -rotate-6">
        <TennisIcon className="w-full h-full" />
      </Patch>
      <Patch color="#0C7C3E" size={72} className="absolute top-4 right-4 opacity-90 rotate-6">
        <CloverIcon variant={2} className="w-full h-full" />
      </Patch>

      {/* 下半部分：空间充裕，按百分比铺开 */}
      <CityTag letters="YC" color="#9A8B00" className="absolute top-[36%] left-[3%] -rotate-3 opacity-80" />
      <CityTag letters="SH" color="#0C7C3E" className="absolute top-[36%] right-[3%] rotate-2 opacity-80" />
      <CityTag letters="SJZ" color="#C2641A" className="absolute bottom-[10%] left-[5%] -rotate-2 opacity-80" />

      <Patch color="#C2641A" size={68} className="absolute bottom-[24%] left-[14%] opacity-90 rotate-6">
        <BasketballIcon className="w-full h-full" />
      </Patch>
      <Patch color="#0C7C3E" size={76} className="absolute bottom-[16%] right-[6%] opacity-90 -rotate-6">
        <CloverIcon variant={1} className="w-full h-full" />
      </Patch>
      <Patch color="#0C7C3E" size={48} className="absolute top-[55%] right-[2%] opacity-70 rotate-12">
        <CloverIcon variant={3} className="w-full h-full" />
      </Patch>
    </div>
  )
}
