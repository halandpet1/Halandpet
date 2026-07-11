'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ComboboxOption = {
  value: string;
  label: string;
  description?: string;
};

type ComboboxProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  disabled?: boolean;
};

export function Combobox({ value, onValueChange, options, placeholder = 'Pilih opsi', searchPlaceholder = 'Cari...', emptyText = 'Tidak ada opsi', className, disabled }: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter((option) => `${option.label} ${option.description ?? ''}`.toLowerCase().includes(normalized));
  }, [options, query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((option) => option.value === value);

  return (
    <div ref={wrapperRef} className={cn('relative', className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((current) => !current)}
        className="flex h-10 w-full items-center justify-between rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-left text-sm text-slate-100 shadow-sm outline-none transition focus-visible:border-sky-400 focus-visible:ring-2 focus-visible:ring-sky-400/30 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
      >
        <span className={cn('truncate', !selectedOption && 'text-slate-500')}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>

      {open ? (
        <div className="absolute z-20 mt-2 w-full rounded-xl border border-slate-800 bg-slate-900 p-2 shadow-2xl">
          <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-2 py-2">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              aria-label={searchPlaceholder}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
          <ul className="mt-2 max-h-56 space-y-1 overflow-auto" role="listbox" aria-label="Opsi pencarian">
            {filteredOptions.length ? (
              filteredOptions.map((option) => (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={value === option.value}
                    onClick={() => {
                      onValueChange(option.value);
                      setOpen(false);
                      setQuery('');
                    }}
                    className={cn('flex w-full items-start justify-between rounded-lg px-3 py-2 text-left text-sm transition', value === option.value ? 'bg-sky-500/15 text-sky-300' : 'hover:bg-slate-800')}
                  >
                    <span>
                      <span className="block font-medium">{option.label}</span>
                      {option.description ? <span className="mt-0.5 block text-xs text-slate-400">{option.description}</span> : null}
                    </span>
                    {value === option.value ? <Check className="mt-0.5 h-4 w-4" /> : null}
                  </button>
                </li>
              ))
            ) : (
              <li className="px-3 py-2 text-sm text-slate-400">{emptyText}</li>
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
