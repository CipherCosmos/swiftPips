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
      <label className="block text-slate-400 text-[10px] font-bold uppercase mb-2 tracking-widest">
        {label}
      </label>
      
      <div 
        className={`relative w-full glass-input rounded-lg flex items-center transition-all ${isOpen ? 'ring-2 ring-emerald-500/50 bg-slate-800/80' : ''}`}
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
      >
        <input
          ref={inputRef}
          type="text"
          className="w-full bg-transparent px-3 py-2 text-sm outline-none text-slate-200 placeholder:text-slate-500 cursor-text"
          placeholder={isOpen ? placeholder : value || placeholder}
          value={isOpen ? searchQuery : value}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          readOnly={!isOpen}
        />
        <div className="absolute right-3 text-slate-500 flex items-center gap-1 pointer-events-none">
          {!isOpen && <span className="text-[10px] font-mono opacity-50 px-1 border border-white/10 rounded hidden sm:inline-block tracking-tighter">Type to Search</span>}
          <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180 text-emerald-400' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-[#0f172a] border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden backdrop-blur-xl">
          <div className="max-h-64 overflow-y-auto premium-scroll">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-500 text-center">No results found</div>
            ) : (
              <ul className="py-1">
                {filteredOptions.map((opt) => (
                  <li
                    key={opt}
                    className={`px-4 py-2 text-sm cursor-pointer transition-colors flex items-center justify-between ${
                      opt === value ? 'bg-emerald-500/20 text-emerald-400 font-bold' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(opt);
                    }}
                  >
                    <span>{opt}</span>
                    {opt === value && (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
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
