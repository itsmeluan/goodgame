/* eslint-disable @typescript-eslint/no-require-imports */

import type { ComponentType, ReactNode } from "react";

type VirtualizedListResetterProps = {
  children: ReactNode;
};

let VirtualizedListContextResetter:
  | ComponentType<VirtualizedListResetterProps>
  | null = null;

try {
  VirtualizedListContextResetter =
    // React Native exposes this internally and uses the same resetter around Modal content.
    // We reuse it here to keep our virtualized lists isolated from surrounding scroll context.
    (
      require("react-native/Libraries/Lists/VirtualizedListContext") as {
        VirtualizedListContextResetter?: ComponentType<VirtualizedListResetterProps>;
      }
    ).VirtualizedListContextResetter ?? null;
} catch {
  VirtualizedListContextResetter = null;
}

export function VirtualizedListBoundary({ children }: VirtualizedListResetterProps) {
  if (!VirtualizedListContextResetter) {
    return <>{children}</>;
  }

  return <VirtualizedListContextResetter>{children}</VirtualizedListContextResetter>;
}
