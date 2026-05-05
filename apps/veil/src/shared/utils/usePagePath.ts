'use client';

import { usePathname } from 'next/navigation';
import { PagePath } from '../const/pages';

const removeTrailingSlash = (url: string): string => {
  return url.endsWith('/') ? url.slice(0, -1) : url;
};

// Hoisted at module load: every render of every page in the app calls
// matchPagePath, and re-running Object.values + recompiling N RegExps on
// each call is pure waste — the PagePath enum never changes at runtime.
const PATH_VALUES = Object.values(PagePath);
const PATH_VALUES_SET = new Set<string>(PATH_VALUES);
const PARAMETRIC_PATHS: Array<{ value: PagePath; regex: RegExp }> = PATH_VALUES.filter(p =>
  p.includes(':'),
).map(p => ({
  value: p as PagePath,
  regex: new RegExp('^' + p.replace(/:(\w+)/g, '([^/]+)') + '$'),
}));

const matchPagePath = (str: string): PagePath => {
  if (PATH_VALUES_SET.has(str)) {
    return str as PagePath;
  }
  for (const { value, regex } of PARAMETRIC_PATHS) {
    if (regex.test(str)) {
      return value;
    }
  }
  return PagePath.Home;
};

export const usePagePath = () => {
  const pathname = usePathname();
  return matchPagePath(removeTrailingSlash(pathname ?? ''));
};
