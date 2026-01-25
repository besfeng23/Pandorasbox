import { SVGProps } from 'react';

export function PandoraBoxIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        <path d="M12 2a10 10 0 0 0-10 10c0 4.42 2.87 8.17 6.84 9.5" />
        <path d="M22 12a10 10 0 0 0-10-10" />
        <path d="M18.16 14.5A6.82 6.82 0 0 0 12 12a6.82 6.82 0 0 0-6.16 2.5" />
        <path d="M12 12a2.5 2.5 0 0 0-2.5 2.5" />
        <path d="M12 12a2.5 2.5 0 0 1 2.5 2.5" />
        <path d="M12 12a2.5 2.5 0 0 0-2.5-2.5" />
        <path d="M12 12a2.5 2.5 0 0 1 2.5-2.5" />
        <path d="M14.5 18.16a6.82 6.82 0 0 0 0-12.32" />
        <path d="M9.5 5.84a6.82 6.82 0 0 0 0 12.32" />
    </svg>
  );
}
