/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';

export const motion = new Proxy(
  {},
  {
    get: (_target, prop) => {
      return React.forwardRef((props: any, ref: any) =>
        React.createElement(prop as string, { ...props, ref }),
      );
    },
  },
);

export const AnimatePresence = ({ children }: { children: React.ReactNode }) =>
  children;
