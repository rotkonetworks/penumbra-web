import { Skeleton } from '@/shared/ui/skeleton';

/**
 * Instant route shell for /inspect/* — Next.js shows this while the page
 * resolves its async server components. Without it, route navigation
 * appears frozen until the entire RSC tree finishes (slow GraphQL fetches,
 * heavy table data). This unblocks visual feedback in <100ms.
 */
export default function InspectLoading() {
  return (
    <div className='mx-auto flex max-w-[1200px] flex-col gap-4 p-4 desktop:py-10'>
      <div className='h-10 w-64'>
        <Skeleton />
      </div>
      <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
        <div className='h-32'>
          <Skeleton />
        </div>
        <div className='h-32'>
          <Skeleton />
        </div>
        <div className='h-32'>
          <Skeleton />
        </div>
      </div>
      <div className='h-[480px]'>
        <Skeleton />
      </div>
    </div>
  );
}
