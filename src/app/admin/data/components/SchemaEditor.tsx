'use client';
import { useEffect, useId, useRef, useState } from 'react';
import styles from './SchemaEditor.module.css';

const DEFAULT_TEMPLATE = `// Replace the existing map() with your updated mapping.
// It takes an upstream row and returns the canonical shape.
//
// The rest of the schema (classify, incoming, canonical) stays the same;
// schemaVersion will be bumped automatically when you accept this drift.

map(row) {
  return {
    // TODO: your mapping here
  };
}
`;

export function validateSchemaSnippet(src: string): string | null {
  const trimmed = src.trim();
  if (trimmed.length === 0) return 'Snippet is empty.';
  if (!/\bmap\s*\(/.test(trimmed)) return 'Snippet must define a map() function.';
  if (!/\breturn\b/.test(trimmed)) return 'map() should return something.';
  return null;
}

export interface SchemaEditorProps {
  initial?: string;
  onChange: (value: string, error: string | null) => void;
  ariaLabel?: string;
}

export function SchemaEditor({
  initial = DEFAULT_TEMPLATE,
  onChange,
  ariaLabel = 'New schema map() snippet',
}: SchemaEditorProps) {
  const [value, setValue] = useState(initial);
  const errorId = useId();
  const error = validateSchemaSnippet(value);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Notify the parent of the initial snippet + validation state so its
  // submit-button enable/disable state lines up with what the editor
  // already displays. Without this hook the parent has no signal until
  // the user types.
  useEffect(() => {
    onChangeRef.current(initial, validateSchemaSnippet(initial));
    // We deliberately only re-fire when the initial text changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  function update(next: string) {
    setValue(next);
    onChange(next, validateSchemaSnippet(next));
  }

  return (
    <div className={styles.editor} data-schema-editor>
      <textarea
        value={value}
        onChange={(e) => update(e.target.value)}
        className={`${styles.textarea} ${error ? styles.textareaInvalid : ''}`}
        aria-label={ariaLabel}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? errorId : undefined}
        spellCheck={false}
      />
      {error && (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
