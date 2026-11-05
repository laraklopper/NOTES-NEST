import React from 'react'
import '../css/componentCss/NoteEditor.css'
import { useEditor, useEditorState, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TaskList, TaskItem } from '@tiptap/extension-list';
import { Placeholder } from '@tiptap/extensions';
import {
  Bold, Italic, Underline, Strikethrough, Heading1, Heading2,
  List, ListOrdered, ListChecks, Quote, SquareCode, Undo2, Redo2
} from 'lucide-react';
// NoteEditor component
/*TipTap rich text editor for note content
Outputs HTML that the server sanitises (see ALLOWED_HTML in noteSchema.js)*/
export default function NoteEditor({ content, onChange }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: { openOnClick: false } // clicking a link places the cursor instead of leaving the page
      }),
      TaskList,
      TaskItem.configure({ nested: true }), // checklists
      Placeholder.configure({ placeholder: 'NOTE TEXT' })
    ],
    content: content || '',
    onUpdate: ({ editor }) => onChange?.(editor.isEmpty ? '' : editor.getHTML()), // send '' when empty, not '<p></p>'
    editorProps: {
      attributes: {
        id: 'noteTextInput',
        class: 'notesTextArea',
        // ARIA ATTRIBUTES:
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': 'Note text',
        'aria-required': 'true'
      }
    }
  });

  // Re-render the toolbar only when an active state changes
  const state = useEditorState({
    editor,
    selector: ({ editor }) => editor ? {
      bold: editor.isActive('bold'),
      italic: editor.isActive('italic'),
      underline: editor.isActive('underline'),
      strike: editor.isActive('strike'),
      h1: editor.isActive('heading', { level: 1 }),
      h2: editor.isActive('heading', { level: 2 }),
      bulletList: editor.isActive('bulletList'),
      orderedList: editor.isActive('orderedList'),
      taskList: editor.isActive('taskList'),
      blockquote: editor.isActive('blockquote'),
      codeBlock: editor.isActive('codeBlock'),
      canUndo: editor.can().undo(),
      canRedo: editor.can().redo()
    } : null
  });

  if (!editor || !state) return null;

  // Toolbar buttons: [label, icon, active key, command]
  const buttons = [
    ['Bold', Bold, 'bold', () => editor.chain().focus().toggleBold().run()],
    ['Italic', Italic, 'italic', () => editor.chain().focus().toggleItalic().run()],
    ['Underline', Underline, 'underline', () => editor.chain().focus().toggleUnderline().run()],
    ['Strikethrough', Strikethrough, 'strike', () => editor.chain().focus().toggleStrike().run()],
    ['Heading 1', Heading1, 'h1', () => editor.chain().focus().toggleHeading({ level: 1 }).run()],
    ['Heading 2', Heading2, 'h2', () => editor.chain().focus().toggleHeading({ level: 2 }).run()],
    ['Bullet list', List, 'bulletList', () => editor.chain().focus().toggleBulletList().run()],
    ['Numbered list', ListOrdered, 'orderedList', () => editor.chain().focus().toggleOrderedList().run()],
    ['Checklist', ListChecks, 'taskList', () => editor.chain().focus().toggleTaskList().run()],
    ['Quote', Quote, 'blockquote', () => editor.chain().focus().toggleBlockquote().run()],
    ['Code block', SquareCode, 'codeBlock', () => editor.chain().focus().toggleCodeBlock().run()]
  ];

  return (
    <div className='noteEditor'>
      <div className='noteEditorToolbar' role='toolbar' aria-label='Text formatting'>
        {buttons.map(([label, Icon, key, command]) => (
          <button
            key={key}
            type='button'
            className={`noteEditorBtn${state[key] ? ' isActive' : ''}`}
            onClick={command}
            // ARIA ATTRIBUTES:
            aria-label={label}
            aria-pressed={state[key]}
            title={label}
          >
            <Icon size={16} aria-hidden='true' focusable='false' />
          </button>
        ))}
        <div className='vr' />
        <button
          type='button'
          className='noteEditorBtn'
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!state.canUndo}
          aria-label='Undo'
          title='Undo'
        >
          <Undo2 size={16} aria-hidden='true' focusable='false' />
        </button>
        <button
          type='button'
          className='noteEditorBtn'
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!state.canRedo}
          aria-label='Redo'
          title='Redo'
        >
          <Redo2 size={16} aria-hidden='true' focusable='false' />
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
