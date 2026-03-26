import type { InputHTMLAttributes } from 'react';
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
  return (
    <div className={`${styles.wrapper} ${className}`}>
      {label && <label className={styles.label}>{label}</label>}
      <input
        type="number"
        inputMode={decimal ? 'decimal' : 'numeric'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={styles.input}
        {...props}
      />
    </div>
  );
}
