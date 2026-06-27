import Link from 'next/link'

export default function LPPage() {
  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Hiragino Kaku Gothic ProN', 'Meiryo', sans-serif", color: '#1a0f0a', background: '#F5EDE4', minHeight: '100vh' }}>

      {/* ヘッダー */}
      <header style={{ background: '#fff', borderBottom: '1px solid #EAD9C8', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#3D2314', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: 14, fontWeight: 900 }}>A</span>
            </div>
            <span style={{ fontSize: 18, fontWeight: 900, color: '#3D2314', letterSpacing: '-0.4px' }}>Amato</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#B8967A', marginLeft: 2 }}>整体院SaaS</span>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Link href="/login" style={{ fontSize: 14, fontWeight: 600, color: '#5C3520', padding: '8px 14px' }}>ログイン</Link>
            <Link href="/signup" style={{ fontSize: 14, fontWeight: 700, color: '#fff', background: '#C4622D', padding: '9px 20px', borderRadius: 10, whiteSpace: 'nowrap' }}>無料で始める</Link>
          </div>
        </div>
      </header>

      {/* ヒーロー */}
      <section style={{ background: 'linear-gradient(160deg, #3D2314 0%, #5C3520 100%)', padding: '80px 24px 90px', textAlign: 'center' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ display: 'inline-block', background: 'rgba(196,98,45,0.25)', color: '#F5C9A8', fontSize: 12, fontWeight: 700, padding: '5px 14px', borderRadius: 100, marginBottom: 24, letterSpacing: '.5px' }}>
            整体院向け 売上管理SaaS
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 900, color: '#fff', lineHeight: 1.2, letterSpacing: '-1px', marginBottom: 20 }}>
            整体院の売上管理を、<br />もっとシンプルに。
          </h1>
          <p style={{ fontSize: 'clamp(15px, 2vw, 18px)', color: 'rgba(245,213,192,.75)', lineHeight: 1.7, marginBottom: 40, maxWidth: 520, margin: '0 auto 40px' }}>
            売上入力30秒。台帳・集計・経理レポートが自動生成。<br />スマホひとつで院の数字をすべて把握できます。
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/signup" style={{ fontSize: 16, fontWeight: 800, color: '#fff', background: '#C4622D', padding: '15px 36px', borderRadius: 12, display: 'inline-block' }}>
              無料で始める →
            </Link>
            <Link href="/login" style={{ fontSize: 16, fontWeight: 700, color: 'rgba(245,213,192,.85)', background: 'rgba(255,255,255,.1)', padding: '15px 28px', borderRadius: 12, display: 'inline-block', border: '1px solid rgba(255,255,255,.15)' }}>
              ログイン
            </Link>
          </div>
          <p style={{ fontSize: 12, color: 'rgba(245,213,192,.45)', marginTop: 18 }}>クレジットカード不要・1分で登録完了</p>
        </div>
      </section>

      {/* 数字で見る */}
      <section style={{ background: '#fff', borderBottom: '1px solid #EAD9C8' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '40px 24px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, textAlign: 'center' }}>
          {[
            { num: '30秒', label: '1件あたりの入力時間' },
            { num: '年/月/日', label: '3段階の台帳管理' },
            { num: '即座に', label: 'グラフ・レポート生成' },
          ].map((item, i) => (
            <div key={i} style={{ padding: '28px 16px', borderRight: i < 2 ? '1px solid #EAD9C8' : 'none' }}>
              <div style={{ fontSize: 32, fontWeight: 900, color: '#C4622D', letterSpacing: '-1px', marginBottom: 6 }}>{item.num}</div>
              <div style={{ fontSize: 13, color: '#8B5A3A', fontWeight: 600 }}>{item.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 機能紹介 */}
      <section style={{ padding: '72px 24px', maxWidth: 1080, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#B8967A', letterSpacing: '.8px', textTransform: 'uppercase', marginBottom: 12 }}>Features</div>
          <h2 style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 900, color: '#3D2314', letterSpacing: '-0.5px' }}>必要な機能がすべて揃っています</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
          {[
            {
              icon: '⚡',
              title: 'かんたん売上入力',
              desc: '新規・常連をワンタップで記録。支払い方法も選択可能。入力は30秒で完了します。',
            },
            {
              icon: '📊',
              title: '台帳・集計・グラフ',
              desc: '年別・月別・日別の台帳表示。Chart.jsによるグラフで売上推移を視覚的に把握。',
            },
            {
              icon: '📄',
              title: '経理レポート',
              desc: '月次レポートをワンクリックで生成。PDF印刷・CSV出力で税理士への提出もスムーズ。',
            },
            {
              icon: '⚙️',
              title: 'マスタ管理・CSV',
              desc: '料金プランのマスタ追加・編集。CSVインポートで既存データの移行も簡単。',
            },
          ].map((f, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: 16, padding: '28px 24px', boxShadow: '0 1px 3px rgba(61,35,20,.08)', border: '1px solid #EAD9C8' }}>
              <div style={{ fontSize: 28, marginBottom: 14 }}>{f.icon}</div>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: '#3D2314', marginBottom: 10, letterSpacing: '-0.3px' }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: '#8B5A3A', lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 使い方ステップ */}
      <section style={{ background: '#fff', padding: '72px 24px', borderTop: '1px solid #EAD9C8', borderBottom: '1px solid #EAD9C8' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#B8967A', letterSpacing: '.8px', textTransform: 'uppercase', marginBottom: 12 }}>How it works</div>
          <h2 style={{ fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 900, color: '#3D2314', marginBottom: 48, letterSpacing: '-0.5px' }}>3ステップで始められます</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              { step: '01', title: '無料登録', desc: 'メールアドレスとパスワードだけで即時登録。1分で完了。' },
              { step: '02', title: '売上を入力', desc: '患者さんが来たらその場でワンタップ記録。種別・金額を選ぶだけ。' },
              { step: '03', title: 'レポートを確認', desc: '台帳・集計・経理レポートが自動生成。月末の締め作業が一瞬で終わります。' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 24, alignItems: 'flex-start', padding: '24px 0', borderBottom: i < 2 ? '1px solid #EAD9C8' : 'none', textAlign: 'left' }}>
                <div style={{ flexShrink: 0, width: 48, height: 48, borderRadius: 12, background: '#3D2314', color: '#F5C9A8', fontSize: 13, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', letterSpacing: '.5px' }}>{s.step}</div>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: '#3D2314', marginBottom: 6 }}>{s.title}</div>
                  <div style={{ fontSize: 14, color: '#8B5A3A', lineHeight: 1.7 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 料金 */}
      <section style={{ padding: '72px 24px', maxWidth: 1080, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#B8967A', letterSpacing: '.8px', textTransform: 'uppercase', marginBottom: 12 }}>Pricing</div>
        <h2 style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 900, color: '#3D2314', marginBottom: 40, letterSpacing: '-0.5px' }}>シンプルな料金体系</h2>
        <div style={{ maxWidth: 420, margin: '0 auto', background: '#fff', borderRadius: 20, padding: '40px 36px', boxShadow: '0 4px 24px rgba(61,35,20,.1)', border: '2px solid #3D2314', position: 'relative' }}>
          <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: '#C4622D', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 16px', borderRadius: 100, whiteSpace: 'nowrap', letterSpacing: '.3px' }}>
            準備中
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#8B5A3A', marginBottom: 8 }}>スタンダードプラン</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 4, marginBottom: 6 }}>
            <span style={{ fontSize: 48, fontWeight: 900, color: '#3D2314', letterSpacing: '-2px', lineHeight: 1 }}>¥4,980</span>
            <span style={{ fontSize: 15, color: '#8B5A3A', fontWeight: 600, marginBottom: 6 }}>/月</span>
          </div>
          <div style={{ fontSize: 12, color: '#B8967A', marginBottom: 32 }}>税込 ¥5,478/月</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left', marginBottom: 32 }}>
            {['売上入力・台帳・集計', '経理レポート・CSV出力', 'マスタ管理（種別・料金）', 'スマホ・PC対応', 'データ無制限'].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14, color: '#3D2314', fontWeight: 600 }}>
                <span style={{ color: '#C4622D', fontSize: 16, flexShrink: 0 }}>✓</span>{item}
              </div>
            ))}
          </div>
          <div style={{ background: '#F5EDE4', borderRadius: 10, padding: '14px 16px', fontSize: 13, color: '#8B5A3A', fontWeight: 600 }}>
            現在β版として無料提供中。<br />正式リリース時にお知らせします。
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: 'linear-gradient(160deg, #3D2314 0%, #5C3520 100%)', padding: '72px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 900, color: '#fff', marginBottom: 16, letterSpacing: '-0.5px' }}>今すぐ無料で試してみる</h2>
          <p style={{ fontSize: 15, color: 'rgba(245,213,192,.7)', marginBottom: 36, lineHeight: 1.7 }}>クレジットカード不要。登録1分。いつでも解約できます。</p>
          <Link href="/signup" style={{ fontSize: 17, fontWeight: 800, color: '#fff', background: '#C4622D', padding: '16px 40px', borderRadius: 12, display: 'inline-block' }}>
            無料で始める →
          </Link>
        </div>
      </section>

      {/* フッター */}
      <footer style={{ background: '#2A1810', padding: '32px 24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: '#5C3520', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#F5C9A8', fontSize: 11, fontWeight: 900 }}>A</span>
          </div>
          <span style={{ color: '#F5C9A8', fontSize: 14, fontWeight: 700 }}>Amato 整体院SaaS</span>
        </div>
        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginBottom: 20 }}>
          <Link href="/login" style={{ fontSize: 13, color: 'rgba(245,201,168,.5)', fontWeight: 600 }}>ログイン</Link>
          <Link href="/signup" style={{ fontSize: 13, color: 'rgba(245,201,168,.5)', fontWeight: 600 }}>新規登録</Link>
        </div>
        <p style={{ fontSize: 12, color: 'rgba(245,201,168,.3)' }}>© 2026 Amato整体院SaaS. All rights reserved.</p>
      </footer>
    </div>
  )
}
