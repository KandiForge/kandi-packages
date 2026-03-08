/**
 * MuiUserAvatar — Avatar with hash-based gradient and initials
 * Extracted from KandiForge's UserAvatar component.
 */

import React, { useMemo } from 'react';
import { Box, keyframes } from '@mui/material';
import { styled } from '@mui/material/styles';
import { getInitials, generateAvatarColor } from './avatar-utils.js';

const SIZES = {
  small: { width: 28, height: 28, fontSize: 11 },
  medium: { width: 40, height: 40, fontSize: 16 },
  large: { width: 60, height: 60, fontSize: 22 },
} as const;

const subtleGlow = keyframes`
  0% {
    box-shadow: 0 4px 12px rgba(177, 119, 255, 0.4),
                0 0 20px rgba(177, 119, 255, 0.3);
  }
  100% {
    box-shadow: 0 4px 16px rgba(177, 119, 255, 0.6),
                0 0 30px rgba(177, 119, 255, 0.5);
  }
`;

interface StyledAvatarContainerProps {
  showGlow?: boolean;
  gradient: string;
}

const StyledAvatarContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'showGlow' && prop !== 'gradient',
} as const)<StyledAvatarContainerProps>(({ showGlow, gradient }) => ({
  borderRadius: '50%',
  background: gradient,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  ...(showGlow && {
    animation: `${subtleGlow} 2s ease-in-out infinite alternate`,
  }),
})) as React.ComponentType<StyledAvatarContainerProps & React.ComponentProps<typeof Box>>;

export interface MuiUserAvatarProps {
  email?: string;
  name?: string;
  size?: keyof typeof SIZES;
  showGlow?: boolean;
  className?: string;
}

export const MuiUserAvatar: React.FC<MuiUserAvatarProps> = ({
  email,
  name,
  size = 'medium',
  showGlow = false,
  className,
}) => {
  const initials = useMemo(() => getInitials(name || email), [name, email]);
  const gradient = useMemo(() => generateAvatarColor(email), [email]);
  const sizeConfig = SIZES[size];

  return (
    <StyledAvatarContainer
      showGlow={showGlow}
      gradient={gradient}
      className={className}
      sx={{
        width: sizeConfig.width,
        height: sizeConfig.height,
      }}
    >
      <Box
        component="span"
        sx={{
          color: 'white',
          fontSize: sizeConfig.fontSize,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: size === 'large' ? '1px' : '0.5px',
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
          userSelect: 'none',
          lineHeight: 1,
        }}
      >
        {initials}
      </Box>
    </StyledAvatarContainer>
  );
};
