<!-- RichTextEditor.vue -->
<template>
    <div class="rich-text-editor rounded-xl border border-slate-200 dark:border-dark-border">
      <!-- Editor Menu -->
      <div class="flex flex-wrap gap-1 border-b border-slate-200 dark:border-dark-border px-4 py-2 bg-slate-50 dark:bg-white/5">
        <button
          v-for="item in editorMenuItems"
          :key="item.name"
          @click.prevent="item.action"
          class="p-1 rounded hover:bg-slate-100 dark:hover:bg-boxdark"
          :class="{ 'bg-slate-100 dark:bg-dark-surface text-brand-600': item.isActive && item.isActive() }"
          :title="item.title"
        >
          <component :is="item.icon" class="h-4 w-4" />
        </button>
      </div>
      <!-- Editor Content -->
      <div class="px-4 py-3 min-h-[150px] bg-gray dark:bg-white/5" >
        <editor-content 
          :editor="editor" 
          class="prose dark:prose-invert max-w-none prose-sm focus:outline-none text-slate-800 dark:text-slate-100"
        />
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
  import { Editor, EditorContent } from '@tiptap/vue-3';
  import StarterKit from '@tiptap/starter-kit';
  import Link from '@tiptap/extension-link';
  import Image from '@tiptap/extension-image';
  import Underline from '@tiptap/extension-underline';
  import TextAlign from '@tiptap/extension-text-align';
  import { 
    BoldIcon, 
    ItalicIcon, 
    UnderlineIcon, 
    ListIcon, 
    ListOrderedIcon, 
    LinkIcon, 
    QuoteIcon, 
    CodeIcon,
    ImageIcon,
    RefreshCwIcon,
    AlignLeftIcon,
    AlignCenterIcon,
    AlignRightIcon
  } from 'lucide-vue-next';
  
  const props = defineProps({
    modelValue: {
      type: String,
      default: ''
    },
    placeholder: {
      type: String,
      default: 'Write something...'
    },
    minHeight: {
      type: String,
      default: '150px'
    },
    editable: {
      type: Boolean,
      default: true
    }
  });
  
  const emit = defineEmits(['update:modelValue']);
  
  const editor = ref<Editor | undefined>();
  
  // Editor menu items with icons and actions
  const editorMenuItems = [
    { 
      name: 'bold', 
      title: 'Bold',
      icon: BoldIcon, 
      action: () => editor.value?.chain().focus().toggleBold().run(),
      isActive: () => editor.value?.isActive('bold')
    },
    { 
      name: 'italic', 
      title: 'Italic',
      icon: ItalicIcon, 
      action: () => editor.value?.chain().focus().toggleItalic().run(),
      isActive: () => editor.value?.isActive('italic')
    },
    { 
      name: 'underline', 
      title: 'Underline',
      icon: UnderlineIcon, 
      action: () => editor.value?.chain().focus().toggleUnderline().run(),
      isActive: () => editor.value?.isActive('underline')
    },
    { 
      name: 'align-left', 
      title: 'Align Left',
      icon: AlignLeftIcon, 
      action: () => editor.value?.chain().focus().setTextAlign('left').run(),
      isActive: () => editor.value?.isActive({ textAlign: 'left' })
    },
    { 
      name: 'align-center', 
      title: 'Align Center',
      icon: AlignCenterIcon, 
      action: () => editor.value?.chain().focus().setTextAlign('center').run(),
      isActive: () => editor.value?.isActive({ textAlign: 'center' })
    },
    { 
      name: 'align-right', 
      title: 'Align Right',
      icon: AlignRightIcon, 
      action: () => editor.value?.chain().focus().setTextAlign('right').run(),
      isActive: () => editor.value?.isActive({ textAlign: 'right' })
    },
    { 
      name: 'bullet-list', 
      title: 'Bullet List',
      icon: ListIcon, 
      action: () => editor.value?.chain().focus().toggleBulletList().run(),
      isActive: () => editor.value?.isActive('bulletList')
    },
    { 
      name: 'ordered-list', 
      title: 'Ordered List',
      icon: ListOrderedIcon, 
      action: () => editor.value?.chain().focus().toggleOrderedList().run(),
      isActive: () => editor.value?.isActive('orderedList')
    },
    { 
      name: 'link', 
      title: 'Insert Link',
      icon: LinkIcon, 
      action: () => {
        const url = window.prompt('URL');
        if (url) {
          editor.value?.chain().focus().setLink({ href: url }).run();
        } else if (editor.value?.isActive('link')) {
          editor.value?.chain().focus().unsetLink().run();
        }
      },
      isActive: () => editor.value?.isActive('link')
    },
    { 
      name: 'image', 
      title: 'Insert Image',
      icon: ImageIcon, 
      action: () => {
        const url = window.prompt('Image URL');
        if (url) {
          editor.value?.chain().focus().setImage({ src: url }).run();
        }
      }
    },
    { 
      name: 'quote', 
      title: 'Block Quote',
      icon: QuoteIcon, 
      action: () => editor.value?.chain().focus().toggleBlockquote().run(),
      isActive: () => editor.value?.isActive('blockquote')
    },
    { 
      name: 'code', 
      title: 'Code Block',
      icon: CodeIcon, 
      action: () => editor.value?.chain().focus().toggleCodeBlock().run(),
      isActive: () => editor.value?.isActive('codeBlock')
    },
    { 
      name: 'clear', 
      title: 'Clear Format',
      icon: RefreshCwIcon, 
      action: () => editor.value?.chain().focus().clearNodes().unsetAllMarks().run()
    }
  ];
  
  // Watch for external content changes
  watch(() => props.modelValue, (newValue) => {
    const currentContent = editor.value?.getHTML();
    
    // Only update if content is different to prevent cursor jumping
    if (newValue !== currentContent) {
      editor.value?.commands.setContent(newValue || '');
    }
  });
  
  // Watch for editor changes and emit updates
  const emitUpdate = () => {
    if (editor.value) {
      emit('update:modelValue', editor.value.getHTML());
    }
  };
  
  onMounted(() => {
    // Initialize TipTap editor
    editor.value = new Editor({
      extensions: [
        StarterKit,
        Link.configure({
          openOnClick: false,
          linkOnPaste: true,
        }),
        Image,
        Underline,
            TextAlign.configure({
          types: ['heading', 'paragraph'], // Allows alignment on these nodes
        })
      ],
      content: props.modelValue,
      editable: props.editable,
      editorProps: {
        attributes: {
          class: 'outline-none w-full',
          style: `min-height: ${props.minHeight}`,
        },
      },
      onUpdate: () => {
        emitUpdate();
      },
    });
  });
  
  onBeforeUnmount(() => {
    // Destroy editor to prevent memory leaks
    editor.value?.destroy();
  });
  
  // Public methods that parent components can access
  defineExpose({
    getHTML: () => editor.value?.getHTML(),
    getContent: () => editor.value?.getHTML(),
    setContent: (content: string) => editor.value?.commands.setContent(content),
    clearContent: () => editor.value?.commands.clearContent(),
    focus: () => editor.value?.commands.focus(),
  });
  </script>
  
  <style>
  /* Additional Tiptap editor styles */
  .ProseMirror p.is-editor-empty:first-child::before {
    content: attr(data-placeholder);
    float: left;
    color: #adb5bd;
    pointer-events: none;
    height: 0;
  }
  
  .ProseMirror img {
    max-width: 100%;
    height: auto;
  }
  
  .ProseMirror blockquote {
    border-left: 3px solid #ddd;
    padding-left: 1rem;
    margin-left: 0;
    margin-right: 0;
  }
  
  .ProseMirror code {
    background-color: rgba(97, 97, 97, 0.1);
    border-radius: 3px;
    padding: 0.2em 0.4em;
  }
  </style>