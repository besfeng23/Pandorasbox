import React from 'react';

type IconProps = React.SVGProps<SVGSVGElement> & { title?: string };

const cache = new Map<string, React.ForwardRefExoticComponent<IconProps>>();

function getIcon(name: string) {
  const cached = cache.get(name);
  if (cached) return cached;

  const Icon = React.forwardRef<SVGSVGElement, IconProps>((props, ref) => (
    <svg
      ref={ref}
      data-lucide={name}
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      aria-hidden={props['aria-label'] ? undefined : true}
      {...props}
    />
  ));

  Icon.displayName = `LucideMock(${name})`;
  cache.set(name, Icon);
  return Icon;
}

// Export a Proxy so any `import { AnyIcon } from 'lucide-react'` works in Jest.
// next/jest compiles TS to CJS for tests, so named imports are property lookups.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
module.exports = new Proxy(
  {},
  {
    get: (_target, prop: string) => {
      if (prop === '__esModule') return true;
      return getIcon(String(prop));
    },
  }
);


