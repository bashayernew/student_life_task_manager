// components/ui/Select.jsx - Shadcn style Select
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search, X } from 'lucide-react';
import { cn } from '../../utils/cn';
import Button from './Button';
import Input from './Input';

const Select = React.forwardRef(({
    className,
    options = [],
    value,
    defaultValue,
    placeholder = 'Select an option',
    multiple = false,
    disabled = false,
    required = false,
    label,
    description,
    error,
    searchable = false,
    clearable = false,
    loading = false,
    id,
    name,
    onChange,
    onOpenChange,
    ...props
}, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [dropdownStyle, setDropdownStyle] = useState({});
    const containerRef = useRef(null);
    const triggerRef = useRef(null);

    const selectId = id || `select-${Math.random()?.toString(36)?.substr(2, 9)}`;

    const filteredOptions = searchable && searchTerm
        ? options?.filter(option =>
            option?.label?.toLowerCase()?.includes(searchTerm?.toLowerCase()) ||
            (option?.value && option?.value?.toString()?.toLowerCase()?.includes(searchTerm?.toLowerCase()))
        )
        : options;

    const getSelectedDisplay = () => {
        if (multiple) {
            const selectedValues = Array.isArray(value) ? value : [];
            if (selectedValues.length === 0) return placeholder;

            const selectedOptions = options?.filter((opt) =>
                selectedValues.some((selected) => String(selected) === String(opt?.value))
            ) || [];

            if (selectedOptions.length === 1) return selectedOptions[0]?.label;
            if (selectedOptions.length > 1) {
                return selectedOptions.map((opt) => opt.label).join(', ');
            }
            return `${selectedValues.length} selected`;
        }

        if (value === undefined || value === null || value === '') return placeholder;

        const selectedOption = options?.find((opt) => String(opt?.value) === String(value));
        return selectedOption ? selectedOption?.label : placeholder;
    };

    const closeDropdown = () => {
        setIsOpen(false);
        onOpenChange?.(false);
        setSearchTerm('');
    };

    const openDropdown = () => {
        setIsOpen(true);
        onOpenChange?.(true);
    };

    const handleToggle = () => {
        if (disabled) return;
        if (isOpen) {
            closeDropdown();
        } else {
            openDropdown();
        }
    };

    const updateDropdownPosition = () => {
        const el = triggerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const maxHeight = 240;
        const spaceBelow = window.innerHeight - rect.bottom;
        const openUpward = spaceBelow < maxHeight && rect.top > spaceBelow;

        setDropdownStyle({
            position: 'fixed',
            left: rect.left,
            width: rect.width,
            zIndex: 9999,
            ...(openUpward
                ? { bottom: window.innerHeight - rect.top + 4 }
                : { top: rect.bottom + 4 }),
        });
    };

    useEffect(() => {
        if (!isOpen) return undefined;

        updateDropdownPosition();
        const onScrollOrResize = () => updateDropdownPosition();
        window.addEventListener('scroll', onScrollOrResize, true);
        window.addEventListener('resize', onScrollOrResize);

        return () => {
            window.removeEventListener('scroll', onScrollOrResize, true);
            window.removeEventListener('resize', onScrollOrResize);
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return undefined;

        const handleClickOutside = (event) => {
            const target = event.target;
            if (
                containerRef.current?.contains(target) ||
                target.closest?.('[data-select-dropdown]')
            ) {
                return;
            }
            closeDropdown();
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleOptionSelect = (option) => {
        if (multiple) {
            const newValue = Array.isArray(value) ? value : [];
            const optionValue = option?.value ?? option;
            const optionKey = String(optionValue);
            const updatedValue = newValue.some((entry) => String(entry) === optionKey)
                ? newValue.filter((entry) => String(entry) !== optionKey)
                : [...newValue, optionValue];
            onChange?.(updatedValue);
            setSearchTerm('');
            return;
        }

        const optionValue = option?.value ?? option;
        onChange?.(optionValue);
        closeDropdown();
    };

    const handleClear = (e) => {
        e?.stopPropagation();
        onChange?.(multiple ? [] : '');
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e?.target?.value);
    };

    const isSelected = (optionValue) => {
        if (multiple) {
            const selectedValues = Array.isArray(value) ? value : [];
            return selectedValues.some((entry) => String(entry) === String(optionValue));
        }
        return String(value) === String(optionValue);
    };

    const hasValue = multiple
        ? Array.isArray(value) && value.length > 0
        : value !== undefined && value !== null && value !== '';

    const dropdownPanel = isOpen ? (
        <div
            data-select-dropdown
            style={dropdownStyle}
            className="bg-popover text-popover-foreground border border-border rounded-md shadow-lg"
        >
            {searchable && (
                <div className="p-2 border-b border-border">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search options..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                            className="pl-8 bg-background border-border text-foreground"
                        />
                    </div>
                </div>
            )}

            <div className="py-1 max-h-60 overflow-auto">
                {filteredOptions?.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                        {searchTerm ? 'No options found' : 'No options available'}
                    </div>
                ) : (
                    filteredOptions?.map((option) => (
                        <div
                            key={option?.value}
                            role="button"
                            tabIndex={0}
                            className={cn(
                                'relative flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none hover:bg-muted',
                                isSelected(option?.value) && 'bg-primary text-primary-foreground',
                                option?.disabled && 'pointer-events-none opacity-50'
                            )}
                            onClick={() => !option?.disabled && handleOptionSelect(option)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    if (!option?.disabled) handleOptionSelect(option);
                                }
                            }}
                        >
                            <span className="flex-1">{option?.label}</span>
                            {multiple && isSelected(option?.value) && (
                                <Check className="h-4 w-4 shrink-0" />
                            )}
                            {option?.description && (
                                <span className="text-xs text-muted-foreground ml-2">
                                    {option?.description}
                                </span>
                            )}
                        </div>
                    ))
                )}
            </div>

            {multiple && (
                <div className="border-t border-border p-2 flex justify-end">
                    <Button type="button" size="sm" onClick={closeDropdown}>
                        Done
                    </Button>
                </div>
            )}
        </div>
    ) : null;

    return (
        <div ref={containerRef} className={cn('relative', className)}>
            {label && (
                <label
                    htmlFor={selectId}
                    className={cn(
                        'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2 block',
                        error ? 'text-error' : 'text-muted-foreground'
                    )}
                >
                    {label}
                    {required && <span className="text-error ml-1">*</span>}
                </label>
            )}
            <div className="relative">
                <div
                    ref={(node) => {
                        triggerRef.current = node;
                        if (typeof ref === 'function') ref(node);
                        else if (ref) ref.current = node;
                    }}
                    id={selectId}
                    role="button"
                    tabIndex={0}
                    className={cn(
                        'flex min-h-10 w-full items-center justify-between rounded-md border border-input bg-background text-foreground px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer',
                        disabled && 'cursor-not-allowed opacity-50',
                        error && 'border-red-500 focus:ring-red-500',
                        !hasValue && 'text-muted-foreground'
                    )}
                    onClick={disabled ? undefined : handleToggle}
                    onKeyDown={(e) => {
                        if (disabled) return;
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleToggle();
                        }
                    }}
                    aria-expanded={isOpen}
                    aria-haspopup="listbox"
                    aria-disabled={disabled}
                    {...props}
                >
                    <span className="truncate text-left">{getSelectedDisplay()}</span>

                    <div className="flex items-center gap-1 shrink-0 ml-2">
                        {loading && (
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                        )}

                        {clearable && hasValue && !loading && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleClear(e);
                                }}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        )}

                        <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
                    </div>
                </div>

                <select
                    name={name}
                    value={multiple ? undefined : (value || '')}
                    onChange={() => {}}
                    className="sr-only"
                    tabIndex={-1}
                    multiple={multiple}
                    required={required}
                >
                    <option value="">Select...</option>
                    {options?.map(option => (
                        <option key={option?.value} value={option?.value}>
                            {option?.label}
                        </option>
                    ))}
                </select>

                {typeof document !== 'undefined' && dropdownPanel
                    ? createPortal(dropdownPanel, document.body)
                    : null}
            </div>
            {description && !error && (
                <p className="text-sm text-muted-foreground mt-1">
                    {description}
                </p>
            )}
            {error && (
                <p className="text-sm text-destructive mt-1">
                    {error}
                </p>
            )}
        </div>
    );
});

Select.displayName = 'Select';

export default Select;
