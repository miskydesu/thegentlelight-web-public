import Document, { Head, Html, Main, NextScript } from 'next/document'

// App Router を使っていても、Next.js のビルド工程で `/_document` を参照するケースがあるため
// 最小の Document を用意してビルドを安定化させる。
export default class MyDocument extends Document {
  render() {
    return (
      <Html>
        <Head />
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}

