import { useState, type InputHTMLAttributes } from 'react';
import styles from './NumberInput.module.css';

interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  label?: string;
  value: number | string;
  onChange: (value: string) => void;
  decimal?: boolean;
}

export default function NumberInput({
  label,
  value,
  onChange,
  decimal = false,
  className = '',
  ...props
}: NumberInputProps) {
  const stringValue = value === '' ? '' : String(value);
  const [isFocused, setIsFocused] = useState(false);
  const [rawValue, setRawValue] = useState<string | null>(null);

  function handleChange(raw: string) {
    let sanitized = raw;

    if (decimal) {
      sanitized = sanitized.replace(/[^0-9,.-]/g, '');

      const hasLeadingMinus = sanitized.startsWith('-');
      sanitized = sanitized.replace(/-/g, '');

      const separatorMatch = sanitized.match(/[,.]/);
      if (separatorMatch) {
        const separator = separatorMatch[0];
        const separatorIndex = sanitized.indexOf(separator);
        const before = sanitized.slice(0, separatorIndex + 1);
        const after = sanitized
          .slice(separatorIndex + 1)
          .replace(/[,.]/g, '');
        sanitized = before + after;
      }

      if (hasLeadingMinus) {
        sanitized = `-${sanitized}`;
      }
    } else {
      sanitized = sanitized.replace(/[^0-9-]/g, '');

      const hasLeadingMinus = sanitized.startsWith('-');
      sanitized = sanitized.replace(/-/g, '');
      if (hasLeadingMinus) {
        sanitized = `-${sanitized}`;
      }
    }

    setRawValue(sanitized);
    onChange(decimal ? sanitized.replace(',', '.') : sanitized);
  }

  return (
    <div className={`${styles.wrapper} ${className}`}>
      {label && <label className={styles.label}>{label}</label>}
      <input
        type="text"
        inputMode={decimal ? 'decimal' : 'numeric'}
        value={isFocused ? (rawValue ?? stringValue) : stringValue}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => {
          setIsFocused(true);
          setRawValue(stringValue);
        }}
        onBlur={() => {
          setIsFocused(false);
          setRawValue(null);
        }}
        className={styles.input}
        {...props}
      />
    </div>
  );
}
