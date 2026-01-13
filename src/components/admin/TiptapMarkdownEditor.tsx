'use client'

import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { Extension } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { marked } from 'marked'
import TurndownService from 'turndown'
import { ImageCropperModal } from '@/components/admin/ImageCropperModal'

type Props = {
  value: string
  onChange: (nextMarkdown: string) => void
  placeholder?: string
  disabled?: boolean
  uploadImage?: (file: File) => Promise<{ url: string }>
}

// Boldボタンは出さず、Ctrl/Cmd+B だけを提供する（選択範囲の太字トグルのみ）
const BoldShortcutSelectionOnly = Extension.create({
  name: 'boldShortcutSelectionOnly',
  addKeyboardShortcuts() {
    return {
      'Mod-b': () => {
        const ed: any = this.editor
        if (!ed) return false
        const sel: any = ed.state?.selection
        if (!sel || sel.empty) {
          ed.chain().focus().run()
          return true
        }
        ed.chain().focus().toggleBold().run()
        // 次に入力する文字へ太字を持ち越さない（storedMarksを使わない）ことで安定化
        ed.view?.dispatch(ed.state.tr.setStoredMarks(null))
        return true
      },
    }
  },
})

function buildTurndown() {
  const td = new TurndownService({
    headingStyle: 'atx',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
    strongDelimiter: '**',
  })
  td.addRule('hr-to-markdown', {
    filter: (node: Node) => (node as any)?.nodeName === 'HR',
    replacement: () => `\n\n---\n\n`,
  })
  td.addRule('img-to-markdown', {
    filter: (node: Node) => (node as any)?.nodeName === 'IMG',
    replacement: (_content: string, node: Node) => {
      const el = node as HTMLImageElement
      const src = el.getAttribute('src') || ''
      if (!src) return ''
      return `![](${src})`
    },
  })
  return td
}

