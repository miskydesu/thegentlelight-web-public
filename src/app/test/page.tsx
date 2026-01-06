'use client';

import { useState, useEffect, useRef } from 'react';
import * as Sentry from '@sentry/nextjs';

// NEXT_PUBLIC_API_BASE_URLの取得
// Next.jsではクライアント側で使う環境変数にはNEXT_PUBLIC_プレフィックスが必要
// 環境変数名はNEXT_PUBLIC_API_BASE_URLに統一（Cloudflare Pagesでも同じ名前で設定）
const getApiBaseUrl = () => {
  // 1. NEXT_PUBLIC_API_BASE_URLが設定されている場合はそれを使用
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }
  
  // 2. NEXT_PUBLIC_API_BASE_URLが未設定の場合、現在のホスト名から自動判定（フォールバック）
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8080';
    } else if (hostname === 'stg.thegentlelight.org') {
      return 'https://api-stg.thegentlelight.org';
    } else if (hostname === 'thegentlelight.org' || hostname === 'www.thegentlelight.org') {
      return 'https://api.thegentlelight.org';
    }
  }
  
  // 3. デフォルト（ローカル開発）
  return 'http://localhost:8080';
};

// NEXT_PUBLIC_API_BASE_URLから取得したAPIベースURL
const API_BASE_URL = getApiBaseUrl();

interface ImageItem {
  key: string;
  url: string;
  size: number;
  lastModified: string;
}

interface TestDataItem {
  id: number;
  name: string;
  message: string | null;
  created_at: string;
}

