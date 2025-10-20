import React, { useState } from 'react';
import Select from './Select';
import Icon from '../AppIcon';

const DepartmentFilter = ({ 
  selectedDepartments = [], 
  onChange = () => {}, 
  userRole = 'staff',
  className = '' 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Mock department data - in real app, this would come from props or API
  const allDepartments = [
    { value: 'all', label: 'All Departments', description: 'View tasks from all departments' },
    { value: 'residential-life', label: 'Residential Life', description: 'Dormitory and housing management' },
    { value: 'student-activities', label: 'Student Activities', description: 'Events and programming' },
    { value: 'orientation', label: 'Orientation', description: 'New student programs' },
    { value: 'counseling', label: 'Counseling Services', description: 'Student support and wellness' },
    { value: 'career-services', label: 'Career Services', description: 'Job placement and internships' },
    { value: 'academic-support', label: 'Academic Support', description: 'Tutoring and study programs' },
    { value: 'diversity-inclusion', label: 'Diversity & Inclusion', description: 'Campus diversity initiatives' },
    { value: 'student-conduct', label: 'Student Conduct', description: 'Disciplinary and policy matters' }
  ];

  const handleDepartmentChange = (value) => {
    if (value === 'all') {
      onChange([]);
    } else {
      const newSelection = selectedDepartments?.includes(value)
        ? selectedDepartments?.filter(dept => dept !== value)
        : [...selectedDepartments, value];
      onChange(newSelection);
    }
  };

  const getSelectedCount = () => {
    return selectedDepartments?.length === 0 ? 'All' : selectedDepartments?.length;
  };

  const getSelectedLabel = () => {
    if (selectedDepartments?.length === 0) {
      return 'All Departments';
    } else if (selectedDepartments?.length === 1) {
      const dept = allDepartments?.find(d => d?.value === selectedDepartments?.[0]);
      return dept?.label || 'Unknown Department';
    } else {
      return `${selectedDepartments?.length} Departments`;
    }
  };

  // Mobile-friendly compact view
  const CompactView = () => (
    <div className="lg:hidden">
      <Select
        label="Filter by Department"
        options={allDepartments}
        value={selectedDepartments?.length === 0 ? 'all' : selectedDepartments?.[0]}
        onChange={handleDepartmentChange}
        searchable
        placeholder="Select department..."
        className={className}
      />
    </div>
  );

  // Desktop expanded view
  const ExpandedView = () => (
    <div className="hidden lg:block">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Icon name="Building2" size={16} className="text-muted-foreground" />
            <h3 className="text-sm font-medium text-foreground">Departments</h3>
            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
              {getSelectedCount()}
            </span>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-muted-foreground hover:text-foreground transition-micro hover-lift focus-ring rounded"
          >
            <Icon name={isExpanded ? "ChevronUp" : "ChevronDown"} size={14} />
          </button>
        </div>

        {/* Quick Summary */}
        <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
          {getSelectedLabel()}
        </div>

        {/* Expanded Department List */}
        {isExpanded && (
          <div className="space-y-1 max-h-64 overflow-y-auto border border-border rounded-lg p-2">
            {allDepartments?.map((dept) => {
              const isSelected = dept?.value === 'all' 
                ? selectedDepartments?.length === 0 
                : selectedDepartments?.includes(dept?.value);
              
              return (
                <button
                  key={dept?.value}
                  onClick={() => handleDepartmentChange(dept?.value)}
                  className={`
                    w-full text-left px-3 py-2 rounded-md transition-micro text-sm
                    ${isSelected 
                      ? 'bg-accent text-accent-foreground' 
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{dept?.label}</span>
                    {isSelected && <Icon name="Check" size={14} />}
                  </div>
                  {dept?.description && (
                    <p className={`text-xs mt-1 ${isSelected ? 'text-accent-foreground/80' : 'text-muted-foreground'}`}>
                      {dept?.description}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Quick Actions */}
        {selectedDepartments?.length > 0 && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onChange([])}
              className="text-xs text-muted-foreground hover:text-foreground transition-micro flex items-center space-x-1"
            >
              <Icon name="X" size={12} />
              <span>Clear filters</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className={className}>
      <CompactView />
      <ExpandedView />
    </div>
  );
};

export default DepartmentFilter;