import { TournamentPage } from '@/pages/tournament';

// Tournament epoch state and gauge totals are live; without revalidate the
// page would freeze at build time. 60s lines up with how often a new vote
// or LP would meaningfully change the leaderboard order.
export const revalidate = 60;

export default TournamentPage;
