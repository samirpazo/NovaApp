import * as React from 'react';

import { useAuthStore } from '@/auth';
import {
  permissionsForOption,
  type OptionPermissions,
} from '@/features/security/options/permissions';
import {
  getCachedMobileOptions,
  refreshMobileOptions,
} from '@/features/security/options/service';

const unrestricted: OptionPermissions = {
  access: true,
  add: true,
  edit: true,
  remove: true,
  export: true,
  manage: true,
};

export function useOptionPermissions(optCode?: string): OptionPermissions {
  const userId = useAuthStore((state) => state.Session?.User.UsrID);
  const [permissions, setPermissions] = React.useState<OptionPermissions>(() =>
    optCode ? permissionsForOption([], optCode) : unrestricted,
  );

  React.useEffect(() => {
    if (!optCode) {
      setPermissions(unrestricted);
      return;
    }
    if (!userId) {
      setPermissions(permissionsForOption([], optCode));
      return;
    }
    let active = true;
    void getCachedMobileOptions(userId).then(async (cached) => {
      if (!active) return;
      if (cached.length) setPermissions(permissionsForOption(cached, optCode));
      try {
        const refreshed = await refreshMobileOptions(userId);
        if (active) setPermissions(permissionsForOption(refreshed, optCode));
      } catch {
        // Fail closed: an unavailable permission source never grants a mutation.
      }
    });
    return () => {
      active = false;
    };
  }, [optCode, userId]);

  return permissions;
}
