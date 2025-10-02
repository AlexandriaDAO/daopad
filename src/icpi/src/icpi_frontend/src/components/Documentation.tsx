import React, { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface SectionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
  level?: number
}

const Section: React.FC<SectionProps> = ({ title, children, defaultOpen = false, level = 1 }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const indent = level === 1 ? '' : level === 2 ? 'ml-4' : 'ml-8'
  const fontSize = level === 1 ? 'text-base' : level === 2 ? 'text-sm' : 'text-xs'

  return (
    <div className={`${indent} mb-1`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 w-full text-left p-3 rounded hover:bg-[#0a0a0a] transition-colors ${fontSize} font-mono`}
      >
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-[#00FF41] flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-[#999999] flex-shrink-0" />
        )}
        <span className={isOpen ? 'text-white font-bold' : 'text-[#cccccc]'}>{title}</span>
      </button>
      {isOpen && (
        <div className="mt-2 mb-4 ml-6">
          {children}
        </div>
      )}
    </div>
  )
}

export const Documentation: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#000000] py-6">
      <div className="container px-3 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-mono font-bold text-white mb-2">ICPI Protocol Documentation</h1>
          <p className="text-sm font-mono text-[#999999]">
            Technical reference for the Internet Computer Portfolio Index
          </p>
        </div>

        <div className="space-y-1">
          {/* 1. What is ICPI? */}
          <Section title="1. What is ICPI?" defaultOpen={true} level={1}>
            <div className="space-y-3 text-sm font-mono text-[#cccccc] leading-relaxed bg-[#050505] border border-[#1f1f1f] p-4 rounded">
              <p>
                ICPI (Internet Computer Portfolio Index) is an ICRC-1 token that represents a proportional ownership
                stake in a basket of Internet Computer tokens. It's an index fund that automatically tracks and
                rebalances to match the dollar value distribution of locked liquidity in Kongswap pools.
              </p>
              <div className="space-y-1 text-xs">
                <p><strong className="text-white">Tracked tokens:</strong> ALEX, ZERO, KONG, and BOB</p>
                <p><strong className="text-white">Decimals:</strong> 8</p>
                <p><strong className="text-white">Initial supply:</strong> 1 ICPI seeded to deployer</p>
                <p><strong className="text-white">Transfer fee:</strong> 0</p>
              </div>
            </div>
          </Section>

          {/* 2. How Minting Works */}
          <Section title="2. How is the Mint Price Calculated?" level={1}>
            <Section title="2.1 Proportional Formula" level={2} defaultOpen={true}>
              <div className="space-y-3 text-sm font-mono text-[#cccccc] bg-[#050505] border border-[#1f1f1f] p-4 rounded">
                <p>The mint price uses a <strong className="text-white">proportional formula</strong> that ensures exact fair pricing:</p>
                <div className="bg-[#000000] border border-[#1f1f1f] p-4 text-center my-3">
                  <code className="text-[#00FF41] text-base font-mono">
                    new_icpi = (usdt_deposit × current_supply) / current_tvl
                  </code>
                </div>
                <p className="text-xs">
                  This ensures depositors get exact proportional ownership - contribute 9.09% of value, get 9.09% of tokens.
                </p>
              </div>
            </Section>

            <Section title="2.2 Minting Process (minting.rs:71-265)" level={2}>
              <div className="space-y-2 text-sm font-mono text-[#cccccc] bg-[#050505] border border-[#1f1f1f] p-4 rounded">
                <div className="flex items-start gap-2">
                  <span className="text-[#00FF41]">1.</span>
                  <span>User initiates mint with ckUSDT amount (minimum 1 ckUSDT)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#00FF41]">2.</span>
                  <span>Fee collected (0.01 ckUSDT)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#00FF41]">3.</span>
                  <span>Deposit collected from user</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#00FF41]">4.</span>
                  <span><strong className="text-white">TVL calculated:</strong> Sum of all canister holdings (ckUSDT balance + value of ALEX, ZERO, KONG, BOB tokens)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#00FF41]">5.</span>
                  <span>Formula applied to determine ICPI amount</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#00FF41]">6.</span>
                  <span>ICPI minted to user</span>
                </div>
              </div>
            </Section>

            <Section title="2.3 Example Calculation" level={2}>
              <div className="space-y-3 text-xs font-mono bg-[#050505] border border-[#1f1f1f] p-4 rounded">
                <div className="bg-[#000000] border border-[#0a0a0a] p-3 space-y-2">
                  <div className="text-[#999999]">Given:</div>
                  <div className="text-[#cccccc]">• Current TVL: $1,000</div>
                  <div className="text-[#cccccc]">• Current Supply: 100 ICPI</div>
                  <div className="text-[#cccccc]">• User Deposits: $100 ckUSDT</div>
                </div>
                <div className="bg-[#000000] border border-[#0a0a0a] p-3 space-y-2">
                  <div className="text-[#999999]">Calculation:</div>
                  <div className="text-[#00FF41]">new_icpi = (100 × 100) / 1,000</div>
                  <div className="text-[#00FF41]">new_icpi = 10 ICPI</div>
                </div>
                <div className="bg-[#000000] border border-[#0a0a0a] p-3">
                  <div className="text-[#999999]">Result:</div>
                  <div className="text-white">User receives 10 ICPI (9.09% of new supply)</div>
                  <div className="text-[#999999] mt-1">Represents exactly 9.09% ownership of all index holdings</div>
                </div>
              </div>
            </Section>

            <Section title="2.4 Refund Policy" level={2}>
              <div className="space-y-2 text-sm font-mono text-[#cccccc] bg-[#050505] border border-[#1f1f1f] p-4 rounded">
                <p className="text-xs">If TVL calculation fails or TVL is zero, deposit is refunded (fee kept).</p>
                <div className="bg-[#000000] border border-[#0a0a0a] p-3 text-xs space-y-2">
                  <div className="text-[#999999] mb-2">Refund Scenarios:</div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#00FF41]">•</span>
                    <span>TVL calculation failure → Deposit refunded</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#00FF41]">•</span>
                    <span>Zero TVL (no holdings) → Deposit refunded</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#00FF41]">•</span>
                    <span>Math calculation error → Deposit refunded</span>
                  </div>
                </div>
              </div>
            </Section>
          </Section>

          {/* 3. How Burning Works */}
          <Section title="3. How is the Burn Price Calculated?" level={1}>
            <Section title="3.1 Inverse Proportional Formula" level={2} defaultOpen={true}>
              <div className="space-y-3 text-sm font-mono text-[#cccccc] bg-[#050505] border border-[#1f1f1f] p-4 rounded">
                <p>Burning uses the <strong className="text-white">inverse proportional formula</strong>:</p>
                <div className="bg-[#000000] border border-[#1f1f1f] p-4 text-center my-3">
                  <code className="text-[#00FF41] text-base font-mono">
                    token_redemption = (burn_amount / total_supply) × token_balance
                  </code>
                </div>
                <p className="text-xs">Burning 1% of ICPI supply returns exactly 1% of each token holding.</p>
              </div>
            </Section>

            <Section title="3.2 Redemption Process (burning.rs:57-319)" level={2}>
              <div className="space-y-2 text-sm font-mono text-[#cccccc] bg-[#050505] border border-[#1f1f1f] p-4 rounded">
                <div className="flex items-start gap-2">
                  <span className="text-[#00FF41]">1.</span>
                  <span>User initiates burn with ICPI amount</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#00FF41]">2.</span>
                  <span>Fee collected (0.01 ckUSDT)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#00FF41]">3.</span>
                  <span>For each token (ALEX, ZERO, KONG, BOB, ckUSDT):</span>
                </div>
                <div className="flex items-start gap-2 ml-4">
                  <span className="text-[#999999]">•</span>
                  <span>Calculate proportional share</span>
                </div>
                <div className="flex items-start gap-2 ml-4">
                  <span className="text-[#999999]">•</span>
                  <span>Transfer tokens to user (skips dust amounts &lt;1000 units)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#00FF41]">4.</span>
                  <span>ICPI burned from user balance</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#00FF41]">5.</span>
                  <span>Returns list of successful/failed token transfers</span>
                </div>
              </div>
            </Section>

            <Section title="3.3 Example: Burning 10% of Supply" level={2}>
              <div className="space-y-3 text-xs font-mono bg-[#050505] border border-[#1f1f1f] p-4 rounded">
                <div className="bg-[#000000] border border-[#0a0a0a] p-3 space-y-2">
                  <div className="text-[#999999]">Given:</div>
                  <div className="text-[#cccccc]">• Total Supply: 100 ICPI</div>
                  <div className="text-[#cccccc]">• User Burns: 10 ICPI (10%)</div>
                  <div className="text-[#cccccc]">• Index Holdings:</div>
                  <div className="text-[#cccccc] ml-4">- 1,000 ALEX</div>
                  <div className="text-[#cccccc] ml-4">- 500 ZERO</div>
                  <div className="text-[#cccccc] ml-4">- 200 KONG</div>
                  <div className="text-[#cccccc] ml-4">- 50 BOB</div>
                </div>
                <div className="bg-[#000000] border border-[#0a0a0a] p-3">
                  <div className="text-[#999999] mb-2">User Receives (10% of each):</div>
                  <div className="text-[#00FF41]">• 100 ALEX</div>
                  <div className="text-[#00FF41]">• 50 ZERO</div>
                  <div className="text-[#00FF41]">• 20 KONG</div>
                  <div className="text-[#00FF41]">• 5 BOB</div>
                </div>
              </div>
            </Section>
          </Section>

          {/* 4. How Rebalancing Works */}
          <Section title="4. How Does Rebalancing Work?" level={1}>
            <Section title="4.1 Hourly Automated Rebalancing (rebalancer.rs:26-240)" level={2} defaultOpen={true}>
              <div className="space-y-3 text-sm font-mono text-[#cccccc] bg-[#050505] border border-[#1f1f1f] p-4 rounded">
                <p><strong className="text-white">Hourly automated rebalancing</strong> via ic-cdk-timers (one trade per hour):</p>
                <div className="bg-[#000000] border border-[#0a0a0a] p-3 text-xs space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-[#00FF41]">•</span>
                    <span><strong className="text-white">If ckUSDT available (&gt;$10):</strong> Buy token with largest deficit, trade size = 10% of deficit</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#00FF41]">•</span>
                    <span><strong className="text-white">Else if tokens over-allocated:</strong> Sell most overweight token to ckUSDT, trade size = 10% of excess</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#00FF41]">•</span>
                    <span>All trades go through ckUSDT as intermediary</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#00FF41]">•</span>
                    <span>Sequential execution only (no batching) - required by Kongswap design</span>
                  </div>
                </div>
              </div>
            </Section>

            <Section title="4.2 Target Allocation Calculation (tvl_calculator.rs:10-212)" level={2}>
              <div className="space-y-3 text-sm font-mono text-[#cccccc] bg-[#050505] border border-[#1f1f1f] p-4 rounded">
                <div className="bg-[#000000] border border-[#1f1f1f] p-4 text-center">
                  <code className="text-[#00FF41] text-sm font-mono">
                    target% = token_locked_liquidity / total_locked_liquidity
                  </code>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="text-[#00FF41]">1.</span>
                    <span>Query kong_locker_backend for all lock canisters</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#00FF41]">2.</span>
                    <span>Query each lock canister via kongswap_backend user_balances for LP positions</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#00FF41]">3.</span>
                    <span>For each LP position: 50/50 pools attribute half of USD value to each token</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#00FF41]">4.</span>
                    <span>Only count [ALEX, ZERO, KONG, BOB] tokens</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#00FF41]">5.</span>
                    <span>Calculate percentages: Each token's TVL / Total TVL × 100%</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#00FF41]">6.</span>
                    <span>Cache for 5 minutes to reduce inter-canister calls</span>
                  </div>
                </div>
              </div>
            </Section>

            <Section title="4.3 Example Distribution" level={2}>
              <div className="space-y-3 text-xs font-mono bg-[#050505] border border-[#1f1f1f] p-4 rounded">
                <div className="bg-[#000000] border border-[#0a0a0a] p-3 space-y-2">
                  <div className="text-[#999999] mb-2">From project docs (example locked TVL):</div>
                  <div className="text-[#cccccc]">• ALEX: 48.57% ($22.5K locked)</div>
                  <div className="text-[#cccccc]">• ZERO: 1.38% ($640)</div>
                  <div className="text-[#cccccc]">• KONG: 0.11% ($48.71)</div>
                  <div className="text-[#cccccc]">• BOB: 0.00% ($2.05)</div>
                </div>
              </div>
            </Section>
          </Section>

          {/* 5. How Index Weighting is Determined */}
          <Section title="5. How is Index Weighting Determined?" level={1}>
            <div className="space-y-3 text-sm font-mono text-[#cccccc] bg-[#050505] border border-[#1f1f1f] p-4 rounded">
              <p><strong className="text-white">Dynamic weighting based on locked liquidity:</strong></p>
              <div className="space-y-2 text-xs">
                <p>Index weights are determined by the dollar value of locked liquidity in Kongswap pools. The system queries kong_locker to find all lock canisters, then queries each for their LP positions.</p>
                <p className="mt-2">For each 50/50 liquidity pool, half the USD value is attributed to each token. Only [ALEX, ZERO, KONG, BOB] tokens are tracked.</p>
                <p className="mt-2">Percentages are calculated as: Each token's TVL / Total TVL × 100%</p>
                <p className="mt-2">This data is cached for 5 minutes to optimize performance.</p>
              </div>
            </div>
          </Section>

          {/* 6. Key Features */}
          <Section title="6. Key Features & Design Principles" level={1}>
            <Section title="6.1 Safety-First Design" level={2} defaultOpen={true}>
              <div className="space-y-2 text-xs font-mono text-[#cccccc] bg-[#050505] border border-[#1f1f1f] p-4 rounded">
                <div className="flex items-start gap-2">
                  <span className="text-[#00FF41]">•</span>
                  <span>No persistent storage for balances - queries actual token canisters</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#00FF41]">•</span>
                  <span>In-memory caching with 5-minute TTL</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#00FF41]">•</span>
                  <span>Refunds on calculation failures</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#00FF41]">•</span>
                  <span>Two-phase mint/burn (initiate → complete)</span>
                </div>
              </div>
            </Section>

            <Section title="6.2 Gas Efficiency" level={2}>
              <div className="space-y-2 text-xs font-mono text-[#cccccc] bg-[#050505] border border-[#1f1f1f] p-4 rounded">
                <div className="flex items-start gap-2">
                  <span className="text-[#00FF41]">•</span>
                  <span>Parallel inter-canister calls (futures::join_all)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#00FF41]">•</span>
                  <span>60-second timeout on operations</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#00FF41]">•</span>
                  <span>Cleanup timers for expired operations</span>
                </div>
              </div>
            </Section>

            <Section title="6.3 Price Discovery" level={2}>
              <div className="space-y-2 text-xs font-mono text-[#cccccc] bg-[#050505] border border-[#1f1f1f] p-4 rounded">
                <div className="flex items-start gap-2">
                  <span className="text-[#00FF41]">•</span>
                  <span>All prices queried from Kongswap swap_amounts endpoint in real-time</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#00FF41]">•</span>
                  <span>Portfolio value: Current canister holdings (not locked liquidity) determine mint/burn calculations</span>
                </div>
              </div>
            </Section>
          </Section>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-[#1f1f1f]">
          <div className="text-xs font-mono text-[#999999] space-y-2">
            <p>
              <strong className="text-white">Disclaimer:</strong> This documentation describes the technical implementation
              of the ICPI protocol. It is not financial advice. Digital assets carry risk.
            </p>
            <p>
              Protocol Version: 1.0.0 | Last Updated: 2025-10-01
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
