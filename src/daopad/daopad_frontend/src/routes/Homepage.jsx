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
            <p className="text-2xl text-executive-goldLight font-serif mb-12">
              The goldilocks solution for DAO treasury management
            </p>

            {/* Three-way Comparison */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              {/* Team Wallets */}
              <div className="bg-executive-darkGray/50 border border-executive-gold/20 rounded-lg p-6">
                <h3 className="text-executive-lightGray text-lg font-bold mb-4">
                  Team Wallets
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="text-executive-lightGray/70">Simple setup</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="text-executive-lightGray/70">Full control</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span className="text-executive-lightGray/70">Trust-based</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span className="text-executive-lightGray/70">No transparency</span>
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
                <h3 className="text-executive-lightGray text-lg font-bold mb-4">
                  SNS / Full DAO
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="text-executive-lightGray/70">Fully decentralized</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="text-executive-lightGray/70">Token voting</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span className="text-executive-lightGray/70">Complex setup</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span className="text-executive-lightGray/70">Rigid structure</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span className="text-executive-lightGray/70">High overhead</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-executive-gold/10">
                  <span className="text-xs text-yellow-500">Too Complex</span>
                </div>
              </div>

              {/* DAOPad */}
              <div className="bg-gradient-to-br from-executive-gold/10 to-executive-darkGray/50 border-2 border-executive-gold/50 rounded-lg p-6">
                <h3 className="text-executive-gold text-lg font-bold mb-4 flex items-center justify-center">
                  <span className="text-2xl mr-2">✨</span>
                  DAOPad
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="text-executive-lightGray">Easy to start</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="text-executive-lightGray">Community governed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="text-executive-lightGray">LP-based voting</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="text-executive-lightGray">Transparent</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="text-executive-lightGray">Flexible</span>
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
                  <p className="text-sm text-executive-gold/60 uppercase tracking-wider">Decentralized</p>
                  <p className="text-executive-lightGray/60 mt-2">Groups create shared ventures</p>
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
                  <p className="text-sm text-executive-gold/60 uppercase tracking-wider">Autonomous</p>
                  <p className="text-executive-lightGray/60 mt-2">Software as living entity</p>
                </div>
              </div>

              {/* LLC */}
              <div className="relative flex items-center mb-12 animate-fade-in-3">
                <div className="w-1/2 text-right pr-8">
                  <h3 className="text-2xl font-serif text-executive-ivory mb-2">LLC</h3>
                  <p className="text-sm text-executive-gold/60 uppercase tracking-wider">Organization</p>
                  <p className="text-executive-lightGray/60 mt-2">Ventures with limited risk</p>
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
                      <p className="text-xs text-executive-gold/50 mt-2 italic">Currently unfulfilled...</p>
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

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-executive-gold text-sm uppercase tracking-wider mb-3">Treasury Operations</h4>
                    <ul className="space-y-2 text-sm text-executive-lightGray">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span>Multi-signature treasury management</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span>Transparent salary distributions</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span>Automated recurring payments</span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-executive-gold text-sm uppercase tracking-wider mb-3">Governance & Growth</h4>
                    <ul className="space-y-2 text-sm text-executive-lightGray">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span>TVL incentive mechanisms</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span>Community proposal system</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span>Automated canister management</span>
                      </li>
                    </ul>
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

                {/* Three Visual Cards */}
                <div className="grid md:grid-cols-3 gap-6 mb-6">
                  {/* Corporate Card */}
                  <div className="bg-gradient-to-br from-executive-gold/20 to-executive-darkGray/50 rounded-lg p-6">
                    <CreditCard className="w-12 h-12 text-executive-gold mb-3" />
                    <h4 className="text-executive-ivory font-serif mb-1">Team Cards</h4>
                    <p className="text-xs text-executive-lightGray/60">Physical cards for team spending</p>
                  </div>

                  {/* Bank Account */}
                  <div className="bg-gradient-to-br from-executive-gold/20 to-executive-darkGray/50 rounded-lg p-6">
                    <Banknote className="w-12 h-12 text-executive-gold mb-3" />
                    <h4 className="text-executive-ivory font-serif mb-1">Corporate Banking</h4>
                    <p className="text-xs text-executive-lightGray/60">Real bank accounts for DAOs</p>
                  </div>

                  {/* Legal Entity */}
                  <div className="bg-gradient-to-br from-executive-gold/20 to-executive-darkGray/50 rounded-lg p-6">
                    <Building2 className="w-12 h-12 text-executive-gold mb-3" />
                    <h4 className="text-executive-ivory font-serif mb-1">Legal Entity</h4>
                    <p className="text-xs text-executive-lightGray/60">LLC wrapper for contracts</p>
                  </div>
                </div>

                {/* Additional Features */}
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border border-executive-gold/50" />
                    <span className="text-executive-lightGray/70">Sign legal contracts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border border-executive-gold/50" />
                    <span className="text-executive-lightGray/70">Own real property</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border border-executive-gold/50" />
                    <span className="text-executive-lightGray/70">File corporate taxes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border border-executive-gold/50" />
                    <span className="text-executive-lightGray/70">Crypto-to-fiat revenue bridge</span>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-executive-gold/10 text-center">
                  <p className="text-xs text-executive-lightGray/50 italic">
                    Transform from a crypto entity to a legitimate corporation
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