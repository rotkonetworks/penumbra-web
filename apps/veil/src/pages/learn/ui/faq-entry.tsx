'use client';

import { Text } from '@penumbra-zone/ui/Text';
import { Link as LinkIcon } from 'lucide-react';

interface Props {
  slug: string;
  q: string;
  a: string;
}

/**
 * Single FAQ entry with permalink. Client component because the # anchor
 * link uses onClick to stop propagation — without it, clicking the link
 * inside <summary> would also toggle the disclosure. Kept tiny so the
 * static FAQPage list itself can stay a Server Component (FAQ JSON-LD,
 * SEO).
 */
export const FaqEntry = ({ slug, q, a }: Props) => (
  <section
    id={slug}
    className='group scroll-mt-24 rounded-lg bg-other-tonal-fill5 p-4 target:bg-other-tonal-fill15 hover:bg-other-tonal-fill10'
  >
    <details>
      <summary className='cursor-pointer list-none'>
        <div className='flex items-start justify-between gap-4'>
          <h2 className='inline-flex items-center gap-2'>
            <Text variant='strong' color='text.primary' as='span'>
              {q}
            </Text>
            <a
              href={`#${slug}`}
              onClick={e => e.stopPropagation()}
              aria-label={`Permalink to ${q}`}
              className='text-text-secondary opacity-0 transition-opacity group-hover:opacity-100'
            >
              <LinkIcon className='h-3.5 w-3.5' />
            </a>
          </h2>
          <span className='mt-1 shrink-0 text-text-secondary transition-transform group-open:rotate-45'>
            +
          </span>
        </div>
      </summary>
      <div className='mt-3'>
        <Text body color='text.secondary'>
          {a}
        </Text>
      </div>
    </details>
  </section>
);
