import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchJson, isCountry, type HomeResponse } from '@/lib/tglApi'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import { ResponsiveDetails } from '@/components/ui/ResponsiveDetails'
import styles from './about.module.css'
import { canonicalUrl, getCountrySeoMeta, getSiteBaseUrl } from '@/lib/seo'
import { generateHreflang, generateBreadcrumbListJSONLD } from '@/lib/seo-helpers'
import { CACHE_POLICY } from '@/lib/cache-policy'

export function generateMetadata({ params }: { params: { country: string } }) {
  const country = params.country
  if (!isCountry(country)) return {}
  const isJa = country === 'jp'
  const { descriptionSuffixEn, descriptionSuffixJa } = getCountrySeoMeta(country)
  const canonical = canonicalUrl(`/${country}/about`)
  const hreflang = generateHreflang('/about')
  const baseDescription = isJa
    ? 'やさしいニュースの方針。穏やかで、煽られない・不安にならない。心が落ち着く、静かなニュース体験を目指します（メンタルヘルスにも配慮）。'
    : 'Learn how The Gentle Light delivers calm, fact-based news for mental health. Our approach to fighting news anxiety, doomscrolling, and news fatigue.'
  return {
    // /[country]/layout.tsx の title.template で末尾を出し分けるため、ここでは短い title を返す
    title: isJa ? 'やさしいニュースについて' : 'About Us',
    description: isJa ? `${baseDescription}${descriptionSuffixJa}` : `${baseDescription}${descriptionSuffixEn}`,
    keywords: isJa
      ? [
          'やさしいニュース',
          '優しいニュース',
          '穏やかなニュース',
          '煽られないニュース',
          '不安にならないニュース',
          '心が落ち着くニュース',
          '静かなニュース',
          'ニュース疲れ',
          '情報過多',
          'メンタルヘルス',
          'ジェントルライトについて',
        ]
      : ['about gentle light', 'news without anxiety', 'mental health news', 'doomscrolling solution', 'news fatigue', 'calm news philosophy'],
    alternates: {
      canonical,
      languages: Object.fromEntries(hreflang.map((h) => [h.lang, h.url])),
    },
  }
}

