// Redirects "/" and "/trade" paths to paths defined in the routing proxy.
export const config = {
  matcher: ['/', '/trade'],
};

export { routingProxy as proxy } from '@/shared/index.server';
