'use client';

import { useState, useEffect } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

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

  // 画像アップロード
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch(`${API_BASE_URL}/api/images/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        setMessage('画像をアップロードしました');
        fetchImages();
      } else {
        setMessage('アップロードに失敗しました');
      }
    } catch (error) {
      console.error('アップロードエラー:', error);
      setMessage('アップロードに失敗しました');
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
      }
    } catch (error) {
      console.error('テーブル作成エラー:', error);
      setMessage('テーブル作成に失敗しました');
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
        e.currentTarget.reset();
      } else {
        setMessage('データ挿入に失敗しました');
      }
    } catch (error) {
      console.error('データ挿入エラー:', error);
      setMessage('データ挿入に失敗しました');
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
      <h1>基礎構築テスト</h1>

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

        <form onSubmit={handleInsertData} style={{ marginBottom: '2rem' }}>
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