export function TiptapMarkdownEditor({ value, onChange, placeholder, disabled, uploadImage }: Props) {
  const lastApplied = useRef<string | null>(null)
  const isApplyingExternalValue = useRef(false)
  const turndown = useMemo(() => buildTurndown(), [])
  const [busyUpload, setBusyUpload] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [imgCropOpen, setImgCropOpen] = useState(false)
  const [imgCropSrc, setImgCropSrc] = useState<string | null>(null)

  // ツールバーのボタンがフォーカスを奪うと、入力キーが「フォーカス中のボタンを押す」扱いになり
  // 斜体などが勝手に切り替わることがある。クリックしてもボタンにフォーカスさせない。
  const keepEditorFocus = (e: MouseEvent) => {
    e.preventDefault()
  }

  // ProseMirrorの「次に入力する文字に効くマーク状態（storedMarks）」が残ると、
  // クリック/入力のたびにB状態が揺れて事故りやすい。
  // ここでは「太字/斜体は“選択範囲にだけ適用”」の挙動に寄せ、storedMarksは常にクリアする。
  const clearStoredMarks = (view: any) => {
    if (!view) return
    if (isApplyingExternalValue.current) return
    const state: any = view.state
    const stored: any[] | null | undefined = state?.storedMarks
    if (!stored || stored.length === 0) return
    view.dispatch(state.tr.setStoredMarks(null))
  }

  const editor = useEditor({
    // Next.js(App Router)環境ではSSR/プリレンダー検出でhydration mismatch警告になることがあるため明示する
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit,
      BoldShortcutSelectionOnly,
      Image.configure({ inline: false, allowBase64: false }),
      Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
      Placeholder.configure({ placeholder: placeholder || 'ここに本文を書きます…' }),
    ],
    content: '',
    onCreate: ({ editor }) => {
      // 初期状態で太字などのマークが「入力中の状態（storedMarks）」として残っていると、
      // ツールバー上で B がONに見えることがあるため、必ずクリアする（本文の既存装飾は変えない）
      editor.view.dispatch(editor.state.tr.setStoredMarks(null))
    },
    onUpdate: ({ editor }) => {
      // 自分自身の入力で value が更新されても、それを即 setContent で再適用すると
      // 選択状態/マークが不安定になりやすいので、直近値として記録して外部反映を抑制する
      const html = editor.getHTML()
      const md = turndown.turndown(html).trim()
      lastApplied.current = md
      onChange(md)
    },
    onSelectionUpdate: ({ editor }) => {
      // selection変化時にも、次入力用のマーク状態は常に捨てる（選択範囲にだけ適用させる）
      clearStoredMarks(editor.view as any)
    },
    editorProps: {
      handleTextInput: (view, _from, _to, _text) => {
        // 入力直前にも storedMarks を必ず落として、交互太字を防ぐ
        clearStoredMarks(view as any)
        return false
      },
      handleDOMEvents: {
        focus: (view, _event) => {
          requestAnimationFrame(() => {
            try {
              clearStoredMarks(view as any)
            } catch {
              // noop
            }
          })
          return false
        },
      },
    },
  })

  // Apply external markdown -> editor content (tab switches / initial load)
  useEffect(() => {
    if (!editor) return
    const current = typeof value === 'string' ? value : ''
    if (lastApplied.current === current) return
    lastApplied.current = current

    // NOTE: Markdownの単一改行も <br> として表示したい（プレビュー反映の安定化）
    const parsed = marked.parse(current || '', { breaks: true } as any)
    if (typeof parsed === 'string') {
      isApplyingExternalValue.current = true
      editor.commands.setContent(parsed, { emitUpdate: false })
      editor.view.dispatch(editor.state.tr.setStoredMarks(null))
      isApplyingExternalValue.current = false
      return
    }
    // marked.parse が Promise を返す型定義の場合もあるため、非同期でも安全に反映する
    void (parsed as Promise<string>).then((html) => {
      if (!editor) return
      // 反映対象が変わっていたら無視（タブ切替など）
      if (lastApplied.current !== current) return
      isApplyingExternalValue.current = true
      editor.commands.setContent(html, { emitUpdate: false })
      editor.view.dispatch(editor.state.tr.setStoredMarks(null))
      isApplyingExternalValue.current = false
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, value])

  const runUpload = async (file: File) => {
    if (!uploadImage) return
    setBusyUpload(true)
    try {
      const { url } = await uploadImage(file)
      editor?.chain().focus().setImage({ src: url, alt: '' }).run()
    } finally {
      setBusyUpload(false)
    }
  }

  return (
    <div
      className="tiptapWrap"
      style={{
        border: '1px solid #ced4da',
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#fff',
        maxWidth: 700,
        width: '100%',
        margin: 0,
      }}
    >
      <style jsx>{`
        .tiptapWrap :global(.ProseMirror) {
          outline: none;
          font-size: 16px;
        }
        .tiptapWrap :global(.ProseMirror p) {
          margin: 0.5rem 0;
        }
        .tiptapWrap :global(.ProseMirror h1),
        .tiptapWrap :global(.ProseMirror h2),
        .tiptapWrap :global(.ProseMirror h3) {
          margin: 22px 0 10px;
          line-height: 1.25;
          letter-spacing: -0.01em;
        }
        .tiptapWrap :global(.ProseMirror h2) {
          font-size: 1.25em;
          padding-bottom: 6px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.10);
        }
        .tiptapWrap :global(.ProseMirror h3) {
          font-size: 1.12em;
        }
        .tiptapWrap :global(.ProseMirror hr) {
          border: 0;
          border-top: 1px dotted rgba(0, 0, 0, 0.14);
          margin: 18px 0;
        }
        .tiptapWrap :global(.ProseMirror ul),
        .tiptapWrap :global(.ProseMirror ol) {
          padding-left: 1.5rem;
          margin: 0.5rem 0;
          /* マーカー（・/1.）で改行されないように outside を基本にする */
          list-style-position: outside;
        }
        .tiptapWrap :global(.ProseMirror ul) {
          list-style-type: disc;
        }
        .tiptapWrap :global(.ProseMirror ol) {
          list-style-type: decimal;
        }
        .tiptapWrap :global(.ProseMirror li) {
          margin: 0.2rem 0;
        }
        .tiptapWrap :global(.ProseMirror li::marker) {
          white-space: nowrap;
        }
        .tiptapWrap :global(.ProseMirror blockquote) {
          margin: 0.75rem 0;
          padding: 0.5rem 0.75rem;
          border-left: 4px solid #ced4da;
          background: #f8f9fa;
          color: #495057;
        }
        .tiptapWrap :global(.ProseMirror pre) {
          margin: 0.75rem 0;
          padding: 0.75rem 0.9rem;
          border-radius: 8px;
          background: #f1f3f5;
          overflow-x: auto;
        }
        .tiptapWrap :global(.ProseMirror code) {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 0.92em;
        }
        .tiptapWrap :global(.ProseMirror pre code) {
          display: block;
          white-space: pre;
        }
        .tiptapWrap :global(.ProseMirror img) {
          display: block;
          width: 100%;
          max-width: 100%;
          height: auto;
          margin: 0.75rem 0;
          border-radius: 8px;
        }
      `}</style>
      <ImageCropperModal
        open={imgCropOpen}
        imageSrc={imgCropSrc}
        maxWidth={1200}
        title="本文画像をクロップ/縮小（最大横幅1200px）"
        onClose={() => {
          setImgCropOpen(false)
          setImgCropSrc(null)
        }}
        onApply={async (file) => {
          await runUpload(file)
        }}
      />
      <div
        style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          alignItems: 'center',
          padding: '10px 12px',
          backgroundColor: '#f8f9fa',
          borderBottom: '1px solid #dee2e6',
        }}
      >
        {/* 左端のダミー: 誤タップ/誤クリックされても何もしない */}
        <button
          type="button"
          disabled
          tabIndex={-1}
          aria-hidden="true"
          style={{
            padding: '6px 10px',
            borderRadius: 6,
            border: '1px solid transparent',
            backgroundColor: 'transparent',
            color: 'transparent',
            cursor: 'default',
            userSelect: 'none',
          }}
          title=""
        >
          _
        </button>
        <button
          type="button"
          onClick={() => {
            if (!editor) return
            // 太字は選択範囲にだけ適用（入力モードにしない）
            if ((editor.state as any)?.selection?.empty) {
              editor.chain().focus().run()
              return
            }
            editor.chain().focus().toggleBold().run()
            editor.view.dispatch((editor.state as any).tr.setStoredMarks(null))
          }}
          onMouseDown={keepEditorFocus}
          tabIndex={-1}
          disabled={!editor || disabled}
          style={{
            padding: '6px 10px',
            borderRadius: 6,
            border: '1px solid #ced4da',
            backgroundColor: editor?.isActive('bold') ? '#007bff' : '#fff',
            color: editor?.isActive('bold') ? '#fff' : '#212529',
            fontWeight: 700,
            cursor: 'pointer',
          }}
          title="太字（Bold）"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => {
            if (!editor) return
            if ((editor.state as any)?.selection?.empty) {
              editor.chain().focus().run()
              return
            }
            editor.chain().focus().toggleItalic().run()
            editor.view.dispatch((editor.state as any).tr.setStoredMarks(null))
          }}
          onMouseDown={keepEditorFocus}
          tabIndex={-1}
          disabled={!editor || disabled}
          style={{
            padding: '6px 10px',
            borderRadius: 6,
            border: '1px solid #ced4da',
            backgroundColor: editor?.isActive('italic') ? '#007bff' : '#fff',
            color: editor?.isActive('italic') ? '#fff' : '#212529',
            fontStyle: 'italic',
            cursor: 'pointer',
          }}
          title="斜体（I）は選択範囲にだけ適用します（入力モードにはしません）"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          onMouseDown={keepEditorFocus}
          tabIndex={-1}
          disabled={!editor || disabled}
          style={{
            padding: '6px 10px',
            borderRadius: 6,
            border: '1px solid #ced4da',
            backgroundColor: editor?.isActive('bulletList') ? '#007bff' : '#fff',
            color: editor?.isActive('bulletList') ? '#fff' : '#212529',
            cursor: 'pointer',
          }}
        >
          ・
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          onMouseDown={keepEditorFocus}
          tabIndex={-1}
          disabled={!editor || disabled}
          style={{
            padding: '6px 10px',
            borderRadius: 6,
            border: '1px solid #ced4da',
            backgroundColor: editor?.isActive('orderedList') ? '#007bff' : '#fff',
            color: editor?.isActive('orderedList') ? '#fff' : '#212529',
            cursor: 'pointer',
          }}
        >
          1.
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          onMouseDown={keepEditorFocus}
          tabIndex={-1}
          disabled={!editor || disabled}
          style={{
            padding: '6px 10px',
            borderRadius: 6,
            border: '1px solid #ced4da',
            backgroundColor: editor?.isActive('heading', { level: 2 }) ? '#007bff' : '#fff',
            color: editor?.isActive('heading', { level: 2 }) ? '#fff' : '#212529',
            cursor: 'pointer',
          }}
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
          onMouseDown={keepEditorFocus}
          tabIndex={-1}
          disabled={!editor || disabled}
          style={{
            padding: '6px 10px',
            borderRadius: 6,
            border: '1px solid #ced4da',
            backgroundColor: editor?.isActive('heading', { level: 3 }) ? '#007bff' : '#fff',
            color: editor?.isActive('heading', { level: 3 }) ? '#fff' : '#212529',
            cursor: 'pointer',
          }}
        >
          H3
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().setHorizontalRule().run()}
          onMouseDown={keepEditorFocus}
          tabIndex={-1}
          disabled={!editor || disabled}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            border: '1px solid #ced4da',
            backgroundColor: '#fff',
            color: '#212529',
            cursor: 'pointer',
            fontWeight: 800,
            letterSpacing: '0.02em',
          }}
          title="区切り線（hr）を挿入します"
        >
          hr
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          onMouseDown={keepEditorFocus}
          tabIndex={-1}
          disabled={!editor || disabled}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            border: '1px solid #ced4da',
            backgroundColor: editor?.isActive('blockquote') ? '#007bff' : '#fff',
            color: editor?.isActive('blockquote') ? '#fff' : '#212529',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          引用
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
          onMouseDown={keepEditorFocus}
          tabIndex={-1}
          disabled={!editor || disabled}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            border: '1px solid #ced4da',
            backgroundColor: editor?.isActive('codeBlock') ? '#007bff' : '#fff',
            color: editor?.isActive('codeBlock') ? '#fff' : '#212529',
            cursor: 'pointer',
            fontWeight: 600,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          }}
        >
          ``` 
        </button>

        <span style={{ width: 1, height: 24, backgroundColor: '#dee2e6', margin: '0 4px' }} />

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (!f) return
            const reader = new FileReader()
            reader.onload = () => {
              const dataUrl = String(reader.result || '')
              setImgCropSrc(dataUrl)
              setImgCropOpen(true)
            }
            reader.readAsDataURL(f)
            e.currentTarget.value = ''
          }}
        />
        <button
          type="button"
          disabled={!uploadImage || disabled || busyUpload}
          onClick={() => fileInputRef.current?.click()}
          onMouseDown={keepEditorFocus}
          tabIndex={-1}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            border: '1px solid #ced4da',
            backgroundColor: '#fff',
            color: '#212529',
            cursor: uploadImage && !busyUpload ? 'pointer' : 'not-allowed',
            fontWeight: 600,
          }}
          title="画像をクロップ/縮小（最大横幅1200px）してR2へアップロードし、本文へ挿入します"
        >
          {busyUpload ? '画像アップロード中…' : '画像（クロップ→R2）'}
        </button>

        <button
          type="button"
          disabled={!editor || disabled}
          onClick={() => {
            const prev = editor?.getAttributes('link')?.href || ''
            const href = window.prompt('リンクURLを入力してください', prev)
            if (!href) {
              editor?.chain().focus().unsetLink().run()
              return
            }
            editor?.chain().focus().setLink({ href }).run()
          }}
          onMouseDown={keepEditorFocus}
          tabIndex={-1}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            border: '1px solid #ced4da',
            backgroundColor: editor?.isActive('link') ? '#007bff' : '#fff',
            color: editor?.isActive('link') ? '#fff' : '#212529',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          リンク
        </button>
      </div>

      <div style={{ padding: '12px 12px 16px' }}>
        <div
          style={{
            maxWidth: 700,
            width: '100%',
            margin: 0,
            minHeight: 320,
            lineHeight: 1.7,
            fontSize: '0.95rem',
            color: '#212529',
          }}
        >
          <EditorContent editor={editor} />
        </div>
        <div style={{ marginTop: 10, color: '#6c757d', fontSize: '0.85rem' }}>
          保存形式: Markdown（body_md）。画像はR2のURLのみを埋め込みます。
        </div>
      </div>
    </div>
  )
}


