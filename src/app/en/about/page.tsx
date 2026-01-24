import Link from 'next/link'
import { fetchJson, type HomeResponse } from '@/lib/tglApi'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import { ResponsiveDetails } from '@/components/ui/ResponsiveDetails'
import styles from '../../[country]/about/about.module.css'
import { canonicalUrl, getSiteBaseUrl } from '@/lib/seo'
import { generateBreadcrumbListJSONLD } from '@/lib/seo-helpers'
import { CACHE_POLICY } from '@/lib/cache-policy'
import { getCountryPreferenceHint } from '@/lib/server/preferred-english-country'
import { EnglishEditionBanner } from '@/components/en/EnglishEditionBanner'

export function generateMetadata() {
  const canonical = canonicalUrl('/en/about')
  const baseDescription =
    'Learn how The Gentle Light delivers calm, fact-based news for mental health. Our approach to fighting news anxiety, doomscrolling, and news fatigue.'
  return {
    title: 'Our Policy: Calm, Not Sensational',
    description: baseDescription,
    keywords: ['about gentle light', 'news without anxiety', 'mental health news', 'doomscrolling solution', 'news fatigue', 'calm news philosophy'],
    alternates: { canonical },
  }
}

export default async function EnAboutPage() {
  const pref = getCountryPreferenceHint()
  const country = pref.country // us/ca/uk/jp（ニュース/朝刊の導線用）
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
      { name: 'Home', url: `${base}/${country}` },
      { name: 'About', url: `${base}/en/about` },
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
          <Link href={`/${country}`} style={{ fontSize: '0.95rem', color: 'var(--muted)', textDecoration: 'none' }}>
            ← Home
          </Link>
          <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>About</span>
        </div>

        <EnglishEditionBanner
          initialEdition={(country === 'uk' || country === 'ca' || country === 'us' ? country : 'us') as any}
          kind="columns"
          inferredCountry={pref.source === 'geo' ? country : null}
          inferredSource={pref.source}
        />

        <div style={{ height: 20 }} />

        <Card className={styles.topCard}>
          <CardTitle as="h1" style={{ fontSize: '1.45rem', marginBottom: 10 }}>
            <span className={styles.cardTitleAccent}>About The Gentle Light</span>
          </CardTitle>
          <CardContent className={styles.bodyText}>
            <>
              <p>The Gentle Light is a calm way to stay informed.</p>
              <p>We soften sensational language and organize the essentials—so the world feels understandable, not overwhelming.</p>
              <p>You don’t have to lose your peace to keep up.</p>
            </>
          </CardContent>
        </Card>

        <div style={{ height: 20 }} />

        <Card className={styles.topCard}>
          <CardTitle className={styles.sectionTitle}>
            <span className={styles.cardTitleAccent}>What you can do here</span>
          </CardTitle>
          <CardContent className={styles.bodyText}>
            <div className={styles.featureGrid}>
              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>📰</div>
                <div className={styles.featureText}>
                  <div className={styles.featureTitle}>Morning Briefing (5 min)</div>
                  <div className={styles.featureDesc}>Get today’s big picture in 5 calm minutes</div>
                </div>
              </div>
              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>🗞️</div>
                <div className={styles.featureText}>
                  <div className={styles.featureTitle}>Top news / list</div>
                  <div className={styles.featureDesc}>Quietly check what matters right now</div>
                </div>
              </div>
              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>🔎</div>
                <div className={styles.featureText}>
                  <div className={styles.featureTitle}>Topics</div>
                  <div className={styles.featureDesc}>One event, multiple sources—calmly</div>
                </div>
              </div>
              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>🤍</div>
                <div className={styles.featureText}>
                  <div className={styles.featureTitle}>Heartwarming</div>
                  <div className={styles.featureDesc}>Gentle moments, picked with our evaluation</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div style={{ height: 20 }} />

        <Card className={styles.topCard}>
          <CardTitle className={styles.sectionTitle}>
            <span className={styles.cardTitleAccent}>What is the Morning Briefing?</span>
          </CardTitle>
          <CardContent className={styles.bodyText}>
            <div className={styles.morningIntro}>
              <div>Your daily briefing, gently edited.</div>
              <div>A country-optimized digest of what matters—plus calm context when you want to go deeper.</div>
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
                  <span className={styles.morningSummaryText}>Basic structure (3 parts)</span>
                </>
              }
            >
              <div className={styles.morningBody}>
                <div className={styles.morningBlock}>
                  <div className={styles.morningBlockTitle}>5-minute news</div>
                  <div className={styles.morningBlockDesc}>Four cards (Top / Local / Bright / Politics & economy)</div>
                </div>
                <div className={styles.morningBlock}>
                  <div className={styles.morningBlockTitle}>🤍 Heartwarming</div>
                  <div className={styles.morningBlockDesc}>Two gentle moments to soften the day</div>
                </div>
                <div className={styles.morningBlock}>
                  <div className={styles.morningBlockTitle}>Other events of the day</div>
                  <div className={styles.morningBlockDesc}>Other events worth noting, briefly</div>
                </div>
              </div>
            </ResponsiveDetails>

            <div style={{ marginTop: 12 }}>
              <Link className={styles.textLink} href={dailyHref}>
                📰 Read today’s Morning Briefing →
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
              <span>What is “Heartwarming” here?</span>
            </span>
          </CardTitle>
          <CardContent className={styles.bodyText}>
            <>
              <p className={styles.hwLead}>
                The Gentle Light has an original category called “Heartwarming.” It’s a shelf for finding gentle moments in the news.
              </p>
              <p className={styles.hwText}>
                We don’t just look for “positive” stories—we use our own evaluation to prioritize real-world kindness, support, and human connection. Even
                on a busy day, we hope it gives you a small sense of relief.
              </p>
              <div className={styles.hwChipGrid} aria-label="heartwarming keywords">
                <span className={styles.hwChip}>Kindness</span>
                <span className={styles.hwChip}>Support</span>
                <span className={styles.hwChip}>Real-world</span>
              </div>
              <div style={{ marginTop: 10 }}>
                <Link className={styles.textLink} href={`/${country}/category/heartwarming`}>
                  🤍 Read heartwarming →
                </Link>
              </div>
            </>
          </CardContent>
        </Card>

        <div style={{ height: 20 }} />

        <Card className={styles.topCard}>
          <CardTitle className={styles.sectionTitle}>
            <span className={styles.cardTitleAccent}>Our editorial approach</span>
          </CardTitle>
          <CardContent className={styles.bodyText}>
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
                <span className={styles.faqChevron} aria-hidden="true">
                  ›
                </span>
                <span className={styles.faqSummaryText}>Do you cover distressing news, too?</span>
              </summary>
              <div className={styles.faqAnswer}>
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
              </div>
            </details>

            <details className={styles.faqDetails} open>
              <summary className={styles.faqSummary}>
                <span className={styles.faqChevron} aria-hidden="true">
                  ›
                </span>
                <span className={styles.faqSummaryText}>I’m not sure what to read.</span>
              </summary>
              <div className={styles.faqAnswer}>
                <div>On unsure days, “Today’s Morning Briefing” is enough. If needed, open just one topic you care about.</div>
              </div>
            </details>

            <details className={styles.faqDetails}>
              <summary className={styles.faqSummary}>
                <span className={styles.faqChevron} aria-hidden="true">
                  ›
                </span>
                <span className={styles.faqSummaryText}>How long does it take?</span>
              </summary>
              <div className={styles.faqAnswer}>
                <div>
                  The Morning Briefing takes about 5 minutes. On days you’re curious, open a topic and go a little deeper—only if you want.
                </div>
              </div>
            </details>

            <details className={styles.faqDetails}>
              <summary className={styles.faqSummary}>
                <span className={styles.faqChevron} aria-hidden="true">
                  ›
                </span>
                <span className={styles.faqSummaryText}>Do you send breaking-news alerts?</span>
              </summary>
              <div className={styles.faqAnswer}>No. We don’t push rapid-fire breaking alerts. We do update—but we deliver it in a calmer shape.</div>
            </details>

            <details className={styles.faqDetails}>
              <summary className={styles.faqSummary}>
                <span className={styles.faqChevron} aria-hidden="true">
                  ›
                </span>
                <span className={styles.faqSummaryText}>What can I do with an account?</span>
              </summary>
              <div className={styles.faqAnswer}>
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
                  <div style={{ marginTop: 6 }}>
                    Your saved topics and preferences are stored with your account, so they’re there when you return.
                  </div>
                </>
              </div>
            </details>

            <details className={styles.faqDetails}>
              <summary className={styles.faqSummary}>
                <span className={styles.faqChevron} aria-hidden="true">
                  ›
                </span>
                <span className={styles.faqSummaryText}>Can I read the original sources?</span>
              </summary>
              <div className={styles.faqAnswer}>
                Yes. Each topic includes links to source articles—so you can quietly check the originals when you want.
              </div>
            </details>

            <details className={styles.faqDetails}>
              <summary className={styles.faqSummary}>
                <span className={styles.faqChevron} aria-hidden="true">
                  ›
                </span>
                <span className={styles.faqSummaryText}>What’s less likely to be featured?</span>
              </summary>
              <div className={styles.faqAnswer}>
                We don’t prioritize sensational headlines, forced certainty, or framing designed to inflame conflict.
              </div>
            </details>
          </CardContent>
        </Card>

        <div style={{ height: 20 }} />

        <Card className={styles.topCard}>
          <CardTitle className={styles.sectionTitle}>
            <span className={styles.cardTitleAccent}>Sources & links</span>
          </CardTitle>
          <CardContent className={styles.bodyText}>
            <>
              <p>We collect news from multiple reputable sources.</p>
              <p>Each topic includes links to original articles.</p>
              <p>Read the essentials first. Go deeper only if you choose.</p>
            </>
          </CardContent>
        </Card>

        <div className={styles.nextChoicesWrap}>
          <div className={styles.nextChoicesLabel}>Where to go next</div>
          <div className={styles.nextChoicesGrid}>
            <Link className={styles.nextChoiceLink} href={dailyHref}>
              <div className={`${styles.nextChoiceCard} ${styles.nextChoiceCardPrimary}`}>
                <div className={styles.nextChoiceTitle}>📰 Morning Briefing (5 min)</div>
                <div className={styles.nextChoiceDesc}>A calm digest that organizes the essentials—without the noise.</div>
              </div>
            </Link>

            <Link className={styles.nextChoiceLink} href={`/${country}/category/heartwarming`}>
              <div className={styles.nextChoiceCard}>
                <div className={styles.nextChoiceTitle}>🤍 Heartwarming</div>
                <div className={styles.nextChoiceDesc}>Stories of kindness, support, and human connection.</div>
              </div>
            </Link>

            <Link className={styles.nextChoiceLink} href={`/en/columns`}>
              <div className={styles.nextChoiceCard}>
                <div className={styles.nextChoiceTitle}>📖 Calming columns</div>
                <div className={styles.nextChoiceDesc}>Step away from the news</div>
              </div>
            </Link>
          </div>
        </div>

        <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
          <Link href={`/${country}`} style={{ fontSize: '0.9rem', color: 'var(--muted)', textDecoration: 'none' }}>
            ← Back to Home
          </Link>
        </div>
      </main>
    </>
  )
}

