import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-[#999] hover:text-white transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          返回首页
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-[#a78bfa]" />
          </div>
          <h1 className="font-display text-2xl font-semibold">2PIX 隐私政策</h1>
        </div>

        <div className="space-y-6 text-[#bbb] leading-relaxed">
          <p className="text-sm text-[#777]">更新时间：2026 年 7 月 26 日</p>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">1. 引言</h2>
            <p>
              2PIX（以下简称“我们”）重视用户的隐私保护。本政策将说明我们如何收集、使用、存储和保护您的个人信息。请您在使用本平台服务前仔细阅读本政策。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">2. 我们收集的信息</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>账号信息：</strong>用户名、昵称、邮箱、手机号、密码等用于注册和登录的信息。</li>
              <li><strong>使用信息：</strong>您使用服务时产生的操作日志、生成记录、额度消费记录等。</li>
              <li><strong>设备与网络信息：</strong>IP 地址、浏览器类型、设备型号、访问时间等，用于安全保障与服务优化。</li>
              <li><strong>支付信息：</strong>当您进行充值或购买时，我们会收集订单信息，支付敏感信息由第三方支付机构处理。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">3. 信息的使用</h2>
            <p>我们仅会出于以下目的使用您的个人信息：</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>为您提供账号注册、登录、内容生成、额度管理等服务；</li>
              <li>保障账号安全、防范欺诈和自动化攻击；</li>
              <li>进行服务优化、数据分析和产品改进；</li>
              <li>向您发送服务通知、订单信息及必要的系统公告。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">4. 信息的共享与披露</h2>
            <p>
              我们不会将您的个人信息出售给第三方。仅在以下情形中，我们可能会共享或披露您的信息：获得您的明确同意；应法律法规、司法机关或行政机关的要求；为维护平台、用户或公众的合法权益所必需。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">5. 信息的存储与安全</h2>
            <p>
              我们会采取合理的技术和管理措施保护您的个人信息，防止数据丢失、滥用、未经授权的访问或泄露。但互联网传输无法做到绝对安全，请您理解。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">6. Cookie 与类似技术</h2>
            <p>
              我们可能会使用 Cookie 或类似技术来提升用户体验、记录登录状态及分析访问情况。您可以根据浏览器设置管理或清除 Cookie。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">7. 您的权利</h2>
            <p>
              您有权访问、更正、删除您的个人信息，或撤回部分授权。如需行使上述权利，可通过平台客服或账号设置中的相关功能进行操作。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">8. 未成年人保护</h2>
            <p>
              本平台主要面向成年人。如果您是未成年人，请在监护人指导下使用本平台，并在监护人同意的前提下提供个人信息。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">9. 政策更新</h2>
            <p>
              我们可能会不时更新本隐私政策。更新后的政策将在平台上公示，您继续使用服务即视为接受更新后的政策。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">10. 联系我们</h2>
            <p>如您对本隐私政策有任何疑问或建议，请通过平台公告或客服渠道与我们联系。</p>
          </section>
        </div>
      </div>
    </div>
  );
}
