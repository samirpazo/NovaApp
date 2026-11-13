import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { Image, View } from 'react-native';

interface ProfileAvatarProps {
  /** Data URI de la foto ya descargada y cacheada. */
  source?: string | null;
  /** Nombre del que se toma la inicial cuando no hay foto. */
  name?: string | null;
  size?: number;
  className?: string;
}

/**
 * Avatar de la cuenta. Muestra la foto cuando está disponible y cae a la
 * inicial del nombre cuando no hay foto o todavía se está descargando.
 */
export function ProfileAvatar({
  source,
  name,
  size = 48,
  className,
}: ProfileAvatarProps) {
  const initial = (name ?? '').trim().charAt(0).toUpperCase() || '?';
  const radius = Math.round(size * 0.25);

  if (source) {
    return (
      <Image
        source={{ uri: source }}
        style={{ width: size, height: size, borderRadius: radius }}
        accessibilityIgnoresInvertColors
      />
    );
  }

  return (
    <View
      className={cn(
        'items-center justify-center border border-border bg-muted',
        className,
      )}
      style={{ width: size, height: size, borderRadius: radius }}
    >
      <Text
        className="font-poppins-semibold"
        style={{ fontSize: Math.round(size * 0.4) }}
      >
        {initial}
      </Text>
    </View>
  );
}
