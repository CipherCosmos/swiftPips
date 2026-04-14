import { useState, useRef, useEffect, useMemo } from 'react';

interface SearchableComboboxProps {
  label: string;
  options: string[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  autoFocusRef?: React.MutableRefObject<HTMLInputElement | null>;
}

export function SearchableCombobox({
  label,
  options,
  value,
  onChange,
  placeholder = "Search...",
  autoFocusRef
}: SearchableComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Link external ref if provided
  useEffect(() => {
    if (autoFocusRef) {
      autoFocusRef.current = inputRef.current;
    }
  }, [autoFocusRef]);

  // Handle outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter options based on search
  const filteredOptions = useMemo(() => {
    if (!searchQuery) return options;
    const lowerQuery = searchQuery.toLowerCase();
    return options.filter(opt => opt.toLowerCase().includes(lowerQuery));
  }, [options, searchQuery]);

  // Handle selection
  const handleSelect = (opt: string) => {
    onChange(opt);
    setSearchQuery("");
    setIsOpen(false);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    } else if (e.key === "Enter" && filteredOptions.length > 0) {
      handleSelect(filteredOptions[0]);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-[var(--text-muted)] text-[11px] font-semibold uppercase tracking-widest mb-1.5">
        {label}
      </label>

      <div
        className={`relative sp-input rounded-lg flex items-center cursor-text transition-colors ${isOpen ? 'border-[var(--cyan-500)]' : ''}`}
        onClick={() => { setIsOpen(true); inputRef.current?.focus(); }}
      >
        <input
          ref={inputRef}
          type="text"
          className="w-full bg-transparent px-3 py-2 text-sm outline-none text-[var(--text-primary)] placeholder:text-[var(--text-faint)]"
          placeholder={isOpen ? placeholder : value || placeholder}
          value={isOpen ? searchQuery : value}
          onChange={(e) => { setSearchQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          readOnly={!isOpen}
        />
        <div className="absolute right-3 flex items-center gap-1 pointer-events-none">
          <svg className={`w-3.5 h-3.5 transition-transform text-[var(--text-muted)] ${isOpen ? 'rotate-180 !text-[var(--cyan-400)]' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-[var(--bg-raised)] border border-[var(--border-md)] rounded-lg shadow-2xl shadow-black/60 overflow-hidden">
          <div className="max-h-60 overflow-y-auto premium-scroll">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-[var(--text-muted)] text-center">No results</div>
            ) : (
              <ul className="py-1">
                {filteredOptions.map((opt) => (
                  <li
                    key={opt}
                    className={`px-4 py-2 text-sm cursor-pointer transition-colors flex items-center justify-between ${
                      opt === value
                        ? 'bg-[var(--cyan-dim)] text-[var(--cyan-400)] font-semibold'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]'
                    }`}
                    onClick={(e) => { e.stopPropagation(); handleSelect(opt); }}
                  >
                    <span>{opt}</span>
                    {opt === value && (
                      <svg className="w-3.5 h-3.5 text-[var(--cyan-400)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
