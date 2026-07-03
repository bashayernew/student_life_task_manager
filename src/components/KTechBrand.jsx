import React from 'react';
import { cn } from '../utils/cn';
import KTechLogo from './KTechLogo';

const KTechBrand = ({
  title = 'Task Manager',
  subtitle,
  onDark = false,
  size = 'nav',
  titleClassName,
  subtitleClassName,
  className,
}) => {
  return (
    <div className={cn('flex items-center gap-3 min-w-0', className)}>
      <KTechLogo size={size} onDark={onDark} />
      <div className="min-w-0">
        <h1 className={cn('text-xl font-bold truncate', titleClassName)}>
          {title}
        </h1>
        {subtitle ? (
          <p className={cn('text-sm header-subtitle truncate', subtitleClassName)}>
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
};

export default KTechBrand;
