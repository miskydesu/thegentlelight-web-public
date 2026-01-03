 'use client'

 import { useState } from 'react'
 import { adminEventRegistryCheck, type EventRegistryCheckLocation, type EventRegistryKeywordSearchMode } from '../../../../lib/tglAdminApi'

 const PRESET_HEARTWARMING_BOOLEAN = `(heartwarming OR wholesome OR uplifting OR feel-good) AND NOT (
movie OR film OR Netflix OR season OR episode OR trailer OR review OR spoiler
OR musical OR theatre OR theater OR concert OR tour OR festival OR premiere
OR recipe OR recipes OR casserole OR stew OR popcorn
OR ranked OR preview OR list OR "best-of"
OR podcast OR opinion OR columnist
OR celebrity OR girlfriend OR wife
OR viral OR TikTok OR Instagram OR Facebook OR "social media" OR influencer OR posted OR shares
OR horoscope OR astrology
)`

 type QueryPreset = 'none' | 'heartwarming_en_boolean'

 export default function AdminEventRegistryCheckPage() {
   const [preset, setPreset] = useState<QueryPreset>('none')
   const [keyword, setKeyword] = useState('')
   const [location, setLocation] = useState<EventRegistryCheckLocation>('ALL')
  const [keywordSearchMode, setKeywordSearchMode] = useState<EventRegistryKeywordSearchMode>('phrase')
   const [excludePreset, setExcludePreset] = useState(true)
   const [useCategory, setUseCategory] = useState(false)
   const [categoryUri, setCategoryUri] = useState('')
   const [loading, setLoading] = useState(false)
   const [error, setError] = useState<string | null>(null)
   const [data, setData] = useState<any>(null)

   const applyPreset = (p: QueryPreset) => {
     setPreset(p)
     if (p === 'heartwarming_en_boolean') {
       // Full boolean query (already includes NOT block) -> send as-is
       setKeyword(PRESET_HEARTWARMING_BOOLEAN)
       setKeywordSearchMode('exact')
       setExcludePreset(false) // avoid double "AND NOT(...)"
       // For ALL, Event Registry needs at least categoryUri or sourceLocationUri; we choose a broad category default.
       setLocation('ALL')
       setUseCategory(true)
       setCategoryUri('news/Business')
     }
   }

   const run = async () => {
     setLoading(true)
     setError(null)
     setData(null)
     try {
       const res = await adminEventRegistryCheck({
         keyword,
         location,
        keywordSearchMode,
         excludePreset,
         useCategory,
         categoryUri: useCategory ? categoryUri : undefined,
       })
       setData(res.result)
     } catch (e: any) {
       setError(e?.message || String(e))
     } finally {
       setLoading(false)
     }
   }

  return (
    <main style={{ maxWidth: '1800px', margin: '0 auto', padding: '20px' }}>
       <h2 style={{ margin: 0 }}>Event Registry 取得チェック</h2>
       <p className="tglMuted" style={{ marginTop: '0.25rem' }}>
         1回の実行で Event Registry API を<strong>1回だけ</strong>叩き、最大100件まで表示します。
       </p>

       <div className="tglCard" style={{ padding: '1rem', marginTop: '1rem' }}>
         <div style={{ display: 'grid', gap: '0.75rem' }}>
           <div style={{ display: 'grid', gap: '0.25rem' }}>
             <div style={{ fontWeight: 700 }}>Preset</div>
             <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
               <select className="tglSelect" value={preset} onChange={(e) => applyPreset(e.target.value as any)}>
                 <option value="none">（なし）</option>
                 <option value="heartwarming_en_boolean">Heartwarming (boolean + NOT block)</option>
               </select>
               <span className="tglMuted">プリセットを選ぶと keyword/mode/除外設定を自動で整えます。</span>
             </div>
           </div>

           <label style={{ display: 'grid', gap: '0.25rem' }}>
             <div style={{ fontWeight: 700 }}>Keyword（テキスト / 複数・除外は手動で記述）</div>
             <textarea
               className="tglInput"
               value={keyword}
               onChange={(e) => setKeyword(e.target.value)}
               placeholder="例: crypto tax -scam"
               rows={4}
             />
           </label>

          <div style={{ display: 'grid', gap: '0.25rem' }}>
            <div style={{ fontWeight: 700 }}>Search mode</div>
            <select
              className="tglSelect"
              value={keywordSearchMode}
              onChange={(e) => setKeywordSearchMode(e.target.value as any)}
            >
              <option value="phrase">phrase（デフォルト / フレーズ一致）</option>
              <option value="exact">exact（AND/OR/NOT, NEAR/X, NEXT/X）</option>
              <option value="simple">simple（広く拾う / Googleっぽい）</option>
            </select>
            <div className="tglMuted" style={{ fontSize: '0.9rem' }}>
              phrase は “Star Wars” のように並び順も含めて探します。exact はブール演算・近接演算が使えます。
            </div>
          </div>

          <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input type="checkbox" checked={excludePreset} onChange={(e) => setExcludePreset(e.target.checked)} />
            <span style={{ fontWeight: 700 }}>除外ワード（プリセット）を適用</span>
          </label>

           <div style={{ display: 'grid', gap: '0.25rem' }}>
             <div style={{ fontWeight: 700 }}>Location</div>
             <select className="tglSelect" value={location} onChange={(e) => setLocation(e.target.value as any)}>
               <option value="ALL">ALL</option>
               <option value="US">US</option>
               <option value="JP">JP</option>
             </select>
             {location === 'ALL' ? (
               <div className="tglMuted" style={{ fontSize: '0.9rem' }}>
                 注: Location=ALL の場合、Event Registry 側の都合で categoryUri（カテゴリ指定）が無いと 0件になりやすいです。カテゴリ指定をONにしてください。
               </div>
             ) : null}
           </div>

           <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
             <input type="checkbox" checked={useCategory} onChange={(e) => setUseCategory(e.target.checked)} />
             <span style={{ fontWeight: 700 }}>カテゴリ指定を使う</span>
           </label>

           {useCategory ? (
             <label style={{ display: 'grid', gap: '0.25rem' }}>
               <div style={{ fontWeight: 700 }}>categoryUri（テキスト）</div>
               <input
                 className="tglInput"
                 value={categoryUri}
                 onChange={(e) => setCategoryUri(e.target.value)}
                 placeholder="例: news/Business"
               />
             </label>
           ) : null}

           <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
             <button className="tglBtn" disabled={loading || !keyword.trim()} onClick={run}>
               {loading ? 'Fetching…' : 'Fetch'}
             </button>
            <span className="tglMuted">resultType=articles / articlesSortBy=date / max=100</span>
           </div>
         </div>
       </div>

       {error ? (
         <div className="tglCard" style={{ padding: '1rem', marginTop: '1rem', borderColor: '#fca5a5' }}>
           <div style={{ fontWeight: 800, color: '#b91c1c' }}>Error</div>
           <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{error}</pre>
         </div>
       ) : null}

       {data ? (
         <div className="tglCard" style={{ padding: '1rem', marginTop: '1rem' }}>
           <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
             <div>
               <div className="tglMuted">HTTP</div>
               <div style={{ fontWeight: 800 }}>{data.request.http_status}</div>
             </div>
             <div>
               <div className="tglMuted">Elapsed</div>
               <div style={{ fontWeight: 800 }}>{data.request.elapsed_ms}ms</div>
             </div>
             <div>
               <div className="tglMuted">totalResults</div>
               <div style={{ fontWeight: 800 }}>{data.totalResults}</div>
             </div>
             <div>
               <div className="tglMuted">returned</div>
               <div style={{ fontWeight: 800 }}>{data.articles?.length || 0}</div>
             </div>
           </div>

           <div style={{ marginTop: '1rem', overflowX: 'auto' }}>
             {data.effective ? (
               <div style={{ marginBottom: '0.75rem' }}>
                 <div className="tglMuted">Effective query</div>
                 <div style={{ fontWeight: 800 }}>
                   mode: {data.effective.keywordSearchMode} / excludePreset: {String(data.effective.excludePresetApplied)}
                 </div>
                 <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{data.effective.keyword}</pre>
               </div>
             ) : null}
             <table className="tglTable">
               <thead>
                 <tr>
                   <th>Date</th>
                   <th>Source</th>
                   <th>Title</th>
                   <th>Lang</th>
                 </tr>
               </thead>
               <tbody>
                 {(data.articles || []).map((a: any, idx: number) => (
                   <tr key={a.uri || a.url || idx}>
                     <td style={{ whiteSpace: 'nowrap' }}>{a.dateTimePub || a.dateTime || a.date || ''}</td>
                     <td>{a.source?.title || ''}</td>
                     <td>
                       {a.url ? (
                         <a href={a.url} target="_blank" rel="noreferrer">
                           {a.title || '(no title)'}
                         </a>
                       ) : (
                         a.title || '(no title)'
                       )}
                       {a.body ? (
                         <div className="tglMuted" style={{ marginTop: '0.25rem' }}>
                           {(String(a.body).slice(0, 180) || '').trim()}
                           {String(a.body).length > 180 ? '…' : ''}
                         </div>
                       ) : null}
                     </td>
                     <td style={{ whiteSpace: 'nowrap' }}>{a.lang || ''}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
         </div>
      ) : null}
    </main>
  )
}


