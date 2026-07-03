import React from 'react';
import { cn } from '../utils/cn';

export const KTECH_LOGO_SRC = '/assets/images/ktechlogo-Photoroom.png';
export const KTECH_LOGO_ALT = 'Kuwait Technical College';

const SIZE_CLASSES = {
  nav: 'h-9',
  login: 'h-16',
  sm: 'h-8',
};

const KTechLogo = ({
  size = 'nav',
  onDark = false,
  className,
  imgClassName,
}) => {
  const heightClass = SIZE_CLASSES[size] || size;

  return (
    <img
      src={KTECH_LOGO_SRC}
      alt={KTECH_LOGO_ALT}
      className={cn('w-auto shrink-0 object-contain', heightClass, imgClassName, className)}
    />
  );
};

export default KTechLogo;
