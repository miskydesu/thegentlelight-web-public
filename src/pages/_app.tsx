import type { AppProps } from 'next/app'

// NOTE:
// App Router を主に使っていても、ビルド工程で pages/_document を参照するケースがある。
// pages/ 配下が `_document.tsx` だけだと環境によってはビルド時に `/_document` の解決で落ちるため、
// 最小の `_app.tsx` を用意して pages ルートを安定化させる。
export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />
}

