import { useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Youtube from '@tiptap/extension-youtube'
import { Placeholder } from '@tiptap/extensions'
import { uploadImage, deleteImages } from '../api/uploads'

// The passage content schema, shared with the reader so saved passages render
// exactly as written. Keep in sync with backend/utils/validateContent.js.
export const editorExtensions = [
  StarterKit.configure({
    code: false,
    codeBlock: false,
    link: { openOnClick: false },
  }),
  Image.configure({
    HTMLAttributes: { loading: 'lazy', decoding: 'async' },
  }),
  Youtube.configure({ nocookie: true }),
]

// Converts a plain-text passage (the pre-rich-text format) into an editable document.
export const textToDoc = (text) => {
  const paras = String(text || '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
  const content = paras.map((para) => {
    const parts = []
    para.split('\n').forEach((line, i) => {
      if (i > 0) parts.push({ type: 'hardBreak' })
      if (line) parts.push({ type: 'text', text: line })
    })
    return parts.length ? { type: 'paragraph', content: parts } : { type: 'paragraph' }
  })
  return { type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] }
}

// Walks a Tiptap doc and collects the src of every image node into `into`.
const collectImageUrls = (node, into) => {
  if (!node || typeof node !== 'object') return
  if (node.type === 'image' && node.attrs?.src) into.add(node.attrs.src)
  if (Array.isArray(node.content)) node.content.forEach((child) => collectImageUrls(child, into))
}

export default function RichTextEditor({ initialContent, placeholder, minHeight = '180px', onEditor, onUpdate, controlsRef }) {
  const fileRef = useRef(null)
  const editorRef = useRef(null)
  const stagedRef = useRef([]) // { url, publicId } uploaded during this session
  const settledRef = useRef(false)
  const [uploading, setUploading] = useState(false)
  const [notice, setNotice] = useState('')

  const editor = useEditor({
    extensions: [...editorExtensions, Placeholder.configure({ placeholder: placeholder || '' })],
    content: initialContent || '',
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: { class: 'passage-prose', style: `min-height: ${minHeight}` },
    },
    onUpdate: ({ editor: ed }) => onUpdate?.(ed),
  })

  useEffect(() => {
    if (editor) {
      editorRef.current = editor
      onEditor?.(editor)
    }
  }, [editor, onEditor])

  // Delete any staged upload whose URL isn't in `keepUrls`, and forget it.
  const sweep = (keepUrls) => {
    const remove = stagedRef.current.filter((s) => !keepUrls.has(s.url))
    stagedRef.current = stagedRef.current.filter((s) => keepUrls.has(s.url))
    if (remove.length) deleteImages(remove.map((s) => s.publicId))
  }

  // Let the parent signal intent: discard() when the edit is abandoned (drop
  // every staged upload). Saving needs no call — the unmount sweep below keeps
  // only images that survived into the final document.
  useEffect(() => {
    if (!controlsRef) return
    controlsRef.current = {
      discard: () => {
        settledRef.current = true
        sweep(new Set())
      },
    }
    return () => {
      if (controlsRef) controlsRef.current = null
    }
  }, [controlsRef])

  // On teardown, remove uploads that aren't in the current document — this
  // covers images the author added then deleted, or a passage left unsaved.
  useEffect(() => {
    return () => {
      if (settledRef.current) return
      const keep = new Set()
      try {
        collectImageUrls(editorRef.current?.getJSON(), keep)
      } catch {
        /* if the doc can't be read, keep nothing */
      }
      sweep(keep)
    }
  }, [])

  const pickImage = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !editor) return
    setUploading(true)
    setNotice('')
    try {
      const { url, publicId } = await uploadImage(file)
      editor.chain().focus().setImage({ src: url }).run()
      if (publicId) stagedRef.current.push({ url, publicId })
    } catch (err) {
      setNotice(err.response?.data?.message || err.message || 'The image could not be uploaded.')
    } finally {
      setUploading(false)
    }
  }

  const addVideo = () => {
    const url = window.prompt('Paste a YouTube link')
    if (!url || !editor) return
    const ok = editor.chain().focus().setYoutubeVideo({ src: url.trim() }).run()
    setNotice(ok ? '' : 'That doesn’t look like a YouTube link.')
  }

  if (!editor) return null

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginBottom: '8px', flexWrap: 'wrap' }}>
        <ToolButton title="Bold (Ctrl+B)" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
          <b>B</b>
        </ToolButton>
        <ToolButton title="Italic (Ctrl+I)" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <i>I</i>
        </ToolButton>
        <ToolButton title="Quote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          “ ”
        </ToolButton>
        <ToolButton title="Scene break" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          ···
        </ToolButton>
        <span style={{ width: '1px', height: '14px', background: 'rgba(var(--panel-rgb),var(--pa12))', margin: '0 6px' }} />
        <ToolButton title="Insert image" onClick={() => !uploading && fileRef.current?.click()}>
          {uploading ? 'Uploading…' : 'Image'}
        </ToolButton>
        <ToolButton title="Embed a YouTube video" onClick={addVideo}>
          Video
        </ToolButton>
      </div>

      <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickImage} />

      <div className="rich-input">
        <EditorContent editor={editor} />
      </div>

      {notice && <p style={{ fontSize: '12px', color: 'var(--crimson)', marginTop: '8px' }}>{notice}</p>}
    </div>
  )
}

function ToolButton({ onClick, active, title, children }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        background: active ? 'rgba(var(--gold-rgb),0.12)' : 'none',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        padding: '4px 9px',
        fontSize: '12px',
        letterSpacing: '0.04em',
        fontFamily: 'Georgia, serif',
        color: active ? 'var(--gold)' : 'rgba(var(--text-rgb),var(--ta45))',
        transition: 'color 0.2s ease',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--gold)')}
      onMouseLeave={(e) => (e.currentTarget.style.color = active ? 'var(--gold)' : 'rgba(var(--text-rgb),var(--ta45))')}
    >
      {children}
    </button>
  )
}
