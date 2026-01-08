import { Html, Head, Main, NextScript } from 'next/document'

/**
 * NOTE:
 * This project uses the App Router (`src/app`), but Next.js build may still probe
 * the Pages Router `_document` to detect custom `getInitialProps`.
 * Providing a minimal `_document` prevents intermittent build-time PageNotFoundError.
 */
export default function Document() {
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


