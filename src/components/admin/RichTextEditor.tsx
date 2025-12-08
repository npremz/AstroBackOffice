import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { useState, useEffect } from 'react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code as CodeIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Link as LinkIcon,
  Code2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Eye,
  FileCode
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({ value, onChange, placeholder }: Props) {
  const [showHtmlView, setShowHtmlView] = useState(false);
  const [htmlCode, setHtmlCode] = useState('');
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline',
        },
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none min-h-[200px] max-w-none p-4',
      },
    },
  });

  // Sync external value changes to editor
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '');
    }
  }, [value, editor]);

  // Update HTML code when toggling view
  useEffect(() => {
    if (showHtmlView && editor) {
      setHtmlCode(editor.getHTML());
    }
  }, [showHtmlView, editor]);

  if (!editor) {
    return null;
  }

  const handleHtmlCodeChange = (newCode: string) => {
    setHtmlCode(newCode);
  };

  const applyHtmlCode = () => {
    editor.commands.setContent(htmlCode);
    onChange(htmlCode);
    setShowHtmlView(false);
  };

  const setLink = () => {
    if (linkUrl === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      setLinkDialogOpen(false);
      setLinkUrl('');
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
    setLinkDialogOpen(false);
    setLinkUrl('');
  };

  const openLinkDialog = () => {
    const previousUrl = editor.getAttributes('link').href;
    setLinkUrl(previousUrl || '');
    setLinkDialogOpen(true);
  };

  const MenuButton = ({
    onClick,
    isActive = false,
    disabled = false,
    children,
    title
  }: {
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={`h-8 w-8 p-0 ${isActive ? 'bg-accent text-accent-foreground' : ''}`}
      title={title}
    >
      {children}
    </Button>
  );

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-background">
      {/* Toolbar */}
      <div className="border-b border-border bg-muted/30 p-2 flex flex-wrap gap-1">
        {/* Text formatting */}
        <div className="flex gap-1 border-r border-border pr-2">
          <MenuButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            title="Bold (Ctrl+B)"
          >
            <Bold className="h-4 w-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            title="Italic (Ctrl+I)"
          >
            <Italic className="h-4 w-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive('underline')}
            title="Underline (Ctrl+U)"
          >
            <UnderlineIcon className="h-4 w-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive('strike')}
            title="Strikethrough"
          >
            <Strikethrough className="h-4 w-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            isActive={editor.isActive('code')}
            title="Inline Code"
          >
            <CodeIcon className="h-4 w-4" />
          </MenuButton>
        </div>

        {/* Headings */}
        <div className="flex gap-1 border-r border-border pr-2">
          <MenuButton
            onClick={() => editor.chain().focus().setParagraph().run()}
            isActive={editor.isActive('paragraph')}
            title="Paragraph"
          >
            <span className="text-xs font-semibold">P</span>
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            isActive={editor.isActive('heading', { level: 1 })}
            title="Heading 1"
          >
            <Heading1 className="h-4 w-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive('heading', { level: 2 })}
            title="Heading 2"
          >
            <Heading2 className="h-4 w-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive('heading', { level: 3 })}
            title="Heading 3"
          >
            <Heading3 className="h-4 w-4" />
          </MenuButton>
        </div>

        {/* Lists */}
        <div className="flex gap-1 border-r border-border pr-2">
          <MenuButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            title="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            isActive={editor.isActive('codeBlock')}
            title="Code Block"
          >
            <Code2 className="h-4 w-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive('blockquote')}
            title="Quote"
          >
            <Quote className="h-4 w-4" />
          </MenuButton>
        </div>

        {/* Alignment */}
        <div className="flex gap-1 border-r border-border pr-2">
          <MenuButton
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            isActive={editor.isActive({ textAlign: 'left' })}
            title="Align Left"
          >
            <AlignLeft className="h-4 w-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            isActive={editor.isActive({ textAlign: 'center' })}
            title="Align Center"
          >
            <AlignCenter className="h-4 w-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            isActive={editor.isActive({ textAlign: 'right' })}
            title="Align Right"
          >
            <AlignRight className="h-4 w-4" />
          </MenuButton>
        </div>

        {/* Link */}
        <div className="flex gap-1 border-r border-border pr-2">
          <MenuButton
            onClick={openLinkDialog}
            isActive={editor.isActive('link')}
            title="Insert Link"
          >
            <LinkIcon className="h-4 w-4" />
          </MenuButton>
        </div>

        {/* Undo/Redo */}
        <div className="flex gap-1 border-r border-border pr-2">
          <MenuButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo (Ctrl+Z)"
          >
            <Undo className="h-4 w-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo (Ctrl+Y)"
          >
            <Redo className="h-4 w-4" />
          </MenuButton>
        </div>

        {/* Toggle HTML View */}
        <div className="flex gap-1 ml-auto">
          <MenuButton
            onClick={() => setShowHtmlView(!showHtmlView)}
            isActive={showHtmlView}
            title={showHtmlView ? "Visual Editor" : "HTML Code"}
          >
            {showHtmlView ? <Eye className="h-4 w-4" /> : <FileCode className="h-4 w-4" />}
          </MenuButton>
        </div>
      </div>

      {/* Editor Content */}
      <div className="bg-background">
        {showHtmlView ? (
          <div className="p-4">
            <Textarea
              value={htmlCode}
              onChange={(e) => handleHtmlCodeChange(e.target.value)}
              className="font-mono text-sm min-h-[300px]"
              placeholder="<p>HTML code...</p>"
            />
            <div className="flex justify-end gap-2 mt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowHtmlView(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={applyHtmlCode}
              >
                Apply Changes
              </Button>
            </div>
          </div>
        ) : (
          <EditorContent editor={editor} />
        )}
      </div>

      {/* Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert Link</DialogTitle>
            <DialogDescription>
              Enter the URL you want to link to
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="link-url">URL</Label>
              <Input
                id="link-url"
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    setLink();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setLinkDialogOpen(false);
                setLinkUrl('');
              }}
            >
              Cancel
            </Button>
            <Button type="button" onClick={setLink}>
              {linkUrl ? 'Set Link' : 'Remove Link'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
