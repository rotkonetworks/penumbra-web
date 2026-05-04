import { Text } from '@penumbra-zone/ui/Text';
import { LearnNav } from './learn-nav';

/**
 * FAQ entries kept as plain text (no JSX) so they can both render in the
 * page and serialize into the FAQPage Schema.org JSON-LD payload below
 * — Google needs the answers in plain text to extract for rich
 * snippets. Keep answers 50-300 words: long enough to be authoritative,
 * short enough that Google won't truncate.
 *
 * Editorial guideline: write the way a curious-but-not-expert searcher
 * would type the question. Don't repeat the question in the answer
 * verbatim — that gets penalized as keyword-stuffing.
 */
interface FAQ {
  q: string;
  a: string;
}

const FAQS: FAQ[] = [
  {
    q: 'What is Penumbra?',
    a: 'Penumbra is a fully-shielded proof-of-stake blockchain with a built-in private DEX. Balances, swaps, and liquidity provider (LP) positions are encrypted on-chain — only you can see your activity. The chain uses zero-knowledge proofs to validate transactions without revealing inputs, and a uniform-price batch auction to clear every block, so MEV bots cannot front-run or sandwich your trades.',
  },
  {
    q: 'What is UM?',
    a: 'UM (also written upenumbra in atomic units) is the native token of the Penumbra blockchain. It pays for transaction fees, secures the network as the staking token, serves as the numeraire for arbitrage burns, and is the governance token. Total supply on mainnet started at ~95.3M UM and grows by a small amount each block to pay validator rewards.',
  },
  {
    q: 'How do I shield assets on Penumbra?',
    a: 'Shielding means moving assets into the encrypted balance pool. The most common path is USDC: withdraw directly from Coinbase to a Penumbra address through Noble — no separate bridge UI required. ATOM, OSMO, ETH, BTC and any IBC asset shield the same way: send an IBC transfer from the originating Cosmos chain to your Penumbra address. After one block confirmation, the asset appears in your shielded balance and is invisible to chain analysis.',
  },
  {
    q: 'How does the Penumbra DEX work?',
    a: 'The Penumbra DEX clears every block using a uniform-price batch auction. All swaps for the same pair within a block fill at one clearing price, computed from the liquidity available in concentrated-liquidity positions across multiple routes. There is no transaction ordering within the batch — every trader gets the same execution price regardless of when their swap arrived in the block. Liquidity providers post limit-order-shaped positions; the protocol routes through them automatically.',
  },
  {
    q: 'Does Penumbra have MEV?',
    a: 'No, in the senses that matter. Because trades clear at a uniform price per block and inputs are encrypted until execution, the typical MEV vectors — front-running, sandwiching, priority gas auctions — have nothing to extract. When the batch auction discovers a price gap between adjacent liquidity positions, the protocol itself captures the arbitrage and burns the proceeds in UM, rather than letting a searcher take it. Validators receive only inflation rewards, not fee revenue, removing their incentive to reorder transactions.',
  },
  {
    q: 'What is arbitrage burn?',
    a: 'During each block\'s batch clearing, the protocol routes swaps through a graph of liquidity positions to find the best execution price. If the route consumes a price gap (an arbitrage opportunity), the surplus UM left over after every fill is burned — permanently removed from supply. This means a busy DEX is deflationary: the more activity, the more UM is destroyed. It also means the protocol pays itself the searcher tip that other chains hand to MEV bots.',
  },
  {
    q: 'How is UM issued?',
    a: 'UM is issued only to bonded stake. Each block, validators receive a base reward proportional to the fraction of supply that is actively staked. Realized inflation today runs around 0.3%/year because participation is low; the theoretical ceiling at 100% staked is roughly 1.5–2%/year. For comparison, Bitcoin runs ~0.85%/yr post-2024 halving, ETH net issuance is ~0.4%/yr, most Cosmos chains run 7–20%, and Solana is ~5%.',
  },
  {
    q: 'How do I stake UM?',
    a: 'Open a Penumbra wallet (Zafu, the Penumbra Labs wallet, or any compatible client), shield some UM, then delegate to a validator. The wallet shows the active validator set with commission rates and uptime. Delegations earn the same per-block reward proportional to total active stake; choose validators based on commission and reliability. Unstaking has an unbonding delay (currently a few epochs) during which the UM stays locked but earns no rewards.',
  },
  {
    q: 'What is the difference between bonded stake and active stake?',
    a: 'Bonded stake is every UM currently delegated, including delegations to inactive validators, queued delegations waiting for the next epoch, and unbonding delegations. Active stake is the subset securing the chain right now — delegations to validators in the active set whose voting power counts toward consensus. The two numbers can differ by tens of percent; only active stake earns rewards.',
  },
  {
    q: 'What is the Liquidity Tournament (LQT)?',
    a: 'LQT is an epoch-based program that pays additional UM rewards to liquidity providers on selected pairs (typically UM/IBC pairs). Stakers vote to direct rewards to specific assets, and LPs on those pairs split a reward pool proportional to their share of the directed liquidity. When an epoch is live, eligible pairs show a "Rewards" badge in the trading interface.',
  },
  {
    q: 'How does Penumbra differ from Zcash?',
    a: 'Both use zero-knowledge proofs to shield balances. Zcash is a pure payments chain; Penumbra is a full Cosmos SDK chain with an integrated DEX, staking, governance, and IBC bridging. Penumbra uses the Bulletproofs+ proof system tuned for general-purpose validity (not just transfers), supports liquidity provision and swaps with shielded execution, and runs proof-of-stake instead of proof-of-work.',
  },
  {
    q: 'How does Penumbra differ from a chain like Aztec?',
    a: 'Both target privacy on a chain with general-purpose state. Penumbra is a sovereign Cosmos SDK chain native to the IBC ecosystem; Aztec is an Ethereum L2. Penumbra\'s privacy applies to balances, swaps, and LP positions natively (no separate "shielded mode"), and uses uniform-price batch clearing for all DEX activity. Aztec relies on private function execution within EVM-style smart contracts.',
  },
  {
    q: 'Can validators see my shielded balance?',
    a: 'No. Validators only see the encrypted commitments published on-chain plus the validity proofs that authorize each transaction. The proofs reveal nothing about the spending viewing key, the asset type, the amount, or the counterparty. Validators verify the proof and update the chain state; they cannot decrypt anything.',
  },
  {
    q: 'How do I provide liquidity?',
    a: 'Penumbra LPs post concentrated-liquidity positions: you specify a price range and a fee tier, then commit reserves in either or both assets of a pair. Each position acts like a series of limit orders within the chosen range. Earnings come from the spread on swaps that route through your position. Positions are themselves shielded — the chain doesn\'t reveal which positions belong to which user. The DEX UI under /trade has a position builder.',
  },
  {
    q: 'Is Penumbra audited?',
    a: 'The cryptographic primitives (Bulletproofs+, batch auctions, ZK circuits) and the consensus integration have been audited by Trail of Bits and other firms. Audit reports are linked from the Penumbra protocol spec. As with any new protocol, treat early-stage funds as you would any pre-mature DeFi exposure: start small, learn the system, and check the latest audit status before increasing position sizes.',
  },
  {
    q: 'Where can I see live Penumbra stats?',
    a: 'On this site: /learn/tokenomics shows live supply, staked %, annualized inflation, and burns; / (the home page) shows DEX volume and trading pairs; /explore is the on-chain block explorer with blocks, transactions, validators, governance, and IBC channel data.',
  },
];

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
};

export const FaqPage = () => (
  <>
    <LearnNav />
    <section className='mx-auto flex max-w-[820px] flex-col gap-8 p-4 desktop:py-10'>
      <header className='flex flex-col gap-3'>
        <Text variant='h1' color='text.primary'>
          Penumbra FAQ
        </Text>
        <Text variant='large' color='text.secondary'>
          Common questions about UM, the shielded DEX, staking, IBC bridging, and how
          Penumbra prevents MEV. Tap a question to expand.
        </Text>
      </header>

      <div className='flex flex-col gap-3'>
        {FAQS.map(({ q, a }, i) => (
          <details
            key={i}
            className='group rounded-lg bg-other-tonal-fill5 p-4 open:bg-other-tonal-fill10'
          >
            <summary className='cursor-pointer list-none'>
              <div className='flex items-start justify-between gap-4'>
                <Text variant='strong' color='text.primary'>
                  {q}
                </Text>
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
        ))}
      </div>

      {/* Schema.org FAQPage structured data — lets Google render rich
          snippets directly in search results. */}
      <script
        type='application/ld+json'
        // eslint-disable-next-line react/no-danger -- structured data
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </section>
  </>
);
