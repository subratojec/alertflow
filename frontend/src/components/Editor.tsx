import React, { useRef, useEffect } from 'react';
import MonacoEditor from '@monaco-editor/react';

interface EditorProps {
  value: string;
  onChange: (val: string) => void;
  errors: any[];
  jumpTarget?: string | null;
  theme?: string;
}

const Editor: React.FC<EditorProps> = ({ value, onChange, jumpTarget, theme = 'dark' }) => {
  const editorRef = useRef<any>(null);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  useEffect(() => {
    if (jumpTarget && editorRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        // Look for the target string in the YAML
        const matches = model.findMatches(jumpTarget, false, false, false, null, true);
        if (matches && matches.length > 0) {
           editorRef.current.revealLineInCenter(matches[0].range.startLineNumber);
           editorRef.current.setSelection(matches[0].range);
           editorRef.current.focus();
        }
      }
    }
  }, [jumpTarget]);

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <MonacoEditor
        height="100%"
        language="yaml"
        theme={theme === 'dark' ? 'vs-dark' : 'light'}
        value={value}
        onChange={(val) => onChange(val || '')}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: true },
          fontSize: 14,
          fontFamily: 'var(--font-mono)',
          wordWrap: 'on',
          scrollBeyondLastLine: false,
        }}
      />
    </div>
  );
};

export default Editor;
