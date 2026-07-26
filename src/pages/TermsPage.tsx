import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-[#999] hover:text-white transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          返回首页
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 flex items-center justify-center">
            <FileText className="w-5 h-5 text-[#a78bfa]" />
          </div>
          <h1 className="font-display text-2xl font-semibold">2PIX 用户协议</h1>
        </div>

        <div className="space-y-6 text-[#bbb] leading-relaxed">
          <p className="text-sm text-[#777]">更新时间：2026 年 7 月 26 日</p>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">1. 协议的接受与修改</h2>
            <p>
              欢迎使用 2PIX（以下简称“本平台”）。本协议是您与本平台之间关于使用平台服务所订立的协议。当您完成注册、登录或以任何方式使用本平台服务时，即表示您已阅读、理解并同意接受本协议全部条款。平台有权在必要时修改本协议，并在相关页面公示，变更后的协议自公示之日起生效。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">2. 服务说明</h2>
            <p>
              2PIX 提供基于人工智能的文本、图像、音频、视频等生成与辅助创作服务（以下简称“服务”）。平台会不断优化和更新服务内容，部分功能可能需要消耗账户额度或付费开通。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">3. 账号注册与安全</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>您应提供真实、准确、完整的注册信息，并对账号下的所有行为负责。</li>
              <li>您有责任妥善保管账号密码，因保管不善导致的损失由您自行承担。</li>
              <li>一个手机号或邮箱通常仅可绑定一个账号，禁止恶意注册、批量注册或买卖账号。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">4. 使用规范</h2>
            <p>您在使用本平台服务时，不得从事以下行为：</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>上传、生成或传播违反法律法规、公序良俗或侵犯他人权益的内容；</li>
              <li>利用平台进行诈骗、赌博、色情、暴力、恐怖、诽谤等违法活动；</li>
              <li>对本平台进行反向工程、破解、爬虫攻击或干扰平台正常运营；</li>
              <li>未经授权使用他人知识产权、肖像权、隐私权等内容。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">5. 知识产权</h2>
            <p>
              平台提供的界面、标识、代码、模型及相关技术成果的知识产权归本平台所有。您通过平台生成的内容，其权利归属遵循相关法律法规及平台规则；您应确保您对输入内容享有合法权利，并承担由此产生的全部责任。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">6. 付费与额度</h2>
            <p>
              部分服务需要消耗账户额度或付费购买。充值、购买会员等行为一旦完成，除法律法规另有规定外，原则上不予退款。具体价格、权益及退款规则以购买页面公示为准。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">7. 免责声明</h2>
            <p>
              平台会尽力保障服务稳定与内容安全，但不对 AI 生成内容的准确性、完整性、合法性及适用性作任何明示或暗示保证。您应自行判断并承担使用生成内容的风险与责任。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">8. 协议的终止</h2>
            <p>
              如您违反本协议，平台有权依据违规情节采取限制功能、封禁账号、删除内容等措施，并保留追究法律责任的权利。您也可以随时停止使用本平台服务。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">9. 联系我们</h2>
            <p>如您对本协议有任何疑问，请通过平台公告或客服渠道与我们联系。</p>
          </section>
        </div>
      </div>
    </div>
  );
}
