export { GET } from '@/shared/api/server/tournament/social-image';

// canvas (required by the GET handler) has a native binding that we can't
// always build at deploy time. Force this route to be evaluated only at
// request time so build-step page-data collection never tries to load it.
export const dynamic = 'force-dynamic';