export default async function AboutPage({
  params,
  searchParams,
}: {
  params: { country: string }
  searchParams?: { gentle?: string }
}) {
  const country = params.country
  if (!isCountry(country)) return notFound()
  const isJa = country === 'jp'
  const gentle = searchParams?.gentle === '1' || searchParams?.gentle === 'true'
  const base = getSiteBaseUrl()
  const normalizeDailyDate = (dateValue: string): string => {
    if (!dateValue) return ''
    return dateValue.includes('T') ? dateValue.slice(0, 10) : dateValue
  }
  const dailyHref = await (async () => {
    try {
      const home = await fetchJson<HomeResponse>(`/v1/${country}/home?limit=1`, { next: { revalidate: CACHE_POLICY.meta } })
      const latestDailyDate = normalizeDailyDate(home?.daily_latest?.date_local ?? '')
      return latestDailyDate ? `/${country}/daily/${latestDailyDate}` : `/${country}/daily`
    } catch {
      return `/${country}/daily`
    }
  })()

  const breadcrumbJSONLD = generateBreadcrumbListJSONLD({
    items: [
      { name: 'The Gentle Light', url: `${base}/` },
      { name: isJa ? 'トップ' : 'Home', url: `${base}/${country}` },
      { name: isJa ? 'このサイトについて' : 'About', url: `${base}/${country}/about` },
    ],
  })

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJSONLD),
        }}
      />
      <main>
      <div className={styles.pageHeader}>
        <Link
          href={`/${country}`}
          style={{ fontSize: '0.95rem', color: 'var(--muted)', textDecoration: 'none' }}
        >
          {isJa ? '← トップ' : '← Home'}
        </Link>
        <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
          {isJa ? 'このサイトについて' : 'About'}
        </span>
      </div>

      <div style={{ height: 20 }} />

      <Card className={styles.topCard}>
        <CardTitle as="h1" style={{ fontSize: '1.45rem', marginBottom: 10 }}>
          <span className={styles.cardTitleAccent}>{isJa ? 'やさしいニュースについて' : 'About The Gentle Light'}</span>
        </CardTitle>
        <CardContent className={styles.bodyText}>
          {isJa ? (
            <>
              <p>The Gentle Light は、煽られずに世界を知るためのニュースサイトです。</p>
              <p>強い言葉や断定を少しだけ落とし、要点と背景を静かに整理します。</p>
              <p>
                <strong>置いていかれない。でも、心を消耗させない。</strong>それがこの場所の約束です。
              </p>
            </>
          ) : (
            <>
              <p>The Gentle Light is a calm way to stay informed.</p>
              <p>We soften sensational language and organize the essentials—so the world feels understandable, not overwhelming.</p>
              <p>You don’t have to lose your peace to keep up.</p>
            </>
          )}
        </CardContent>
      </Card>

      <div style={{ height: 20 }} />

      <Card className={styles.topCard}>
        <CardTitle className={styles.sectionTitle}>
          <span className={styles.cardTitleAccent}>{isJa ? 'ここでできること' : 'What you can do here'}</span>
        </CardTitle>
        <CardContent className={styles.bodyText}>
          <div className={styles.featureGrid}>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>📰</div>
              <div className={styles.featureText}>
                <div className={styles.featureTitle}>{isJa ? '朝刊（5分）' : 'Morning Briefing (5 min)'}</div>
                <div className={styles.featureDesc}>
                  {isJa ? '5分で「今日の全体像」をつかむ' : 'Get today’s big picture in 5 calm minutes'}
                </div>
              </div>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>🗞️</div>
              <div className={styles.featureText}>
                <div className={styles.featureTitle}>{isJa ? 'トップニュース／一覧' : 'Top news / list'}</div>
                <div className={styles.featureDesc}>
                  {isJa ? 'いま押さえておきたい流れだけ確認' : 'Quietly check what matters right now'}
                </div>
              </div>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>🔎</div>
              <div className={styles.featureText}>
                <div className={styles.featureTitle}>{isJa ? 'topic（出来事）' : 'Topics'}</div>
                <div className={styles.featureDesc}>
                  {isJa ? 'ひとつの出来事を複数ソースで理解' : 'One event, multiple sources—calmly'}
                </div>
              </div>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>🤍</div>
              <div className={styles.featureText}>
                <div className={styles.featureTitle}>{isJa ? '心温まる話' : 'Heartwarming'}</div>
                <div className={styles.featureDesc}>
                  {isJa ? 'ほっとできる出来事を独自評価で抽出' : 'Gentle moments, picked with our evaluation'}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div style={{ height: 20 }} />

      <Card className={styles.topCard}>
        <CardTitle className={styles.sectionTitle}>
          <span className={styles.cardTitleAccent}>{isJa ? '朝刊（Morning Briefing）とは' : 'What is the Morning Briefing?'}</span>
        </CardTitle>
        <CardContent className={styles.bodyText}>
          <div className={styles.morningIntro}>
            <div>
              {isJa
                ? 'The Gentle Light の朝刊は、国別に最適化された要約ダイジェストです。'
                : 'Your daily briefing, gently edited.'}
            </div>
            <div>
              {isJa
                ? '大量のニュースを追いかける代わりに、必要な分だけを、やさしいトーンでまとめます。'
                : 'A country-optimized digest of what matters—plus calm context when you want to go deeper.'}
            </div>
          </div>

          <ResponsiveDetails
            defaultOpenMinWidthPx={840}
            className={styles.morningDetails}
            summaryClassName={styles.morningSummary}
            summary={
              <>
                <span className={styles.faqChevron} aria-hidden="true">
                  ›
                </span>
                <span className={styles.morningSummaryText}>
                  {isJa ? '基本の構成（3つ）' : 'Basic structure (3 parts)'}
                </span>
              </>
            }
          >
            <div className={styles.morningBody}>
              <div className={styles.morningBlock}>
                <div className={styles.morningBlockTitle}>{isJa ? '1日まとめニュース' : '5-minute news'}</div>
                <div className={styles.morningBlockDesc}>
                  {isJa
                    ? 'その日の全体像を、トップ/身近/明るい/政治・経済 で整理'
                    : 'Four cards (Top / Local / Bright / Politics & economy)'}
                </div>
              </div>
              <div className={styles.morningBlock}>
                <div className={styles.morningBlockTitle}>{isJa ? '🤍 心温まる話' : '🤍 Heartwarming'}</div>
                <div className={styles.morningBlockDesc}>
                  {isJa ? '気持ちがほどける出来事を、2つだけ' : 'Two gentle moments to soften the day'}
                </div>
              </div>
              <div className={styles.morningBlock}>
                <div className={styles.morningBlockTitle}>{isJa ? 'その他、この日にあった出来事' : 'Other events of the day'}</div>
                <div className={styles.morningBlockDesc}>
                  {isJa ? 'その日の出来事を短くまとめておきます' : 'Other events worth noting, briefly'}
                </div>
              </div>
            </div>
          </ResponsiveDetails>

          <div style={{ marginTop: 12 }}>
            <Link className={styles.textLink} href={dailyHref}>
              {isJa ? '📰 今日の朝刊を見る →' : '📰 Read today’s Morning Briefing →'}
            </Link>
          </div>
        </CardContent>
      </Card>

      <div style={{ height: 20 }} />

      <Card className={styles.topCard}>
        <CardTitle className={styles.sectionTitle}>
          <span className={styles.heartwarmingTitle}>
            <span className={styles.heartIcon} aria-hidden="true">
              ♡
            </span>
            <span>{isJa ? '心温まる話とは' : 'What is “Heartwarming” here?'}</span>
          </span>
        </CardTitle>
        <CardContent className={styles.bodyText}>
          {isJa ? (
            <>
              <p className={styles.hwLead}>
                The Gentle Light には、独自カテゴリ「心温まる話」があります。ニュースの中から、ほっとできる出来事を見つけて届けるための棚です。
              </p>
              <p className={styles.hwText}>
                単に「明るい」だけでなく、人のやさしさ・支援・つながりが伝わるかを、独自の評価方式で確かめた上で抽出します。忙しい日でも、少しでも心がほどける情報を届けることを目指しています。
              </p>
              <div className={styles.hwChipGrid} aria-label="heartwarming keywords">
                <span className={styles.hwChip}>人のやさしさ</span>
                <span className={styles.hwChip}>支援とつながり</span>
                <span className={styles.hwChip}>出来事ベース</span>
              </div>
              <div style={{ marginTop: 10 }}>
                <Link className={styles.textLink} href={`/${country}/category/heartwarming?gentle=1`}>
                  🤍 心温まる話を読む →
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className={styles.hwLead}>
                The Gentle Light has an original category called “Heartwarming.” It’s a shelf for finding gentle moments in the news.
              </p>
              <p className={styles.hwText}>
                We don’t just look for “positive” stories—we use our own evaluation to prioritize real-world kindness, support, and human connection. Even on a busy day, we hope it gives you a small sense of relief.
              </p>
              <div className={styles.hwChipGrid} aria-label="heartwarming keywords">
                <span className={styles.hwChip}>Kindness</span>
                <span className={styles.hwChip}>Support</span>
                <span className={styles.hwChip}>Real-world</span>
              </div>
              <div style={{ marginTop: 10 }}>
                <Link className={styles.textLink} href={`/${country}/category/heartwarming?gentle=1`}>
                  🤍 Read heartwarming →
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div style={{ height: 20 }} />

      <Card className={styles.topCard}>
        <CardTitle className={styles.sectionTitle}>
          <span className={styles.cardTitleAccent}>{isJa ? '私たちの編集方針' : 'Our editorial approach'}</span>
        </CardTitle>
        <CardContent className={styles.bodyText}>
          {isJa ? (
            <>
              <p>私たちは「速報で追い立てる」より、整理された要点と背景を大切にします。</p>
              <p>見出しの温度を下げ、憶測は憶測として扱い、断定を急ぎません。</p>
              <p>刺激を下げる。心の余白を守る。</p>
              <div className={styles.promiseCard}>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>宣言</div>
                <ul className={styles.promiseLines}>
                  <li>煽らない</li>
                  <li>断定しない</li>
                  <li>心の余白を守る</li>
                </ul>
              </div>
            </>
          ) : (
            <>
              <p>We lower the emotional volume—without lowering the truth.</p>
              <p>We separate facts from speculation, and urgency from importance.</p>
              <p>Less heat. More signal. Hope intact.</p>
              <div className={styles.promiseCard}>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>Our promise</div>
                <ul className={styles.promiseLines}>
                  <li>No sensationalism.</li>
                  <li>No pressure to keep scrolling.</li>
                  <li>A gentle way to stay connected.</li>
                </ul>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div style={{ height: 20 }} />

      <Card className={styles.topCard}>
        <CardTitle className={styles.sectionTitle}>
          <span className={styles.cardTitleAccent}>FAQ</span>
        </CardTitle>
        <CardContent className={styles.bodyText}>
          <details className={styles.faqDetails} open>
            <summary className={styles.faqSummary}>
              <span className={styles.faqChevron} aria-hidden="true">›</span>
              <span className={styles.faqSummaryText}>
                {isJa ? '不安なニュースも載りますか？' : 'Do you cover distressing news, too?'}
              </span>
            </summary>
            <div className={styles.faqAnswer}>
              {isJa ? (
                <>
                  <div>
                    大事な出来事は扱います。ただし、刺激的な言葉や不安を増幅させる見せ方は避け、要点と背景を落ち着いて整理します。
                  </div>
                  <div style={{ marginTop: 6 }}>
                    もし重く感じそうな話題が出てきたら、「負担を減らす」を選ぶことで、心に重く届きやすい話題をできるだけ控えめに表示できます（補助機能）。
                  </div>
                </>
              ) : (
                <>
                  <div>
                    Yes—important events are included. We simply avoid sensational language and fear-amplifying framing, and focus on calm essentials and
                    context.
                  </div>
                  <div style={{ marginTop: 6 }}>
                    If a topic feels intense, you can choose “Reduce strain” (Gentle Mode) to reduce the visibility of heavier topics—so you can stay
                    informed with less emotional strain.
                  </div>
                </>
              )}
            </div>
          </details>

          <details className={styles.faqDetails} open>
            <summary className={styles.faqSummary}>
              <span className={styles.faqChevron} aria-hidden="true">›</span>
              <span className={styles.faqSummaryText}>{isJa ? '何を読めばいいか迷います。' : 'I’m not sure what to read.'}</span>
            </summary>
            <div className={styles.faqAnswer}>
              <div>
                {isJa
                  ? '迷った日は「今日の朝刊」だけで大丈夫です。必要なときだけ、気になるtopicをひとつ開く、で十分です。'
                  : 'On unsure days, “Today’s Morning Briefing” is enough. If needed, open just one topic you care about.'}
              </div>
            </div>
          </details>

          <details className={styles.faqDetails}>
            <summary className={styles.faqSummary}>
              <span className={styles.faqChevron} aria-hidden="true">›</span>
              <span className={styles.faqSummaryText}>{isJa ? 'どれくらい時間がかかりますか？' : 'How long does it take?'}</span>
            </summary>
            <div className={styles.faqAnswer}>
              <div>
                {isJa
                  ? '朝刊はだいたい5分ほどです。気になる出来事がある日だけ、topicで少しだけ深掘りすれば十分です。'
                  : 'The Morning Briefing takes about 5 minutes. On days you’re curious, open a topic and go a little deeper—only if you want.'}
              </div>
            </div>
          </details>

          <details className={styles.faqDetails}>
            <summary className={styles.faqSummary}>
              <span className={styles.faqChevron} aria-hidden="true">›</span>
              <span className={styles.faqSummaryText}>{isJa ? '速報の通知はありますか？' : 'Do you send breaking-news alerts?'}</span>
            </summary>
            <div className={styles.faqAnswer}>
              {isJa
                ? '追い立てるような速報の連打はしません。更新はしますが、落ち着いて読める形に整えてから届けます。'
                : 'No. We don’t push rapid-fire breaking alerts. We do update—but we deliver it in a calmer shape.'}
            </div>
          </details>

          <details className={styles.faqDetails}>
            <summary className={styles.faqSummary}>
              <span className={styles.faqChevron} aria-hidden="true">›</span>
              <span className={styles.faqSummaryText}>
                {isJa ? 'ユーザー登録すると何ができますか？' : 'What can I do with an account?'}
              </span>
            </summary>
            <div className={styles.faqAnswer}>
              {isJa ? (
                <>
                  <div>読み方を“あなたに合う形”で保てるようになります。たとえば、次のことができます。</div>
                  <div className={styles.miniCardGrid}>
                    <div className={styles.miniCard}>
                      <div className={styles.miniIcon}>🌓</div>
                      <div className={styles.miniText}>
                        <div className={styles.miniTitle}>負担を減らす</div>
                        <div className={styles.miniDesc}>重く感じそうな話題をできるだけ控えめに表示</div>
                      </div>
                    </div>
                    <div className={styles.miniCard}>
                      <div className={styles.miniIcon}>💾</div>
                      <div className={styles.miniText}>
                        <div className={styles.miniTitle}>設定の保存</div>
                        <div className={styles.miniDesc}>次回も同じ状態で始められます</div>
                      </div>
                    </div>
                    <div className={styles.miniCard}>
                      <div className={styles.miniIcon}>✅</div>
                      <div className={styles.miniText}>
                        <div className={styles.miniTitle}>朝刊 既読/未読</div>
                        <div className={styles.miniDesc}>あとから追いやすくなります</div>
                      </div>
                    </div>
                    <div className={styles.miniCard}>
                      <div className={styles.miniIcon}>🔖</div>
                      <div className={styles.miniText}>
                        <div className={styles.miniTitle}>topic 保存</div>
                        <div className={styles.miniDesc}>気になった出来事を、静かに読み返せます</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: 6 }}>※保存したtopicや設定は、あなたのアカウントに紐づいて保持されます。</div>
                </>
              ) : (
                <>
                  <div>An account helps you keep the experience shaped to your needs. You can:</div>
                  <div className={styles.miniCardGrid}>
                    <div className={styles.miniCard}>
                      <div className={styles.miniIcon}>🌓</div>
                      <div className={styles.miniText}>
                        <div className={styles.miniTitle}>Reduce strain</div>
                        <div className={styles.miniDesc}>A lighter, lower-stimulus view</div>
                      </div>
                    </div>
                    <div className={styles.miniCard}>
                      <div className={styles.miniIcon}>💾</div>
                      <div className={styles.miniText}>
                        <div className={styles.miniTitle}>Save settings</div>
                        <div className={styles.miniDesc}>Keep your preferences next time</div>
                      </div>
                    </div>
                    <div className={styles.miniCard}>
                      <div className={styles.miniIcon}>✅</div>
                      <div className={styles.miniText}>
                        <div className={styles.miniTitle}>Read / unread</div>
                        <div className={styles.miniDesc}>Track your Morning Briefing</div>
                      </div>
                    </div>
                    <div className={styles.miniCard}>
                      <div className={styles.miniIcon}>🔖</div>
                      <div className={styles.miniText}>
                        <div className={styles.miniTitle}>Save topics</div>
                        <div className={styles.miniDesc}>Revisit later, calmly</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: 6 }}>Your saved topics and preferences are stored with your account, so they’re there when you return.</div>
                </>
              )}
            </div>
          </details>

          <details className={styles.faqDetails}>
            <summary className={styles.faqSummary}>
              <span className={styles.faqChevron} aria-hidden="true">›</span>
              <span className={styles.faqSummaryText}>
                {isJa ? '元の記事（一次情報）も見られますか？' : 'Can I read the original sources?'}
              </span>
            </summary>
            <div className={styles.faqAnswer}>
              {isJa
                ? 'はい。topicには参照元へのリンクを添えています。もっと確かめたいときだけ、そっと戻れるようにしています。'
                : 'Yes. Each topic includes links to source articles—so you can quietly check the originals when you want.'}
            </div>
          </details>

          <details className={styles.faqDetails}>
            <summary className={styles.faqSummary}>
              <span className={styles.faqChevron} aria-hidden="true">›</span>
              <span className={styles.faqSummaryText}>
                {isJa ? 'どんな記事が載りにくいですか？' : 'What’s less likely to be featured?'}
              </span>
            </summary>
            <div className={styles.faqAnswer}>
              {isJa
                ? '煽りや断定を目的にした見出し、過度に対立をあおる見せ方は、ここでは優先しません。'
                : 'We don’t prioritize sensational headlines, forced certainty, or framing designed to inflame conflict.'}
            </div>
          </details>
        </CardContent>
      </Card>

      <div style={{ height: 20 }} />

      <Card className={styles.topCard}>
        <CardTitle className={styles.sectionTitle}>
          <span className={styles.cardTitleAccent}>{isJa ? '収集元とリンクについて' : 'Sources & links'}</span>
        </CardTitle>
        <CardContent className={styles.bodyText}>
          {isJa ? (
            <>
              <p>ニュースは、複数の信頼できるソースから収集しています。</p>
              <p>各topicには、参照元（原文）へのリンクを添えます。</p>
              <p>「落ち着いて理解したい人が、必要なら一次情報に戻れる」ことを大切にしています。</p>
            </>
          ) : (
            <>
              <p>We collect news from multiple reputable sources.</p>
              <p>Each topic includes links to original articles.</p>
              <p>Read the essentials first. Go deeper only if you choose.</p>
            </>
          )}
        </CardContent>
      </Card>

      <div className={styles.nextChoicesWrap}>
        <div className={styles.nextChoicesLabel}>
          {isJa ? '次に読むなら、こちら' : 'Where to go next'}
        </div>
        <div className={styles.nextChoicesGrid}>
          <Link className={styles.nextChoiceLink} href={dailyHref}>
            <div className={`${styles.nextChoiceCard} ${styles.nextChoiceCardPrimary}`}>
              <div className={styles.nextChoiceTitle}>
                {isJa ? '📰 今日の朝刊を見る' : "📰 Morning Briefing (5 min)"}
              </div>
              <div className={styles.nextChoiceDesc}>
                {isJa
                  ? '強い言葉を少し落として、要点と流れだけを静かに整理します。'
                  : 'A calm digest that organizes the essentials—without the noise.'}
              </div>
            </div>
          </Link>

          <Link className={styles.nextChoiceLink} href={`/${country}/category/heartwarming${gentle ? '?gentle=1' : ''}`}>
            <div className={styles.nextChoiceCard}>
              <div className={styles.nextChoiceTitle}>
                {isJa ? '🤍 心温まる話へ' : '🤍 Heartwarming'}
              </div>
              <div className={styles.nextChoiceDesc}>
                {isJa
                  ? '「人のやさしさ・支援・つながり」が伝わる出来事だけを集めました。'
                  : 'Stories of kindness, support, and human connection.'}
              </div>
            </div>
          </Link>

          <Link className={styles.nextChoiceLink} href={`/${country}/columns${gentle ? '?gentle=1' : ''}`}>
            <div className={styles.nextChoiceCard}>
              <div className={styles.nextChoiceTitle}>{isJa ? '📖 心を整えるコラム' : '📖 Calming columns'}</div>
              <div className={styles.nextChoiceDesc}>
                {isJa ? 'ニュースから離れて、視点を整えます' : 'Step away from the news'}
              </div>
            </div>
          </Link>
        </div>
      </div>

      <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
        <Link
          href={`/${country}`}
          style={{ fontSize: '0.9rem', color: 'var(--muted)', textDecoration: 'none' }}
        >
          {isJa ? '← トップへ戻る' : '← Back to Home'}
        </Link>
      </div>
      </main>
    </>
  )
}