export default function TestPage() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [testData, setTestData] = useState<TestDataItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  // 画像一覧取得
  const fetchImages = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/images/list`);
      const data = await response.json();
      if (data.success) {
        setImages(data.images);
      }
    } catch (error) {
      console.error('画像一覧取得エラー:', error);
    }
  };

  // テストデータ一覧取得
  const fetchTestData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/test-data/list`);
      const data = await response.json();
      if (data.success) {
        setTestData(data.data);
      }
    } catch (error) {
      console.error('データ取得エラー:', error);
    }
  };

  // Sentry（ブラウザ側）テスト送信
  const handleSentryClientTest = () => {
    const err = new Error('Sentry test (browser/client)');
    Sentry.captureException(err);
    setMessage('Sentryにブラウザ側のテストイベントを送信しました（数秒後にSentryで確認）');
  };

  // Sentry（Next.jsサーバ側）テスト送信
  const handleSentryServerTest = async () => {
    try {
      // Cloudflare Pages（next-on-pages）では Route Handler(/api/...) がビルド変換で落ちることがあるため、
      // サーバ側テストは「Edge実行のページ」を開いて例外を発生させる方式にする。
      window.location.href = '/sentry-test';
    } catch (error: any) {
      console.error('Sentryサーバテスト呼び出しエラー:', error);
      setMessage(`Sentryサーバテスト呼び出しに失敗しました: ${error.message || String(error)}`);
    }
  };

  // 画像アップロード
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      console.log('アップロード開始:', { NEXT_PUBLIC_API_BASE_URL: API_BASE_URL, url: `${API_BASE_URL}/api/images/upload` });
      const response = await fetch(`${API_BASE_URL}/api/images/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('APIエラーレスポンス:', { status: response.status, statusText: response.statusText, body: errorText });
        throw new Error(`APIエラー: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setMessage('画像をアップロードしました');
        fetchImages();
      } else {
        const errorMsg = data.details ? `${data.error}: ${data.details}` : data.error || 'アップロードに失敗しました';
        setMessage(errorMsg);
        console.error('アップロードエラー:', data);
      }
    } catch (error: any) {
      console.error('アップロードエラー:', error);
      setMessage(`アップロードに失敗しました: ${error.message || String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  // テーブル初期化
  const handleInitTable = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/test-data/init`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        setMessage('テーブルを作成しました');
      } else {
        const errorMsg = data.details ? `${data.error}: ${data.details}` : data.error || 'テーブル作成に失敗しました';
        setMessage(errorMsg);
        console.error('テーブル作成エラー:', data);
      }
    } catch (error: any) {
      console.error('テーブル作成エラー:', error);
      setMessage(`テーブル作成に失敗しました: ${error.message || String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  // データ挿入
  const handleInsertData = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const message = formData.get('message') as string;

    try {
      const response = await fetch(`${API_BASE_URL}/api/test-data/insert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, message }),
      });

      const data = await response.json();
      if (data.success) {
        setMessage('データを挿入しました');
        fetchTestData();
        // フォームのリセット（useRefを使用）
        if (formRef.current) {
          formRef.current.reset();
        }
      } else {
        const errorMsg = data.details ? `${data.error}: ${data.details}` : data.error || 'データ挿入に失敗しました';
        setMessage(errorMsg);
        console.error('データ挿入エラー:', data);
      }
    } catch (error: any) {
      console.error('データ挿入エラー:', error);
      setMessage(`データ挿入に失敗しました: ${error.message || String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
    fetchTestData();
  }, []);

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>基礎構築テスト2</h1>

      {message && (
        <div style={{ 
          padding: '1rem', 
          marginBottom: '1rem', 
          backgroundColor: '#d4edda', 
          border: '1px solid #c3e6cb',
          borderRadius: '4px',
          color: '#155724'
        }}>
          {message}
        </div>
      )}

      {/* Sentry テスト */}
      <section style={{ marginBottom: '3rem', padding: '1.5rem', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>③ Sentry送信テスト</h2>
        <p style={{ color: '#666', marginTop: '0.5rem' }}>
          ※ DSN未設定の場合は送信されません（ローカルは .env.local で設定してください）
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <button
            onClick={handleSentryClientTest}
            disabled={loading}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#6f42c1',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            ブラウザ側イベント送信
          </button>
          <button
            onClick={handleSentryServerTest}
            disabled={loading}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#343a40',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            Next.jsサーバ側（Route Handler）送信
          </button>
        </div>
      </section>

      {/* R2画像テスト */}
      <section style={{ marginBottom: '3rem', padding: '1.5rem', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>① R2画像利用テスト</h2>
        
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            画像をアップロード:
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            disabled={loading}
            style={{ marginBottom: '1rem' }}
          />
        </div>

        <div>
          <h3>アップロード済み画像一覧 ({images.length}件)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {images.map((image) => (
              <div key={image.key} style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '0.5rem' }}>
                <img
                  src={image.url}
                  alt={image.key}
                  style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '4px' }}
                />
                <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', wordBreak: 'break-all' }}>
                  {image.key.split('/').pop()}
                </p>
                <p style={{ fontSize: '0.7rem', color: '#666' }}>
                  {(image.size / 1024).toFixed(2)} KB
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Neonデータベーステスト */}
      <section style={{ padding: '1.5rem', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>② Neon利用テスト</h2>
        
        <div style={{ marginBottom: '1rem' }}>
          <button
            onClick={handleInitTable}
            disabled={loading}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            テーブル初期化
          </button>
        </div>

        <form ref={formRef} onSubmit={handleInsertData} style={{ marginBottom: '2rem' }}>
          <h3>データ挿入</h3>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
              名前 (必須):
            </label>
            <input
              type="text"
              name="name"
              required
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
              メッセージ (任意):
            </label>
            <textarea
              name="message"
              rows={3}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            データを挿入
          </button>
        </form>

        <div>
          <h3>データ一覧 ({testData.length}件)</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{ padding: '0.75rem', border: '1px solid #ddd', textAlign: 'left' }}>ID</th>
                <th style={{ padding: '0.75rem', border: '1px solid #ddd', textAlign: 'left' }}>名前</th>
                <th style={{ padding: '0.75rem', border: '1px solid #ddd', textAlign: 'left' }}>メッセージ</th>
                <th style={{ padding: '0.75rem', border: '1px solid #ddd', textAlign: 'left' }}>作成日時</th>
              </tr>
            </thead>
            <tbody>
              {testData.map((item) => (
                <tr key={item.id}>
                  <td style={{ padding: '0.75rem', border: '1px solid #ddd' }}>{item.id}</td>
                  <td style={{ padding: '0.75rem', border: '1px solid #ddd' }}>{item.name}</td>
                  <td style={{ padding: '0.75rem', border: '1px solid #ddd' }}>{item.message || '-'}</td>
                  <td style={{ padding: '0.75rem', border: '1px solid #ddd' }}>
                    {new Date(item.created_at).toLocaleString('ja-JP')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

