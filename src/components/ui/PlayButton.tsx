import React from 'react';
import { Button, ButtonProps } from './Button';
import { PlayIcon, PauseIcon, Loader2Icon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlayButtonProps extends Omit<ButtonProps, 'children'> {
  isPlaying?: boolean;
  isLoading?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const PlayButton = React.forwardRef<HTMLButtonElement, PlayButtonProps>(
  ({ isPlaying = false, isLoading = false, size = 'lg', className, ...props }, ref) => {
    const sizeClasses = {
      sm: 'h-8 w-8',
      md: 'h-10 w-10', 
      lg: 'h-14 w-14',
      xl: 'h-16 w-16'
    };

    const iconSizes = {
      sm: 'w-3 h-3',
      md: 'w-4 h-4',
      lg: 'w-6 h-6', 
      xl: 'w-8 h-8'
    };

    return (
      <Button
        ref={ref}
        className={cn(
          'rounded-full flex items-center justify-center bg-[#129990] hover:bg-[#096B68] disabled:bg-gray-400 text-white shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95',
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2Icon className={cn(iconSizes[size], 'animate-spin')} />
        ) : isPlaying ? (
          <PauseIcon className={cn(iconSizes[size], 'fill-white')} />
        ) : (
          <PlayIcon className={cn(iconSizes[size], 'fill-white ml-0.5')} />
        )}
      </Button>
    );
  }
);

PlayButton.displayName = 'PlayButton';

export { PlayButton };
export type { PlayButtonProps };
