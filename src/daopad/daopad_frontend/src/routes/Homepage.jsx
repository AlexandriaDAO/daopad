import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight, Users, Lock, Vote, Shield,
  Banknote, FileText, CreditCard, Building2,
  CheckCircle, XCircle, TrendingUp, DollarSign
} from 'lucide-react';

function Homepage() {

  return (
    <div className="min-h-screen bg-executive-charcoal text-executive-lightGray">
      {/* Gold trim */}
      <div className="h-1 bg-gradient-to-r from-transparent via-executive-gold to-transparent"></div>

      {/* Hero - Direct Value Prop */}
      <section className="relative py-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-5xl mx-auto">
            {/* For who */}
            <Badge className="bg-executive-gold/20 text-executive-goldLight border-executive-gold/30 px-4 py-1 mb-6">
              For Any Token Community
            </Badge>

            {/* What */}
            <h1 className="text-5xl md:text-6xl font-display text-executive-ivory mb-6">
              DAOPad
            </h1>

            {/* One-liner */}
            <p className="text-2xl text-executive-goldLight font-serif mb-6">
              Small Business. Big Corporation Advantages. One Platform.
            </p>

            {/* Visual Equation */}
            <div className="flex items-center justify-center gap-4 mb-12 text-3xl">
              <div className="text-center">
                <span className="text-4xl">☕</span>
                <p className="text-xs text-executive-lightGray/60 mt-1">Your Business</p>
              </div>
              <span className="text-executive-gold">+</span>
              <div className="text-center">
                <span className="text-executive-gold font-display text-2xl">DAOPad</span>
              </div>
              <span className="text-executive-gold">=</span>
              <div className="text-center">
                <span className="text-4xl">🏦</span>
                <p className="text-xs text-executive-lightGray/60 mt-1">Corp Powers</p>
              </div>
              <span className="text-executive-gold">+</span>
              <div className="text-center">
                <span className="text-4xl">🪙</span>
                <p className="text-xs text-executive-lightGray/60 mt-1">Investable</p>
              </div>
            </div>

            {/* Three-way Comparison */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              {/* Team Wallets */}
              <div className="bg-executive-darkGray/50 border border-executive-gold/20 rounded-lg p-6">
                <div className="text-center mb-2">
                  <span className="text-2xl">👤</span>
                </div>
                <h3 className="text-executive-lightGray text-lg font-bold mb-4">
                  Team Wallets
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="text-executive-lightGray/70">Simple setup</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span className="text-executive-lightGray/70">No transparency</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span className="text-executive-lightGray/70">Personal liability</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span className="text-executive-lightGray/70">No community input</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-executive-gold/10">
                  <span className="text-xs text-yellow-500">Too Centralized</span>
                </div>
              </div>

              {/* SNS/Full DAO */}
              <div className="bg-executive-darkGray/50 border border-executive-gold/20 rounded-lg p-6">
                <div className="text-center mb-2">
                  <span className="text-2xl">🏛️</span>
                </div>
                <h3 className="text-executive-lightGray text-lg font-bold mb-4">
                  SNS / Full DAO
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="text-executive-lightGray/70">Fully decentralized</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span className="text-executive-lightGray/70">$100K+ to setup</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span className="text-executive-lightGray/70">6+ months to launch</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span className="text-executive-lightGray/70">Kills innovation</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-executive-gold/10">
                  <span className="text-xs text-yellow-500">Too Complex</span>
                </div>
              </div>

              {/* DAOPad */}
              <div className="bg-gradient-to-br from-executive-gold/10 to-executive-darkGray/50 border-2 border-executive-gold/50 rounded-lg p-6">
                <div className="text-center mb-2">
                  <span className="text-2xl">⚖️</span>
                </div>
                <h3 className="text-executive-gold text-lg font-bold mb-4 text-center">
                  DAOPad
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="text-executive-lightGray">5 minute setup</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="text-executive-lightGray">Community governed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="text-executive-lightGray">Real bank accounts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="text-executive-lightGray">Scale as you grow</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-executive-gold/30">
                  <span className="text-xs text-green-400">Just Right</span>
                </div>
              </div>
            </div>

            {/* CTA */}
            <Link to="/app">
              <Button size="lg" className="bg-executive-gold text-executive-charcoal hover:bg-executive-goldLight font-serif px-8 py-6 text-lg">
                Launch Your DAO
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Transformation Diagram - New Section */}
      <section className="py-16 border-t border-executive-gold/20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between gap-8">
              {/* Before */}
              <div className="flex-1 bg-executive-darkGray/50 border border-executive-gold/20 rounded-lg p-6">
                <h3 className="text-center text-executive-lightGray/60 text-sm uppercase tracking-wider mb-4">Your Business Today</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-executive-gold/30">•</span>
                    <span className="text-executive-lightGray/70">Local only</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-executive-gold/30">•</span>
                    <span className="text-executive-lightGray/70">Bank dependent</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-executive-gold/30">•</span>
                    <span className="text-executive-lightGray/70">No investors</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-executive-gold/30">•</span>
                    <span className="text-executive-lightGray/70">Solo decisions</span>
                  </div>
                </div>
                <div className="mt-4 text-center text-xs text-red-400/60 uppercase tracking-wider">Limited</div>
              </div>

              {/* Arrow */}
              <div className="flex-shrink-0 text-executive-gold text-3xl animate-pulse">
                →
              </div>

              {/* After */}
              <div className="flex-1 bg-gradient-to-br from-executive-gold/10 to-executive-darkGray/50 border-2 border-executive-gold/50 rounded-lg p-6">
                <h3 className="text-center text-executive-gold text-sm uppercase tracking-wider mb-4">With DAOPad</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">•</span>
                    <span className="text-executive-lightGray">Global reach</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">•</span>
                    <span className="text-executive-lightGray">Crypto native</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">•</span>
                    <span className="text-executive-lightGray">Open investment</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">•</span>
                    <span className="text-executive-lightGray">Community led</span>
                  </div>
                </div>
                <div className="mt-4 text-center text-xs text-green-400 uppercase tracking-wider">Unlimited</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Great Inventions Animation */}
      <section className="py-20 border-t border-executive-gold/20 bg-executive-darkGray/20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            {/* Animated Timeline */}
            <div className="relative">
              {/* Connection Line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-executive-gold/20"></div>

              {/* Fair Launch */}
              <div className="relative flex items-center mb-12 animate-fade-in-1">
                <div className="w-1/2 text-right pr-8">
                  <h3 className="text-2xl font-serif text-executive-ivory mb-2">Fair Launch</h3>
                  <p className="text-executive-lightGray/60 mt-2">Communities fund together</p>
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-executive-gold border-4 border-executive-charcoal"></div>
                <div className="w-1/2 pl-8">
                  <div className="text-4xl animate-pulse-slow">👥</div>
                </div>
              </div>

              {/* Smart Contract */}
              <div className="relative flex items-center mb-12 animate-fade-in-2">
                <div className="w-1/2 text-right pr-8">
                  <div className="text-4xl animate-pulse-slow">⚙️</div>
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-executive-gold border-4 border-executive-charcoal"></div>
                <div className="w-1/2 pl-8">
                  <h3 className="text-2xl font-serif text-executive-ivory mb-2">Smart Contract</h3>
                  <p className="text-executive-lightGray/60 mt-2">Automated trust</p>
                </div>
              </div>

              {/* LLC */}
              <div className="relative flex items-center mb-12 animate-fade-in-3">
                <div className="w-1/2 text-right pr-8">
                  <h3 className="text-2xl font-serif text-executive-ivory mb-2">LLC</h3>
                  <p className="text-executive-lightGray/60 mt-2">Legal protection</p>
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-executive-gold border-4 border-executive-charcoal"></div>
                <div className="w-1/2 pl-8">
                  <div className="text-4xl animate-pulse-slow">🏢</div>
                </div>
              </div>

              {/* DAO - Unfulfilled */}
              <div className="relative flex items-center animate-fade-in-4">
                <div className="w-full text-center">
                  <div className="inline-block relative">
                    <div className="absolute inset-0 bg-executive-gold/20 blur-xl animate-pulse"></div>
                    <div className="relative bg-executive-charcoal border-2 border-executive-gold px-8 py-6 rounded-lg">
                      <h3 className="text-3xl font-serif text-executive-gold mb-2">DAOs</h3>
                      <p className="text-sm text-executive-lightGray/60">The Great Convergence</p>
                      <div className="mt-4 flex justify-center items-center gap-2">
                        <span className="text-xl opacity-50">👥</span>
                        <span className="text-executive-gold">+</span>
                        <span className="text-xl opacity-50">⚙️</span>
                        <span className="text-executive-gold">+</span>
                        <span className="text-xl opacity-50">🏢</span>
                        <span className="text-executive-gold">=</span>
                        <span className="text-2xl animate-pulse">❓</span>
                      </div>
                      <p className="text-xs text-executive-gold mt-2 font-serif">DAOPad makes it real</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Arrow pointing down */}
              <div className="mt-12 text-center animate-bounce">
                <div className="inline-block">
                  <div className="text-executive-gold text-3xl">⬇</div>
                  <p className="text-executive-gold font-serif mt-2">Until Now</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Custom animations */}
        <style jsx>{`
          @keyframes fade-in-1 {
            0% { opacity: 0; transform: translateY(20px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          @keyframes fade-in-2 {
            0% { opacity: 0; transform: translateY(20px); }
            33% { opacity: 0; transform: translateY(20px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          @keyframes fade-in-3 {
            0% { opacity: 0; transform: translateY(20px); }
            66% { opacity: 0; transform: translateY(20px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          @keyframes fade-in-4 {
            0% { opacity: 0; transform: scale(0.8); }
            75% { opacity: 0; transform: scale(0.8); }
            100% { opacity: 1; transform: scale(1); }
          }
          @keyframes pulse-slow {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.8; }
          }
          .animate-fade-in-1 { animation: fade-in-1 2s ease-out; }
          .animate-fade-in-2 { animation: fade-in-2 2s ease-out; }
          .animate-fade-in-3 { animation: fade-in-3 2s ease-out; }
          .animate-fade-in-4 { animation: fade-in-4 2s ease-out; }
          .animate-pulse-slow { animation: pulse-slow 3s ease-in-out infinite; }
        `}</style>
      </section>

      {/* How DAOPad Delivers - The Complete Package */}
      <section className="py-20 border-t border-executive-gold/20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-display text-executive-gold mb-4">
                DAOPad Delivers The Complete Package
              </h2>
              <p className="text-executive-lightGray/70">
                Finally, all three great inventions working together
              </p>
            </div>

            {/* Phase 1 & 2 Professional Features */}
            <div className="space-y-8">
              {/* Phase 1 */}
              <div className="bg-gradient-to-br from-executive-gold/5 to-transparent rounded-lg p-8 border border-executive-gold/30">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-serif text-executive-ivory">Phase 1: Launch Today</h3>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Live Now</Badge>
                </div>

                <div className="grid grid-cols-3 gap-4 md:gap-6">
                  {/* Icon Grid - 2x3 */}
                  <div className="text-center group cursor-pointer">
                    <div className="bg-executive-darkGray/50 rounded-lg p-4 border border-executive-gold/20 group-hover:border-executive-gold/40 transition-colors">
                      <div className="text-3xl mb-2">💰</div>
                      <div className="text-xs text-executive-lightGray">Multi-sig</div>
                    </div>
                  </div>

                  <div className="text-center group cursor-pointer">
                    <div className="bg-executive-darkGray/50 rounded-lg p-4 border border-executive-gold/20 group-hover:border-executive-gold/40 transition-colors">
                      <div className="text-3xl mb-2">🗳️</div>
                      <div className="text-xs text-executive-lightGray">Community</div>
                    </div>
                  </div>

                  <div className="text-center group cursor-pointer">
                    <div className="bg-executive-darkGray/50 rounded-lg p-4 border border-executive-gold/20 group-hover:border-executive-gold/40 transition-colors">
                      <div className="text-3xl mb-2">💳</div>
                      <div className="text-xs text-executive-lightGray">Auto-pay</div>
                    </div>
                  </div>

                  <div className="text-center group cursor-pointer">
                    <div className="bg-executive-darkGray/50 rounded-lg p-4 border border-executive-gold/20 group-hover:border-executive-gold/40 transition-colors">
                      <div className="text-3xl mb-2">📈</div>
                      <div className="text-xs text-executive-lightGray">TVL Growth</div>
                    </div>
                  </div>

                  <div className="text-center group cursor-pointer">
                    <div className="bg-executive-darkGray/50 rounded-lg p-4 border border-executive-gold/20 group-hover:border-executive-gold/40 transition-colors">
                      <div className="text-3xl mb-2">📋</div>
                      <div className="text-xs text-executive-lightGray">Proposals</div>
                    </div>
                  </div>

                  <div className="text-center group cursor-pointer">
                    <div className="bg-executive-darkGray/50 rounded-lg p-4 border border-executive-gold/20 group-hover:border-executive-gold/40 transition-colors">
                      <div className="text-3xl mb-2">🖥️</div>
                      <div className="text-xs text-executive-lightGray">Canisters</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* DAO Percentage Image */}
              <div className="my-12 flex justify-center">
                <img
                  src="/dao-percent.png"
                  alt="DAO Maturity Scale"
                  className="max-w-full h-auto rounded-lg shadow-2xl border border-executive-gold/20"
                  style={{ maxWidth: '800px' }}
                />
              </div>

              {/* Phase 2 */}
              <div className="bg-gradient-to-br from-executive-gold/5 to-transparent rounded-lg p-8 border border-executive-gold/20 opacity-90">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-serif text-executive-ivory">Phase 2: Real-World Integration</h3>
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">At 100% DAO</Badge>
                </div>

                {/* Transformation Visual */}
                <div className="bg-executive-darkGray/30 rounded-lg p-6 mb-6">
                  <div className="flex items-center justify-between gap-8">
                    <div className="text-center">
                      <div className="text-4xl mb-2">💬</div>
                      <p className="text-xs text-executive-lightGray/60">Discord Group</p>
                    </div>
                    <div className="text-executive-gold text-2xl animate-pulse">━━━▶</div>
                    <div className="flex gap-4">
                      <div className="text-center">
                        <div className="text-3xl">🏦</div>
                        <p className="text-xs text-executive-lightGray/60">Bank</p>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl">💳</div>
                        <p className="text-xs text-executive-lightGray/60">Cards</p>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl">📄</div>
                        <p className="text-xs text-executive-lightGray/60">LLC</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-center mt-4 text-xs text-executive-gold/70 italic">
                    From chat group to real corporation
                  </div>
                </div>

                {/* Three Visual Cards */}
                <div className="grid md:grid-cols-3 gap-6 mb-6">
                  {/* Corporate Card */}
                  <div className="bg-gradient-to-br from-executive-gold/20 to-executive-darkGray/50 rounded-lg p-6 text-center">
                    <CreditCard className="w-12 h-12 text-executive-gold mb-3 mx-auto" />
                    <h4 className="text-executive-ivory font-serif">Team Cards</h4>
                  </div>

                  {/* Bank Account */}
                  <div className="bg-gradient-to-br from-executive-gold/20 to-executive-darkGray/50 rounded-lg p-6 text-center">
                    <Banknote className="w-12 h-12 text-executive-gold mb-3 mx-auto" />
                    <h4 className="text-executive-ivory font-serif">Corporate Banking</h4>
                  </div>

                  {/* Legal Entity */}
                  <div className="bg-gradient-to-br from-executive-gold/20 to-executive-darkGray/50 rounded-lg p-6 text-center">
                    <Building2 className="w-12 h-12 text-executive-gold mb-3 mx-auto" />
                    <h4 className="text-executive-ivory font-serif">Legal Entity</h4>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-xs text-executive-lightGray/50 italic">
                    Unlock at 100% DAO maturity
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Final CTA */}
      <section className="py-20 border-t border-executive-gold/20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-display text-executive-ivory mb-4">
            Ready to Decentralize?
          </h2>
          <p className="text-executive-lightGray/70 mb-8">
            Join the projects already transforming their governance
          </p>
          <Link to="/app">
            <Button size="lg" className="bg-executive-gold text-executive-charcoal hover:bg-executive-goldLight font-serif px-12 py-6 text-xl">
              Start Now
              <ArrowRight className="ml-3 h-6 w-6" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer - Consistent with App */}
      <footer className="border-t border-executive-gold/20 mt-16 bg-executive-darkGray">
        <div className="container mx-auto px-4 py-6 text-center">
          <div className="h-px bg-executive-gold/30 w-32 mx-auto mb-4"></div>
          <p className="text-xs text-executive-lightGray/60 font-serif tracking-wider uppercase">
            Built by <a href="https://lbry.app" target="_blank" rel="noopener noreferrer" className="text-executive-gold/70 hover:text-executive-gold transition-colors">Alexandria</a> ·
            <a href="https://github.com/AlexandriaDAO/daopad" target="_blank" rel="noopener noreferrer" className="text-executive-gold/70 hover:text-executive-gold transition-colors ml-2">GitHub</a> ·
            <a href="https://x.com/alexandria_lbry" target="_blank" rel="noopener noreferrer" className="text-executive-gold/70 hover:text-executive-gold transition-colors ml-2">X</a>
          </p>
        </div>
      </footer>
    </div>
  );
}

export default Homepage;