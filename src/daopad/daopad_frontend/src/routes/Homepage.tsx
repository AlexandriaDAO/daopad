import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ArrowRight, Users, Lock, Vote, Shield,
  Banknote, FileText, CreditCard, Building2,
  CheckCircle, XCircle, TrendingUp, DollarSign
} from 'lucide-react';

function Homepage() {
  const [showMaturityImage, setShowMaturityImage] = useState(false);

  return (
    <TooltipProvider>
    <div className="min-h-screen bg-executive-charcoal text-executive-lightGray">
      {/* Gold trim */}
      <div className="h-1 bg-gradient-to-r from-transparent via-executive-gold to-transparent"></div>

      {/* Hero - The DAO Illusion */}
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

            {/* Core function statement */}
            <p className="text-3xl text-executive-goldLight font-serif mb-4">
              Turns LLCs into Smart Contracts
            </p>

            {/* The convergence explanation */}
            <div className="max-w-3xl mx-auto mb-8">
              <p className="text-lg text-executive-lightGray/80 mb-3">
                Your company, its legal contracts, and its operations are no longer three things—but <span className="text-executive-gold">one thing</span>.
              </p>
              <p className="text-sm text-executive-lightGray/60">
                The same autonomous software that executes your operations also generates your legally binding operating agreement.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Great Inventions Animation - The Missing Convergence */}
      <section className="py-16 bg-executive-darkGray/20">
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
                  <p className="text-executive-lightGray/60 mt-2 text-sm">Community funded</p>
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
                  <p className="text-executive-lightGray/60 mt-2 text-sm">Automated trust</p>
                </div>
              </div>

              {/* LLC */}
              <div className="relative flex items-center mb-12 animate-fade-in-3">
                <div className="w-1/2 text-right pr-8">
                  <h3 className="text-2xl font-serif text-executive-ivory mb-2">LLC</h3>
                  <p className="text-executive-lightGray/60 mt-2 text-sm">Legal protection</p>
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

      {/* What This Means - Value Propositions */}
      <section className="py-16 border-t border-executive-gold/20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-display text-executive-gold mb-4">
                What This Means
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* For Crypto-Natives */}
              <div className="bg-executive-darkGray/50 border border-executive-gold/30 rounded-lg p-8">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">🔐</span>
                  <h3 className="text-xl font-serif text-executive-ivory">For Crypto-Natives</h3>
                </div>
                <p className="text-executive-lightGray/70 mb-6 text-sm">
                  Your project has a white-glove framework for migrating to a legally recognized DAO LLC:
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="text-executive-gold mt-1">•</span>
                    <span className="text-executive-lightGray">Business bank account with fiat off-ramp</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-executive-gold mt-1">•</span>
                    <span className="text-executive-lightGray">Ability to own property & sign contracts</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-executive-gold mt-1">•</span>
                    <span className="text-executive-lightGray">Legal liability protection for members</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-executive-gold mt-1">•</span>
                    <span className="text-executive-lightGray">IRS compliant payroll and accounting</span>
                  </div>
                </div>
              </div>

              {/* For Business Owners */}
              <div className="bg-executive-darkGray/50 border border-executive-gold/30 rounded-lg p-8">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">🏢</span>
                  <h3 className="text-xl font-serif text-executive-ivory">For Business Owners</h3>
                </div>
                <p className="text-executive-lightGray/70 mb-6 text-sm">
                  Handle critical business operations internally without intermediaries:
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="text-executive-gold mt-1">•</span>
                    <span className="text-executive-lightGray">Take on investment partners seamlessly</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-executive-gold mt-1">•</span>
                    <span className="text-executive-lightGray">Automated payroll & equity allocations</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-executive-gold mt-1">•</span>
                    <span className="text-executive-lightGray">Self-custody with full auditability</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-executive-gold mt-1">•</span>
                    <span className="text-executive-lightGray">No more lawyers, notaries, accountants for routine ops</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Current State - Three Approaches */}
      <section className="py-16 border-t border-executive-gold/20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-5xl mx-auto">
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
                    <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span className="text-executive-lightGray/70">Personal liability</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span className="text-executive-lightGray/70">No transparency</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span className="text-executive-lightGray/70">Trust crisis</span>
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
                    <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span className="text-executive-lightGray/70">$100K+ to setup</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span className="text-executive-lightGray/70">6+ months launch time</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span className="text-executive-lightGray/70">No fiat operations</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span className="text-executive-lightGray/70">Can't sign legal contracts</span>
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
                    <span className="text-executive-lightGray">Transparent treasury</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="text-executive-lightGray">Corp banking</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="text-executive-lightGray">Protected founders</span>
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

      {/* Real World Examples - New Section */}
      <section className="py-16 border-t border-executive-gold/20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-display text-executive-gold mb-4">
                Real People, Real Solutions
              </h2>
              <p className="text-executive-lightGray/70">
                See how DAOPad transforms businesses across every industry
              </p>
            </div>

            <div className="space-y-12">
              {/* Bill's Farmstand */}
              <div className="flex items-center justify-between gap-8">
                {/* Before */}
                <div className="flex-1 bg-executive-darkGray/50 border border-executive-gold/20 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">🌾</span>
                    <h3 className="text-executive-ivory font-serif">Bill's Farmstand Idea</h3>
                  </div>
                  <p className="text-xs text-executive-lightGray/60 mb-3">The Problem:</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="text-executive-gold/30 mt-1">•</span>
                      <span className="text-executive-lightGray/70">Can't meet weekend demand</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-executive-gold/30 mt-1">•</span>
                      <span className="text-executive-lightGray/70">Needs $50K for new stand</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-executive-gold/30 mt-1">•</span>
                      <span className="text-executive-lightGray/70">Bank wants whole farm as collateral</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-executive-gold/30 mt-1">•</span>
                      <span className="text-executive-lightGray/70">Customers want to help</span>
                    </div>
                  </div>
                  <div className="mt-4 text-center text-xs text-red-400/60 uppercase tracking-wider">Stuck</div>
                </div>

                {/* Arrow */}
                <div className="flex-shrink-0 text-executive-gold text-3xl animate-pulse">
                  →
                </div>

                {/* After */}
                <div className="flex-1 bg-gradient-to-br from-executive-gold/10 to-executive-darkGray/50 border-2 border-executive-gold/50 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">🌾</span>
                    <h3 className="text-executive-gold font-serif">Farmstand DAO</h3>
                  </div>
                  <p className="text-xs text-executive-gold/80 mb-3">The Solution:</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="text-green-400 mt-1">✓</span>
                      <span className="text-executive-lightGray">Subplot & stand owned by DAO</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-400 mt-1">✓</span>
                      <span className="text-executive-lightGray">Customers buy $STAND tokens</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-400 mt-1">✓</span>
                      <span className="text-executive-lightGray">Revenue shares to holders</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-400 mt-1">✓</span>
                      <span className="text-executive-lightGray">Bill keeps main farm</span>
                    </div>
                  </div>
                  <div className="mt-4 text-center text-xs text-green-400 uppercase tracking-wider">Funded</div>
                </div>
              </div>

              {/* Joe's New Coffee Shop */}
              <div className="flex items-center justify-between gap-8">
                {/* Before */}
                <div className="flex-1 bg-executive-darkGray/50 border border-executive-gold/20 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">☕</span>
                    <h3 className="text-executive-ivory font-serif">Cup O' Joe Dream</h3>
                  </div>
                  <p className="text-xs text-executive-lightGray/60 mb-3">The Problem:</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="text-executive-gold/30 mt-1">•</span>
                      <span className="text-executive-lightGray/70">$100K to open new shop</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-executive-gold/30 mt-1">•</span>
                      <span className="text-executive-lightGray/70">Friends want to invest</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-executive-gold/30 mt-1">•</span>
                      <span className="text-executive-lightGray/70">Complex partnership docs</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-executive-gold/30 mt-1">•</span>
                      <span className="text-executive-lightGray/70">Manual profit splitting</span>
                    </div>
                  </div>
                  <div className="mt-4 text-center text-xs text-red-400/60 uppercase tracking-wider">Blocked</div>
                </div>

                {/* Arrow */}
                <div className="flex-shrink-0 text-executive-gold text-3xl animate-pulse">
                  →
                </div>

                {/* After */}
                <div className="flex-1 bg-gradient-to-br from-executive-gold/10 to-executive-darkGray/50 border-2 border-executive-gold/50 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">☕</span>
                    <h3 className="text-executive-gold font-serif">Cup O' Joe DAO</h3>
                  </div>
                  <p className="text-xs text-executive-gold/80 mb-3">The Solution:</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="text-green-400 mt-1">✓</span>
                      <span className="text-executive-lightGray">$JOE token sale</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-400 mt-1">✓</span>
                      <span className="text-executive-lightGray">CC payments → crypto treasury</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-400 mt-1">✓</span>
                      <span className="text-executive-lightGray">Auto revenue share</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-400 mt-1">✓</span>
                      <span className="text-executive-lightGray">Shop owned by DAO</span>
                    </div>
                  </div>
                  <div className="mt-4 text-center text-xs text-green-400 uppercase tracking-wider">Launched</div>
                </div>
              </div>

              {/* Alexandria Crypto Project */}
              <div className="flex items-center justify-between gap-8">
                {/* Before */}
                <div className="flex-1 bg-executive-darkGray/50 border border-executive-gold/20 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">📚</span>
                    <h3 className="text-executive-ivory font-serif">Alexandria Project</h3>
                  </div>
                  <p className="text-xs text-executive-lightGray/60 mb-3">The Problem:</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="text-executive-gold/30 mt-1">•</span>
                      <span className="text-executive-lightGray/70">$ALEX token centralized</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-executive-gold/30 mt-1">•</span>
                      <span className="text-executive-lightGray/70">Can't pay salaries legally</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-executive-gold/30 mt-1">•</span>
                      <span className="text-executive-lightGray/70">Tax authorities confused</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-executive-gold/30 mt-1">•</span>
                      <span className="text-executive-lightGray/70">Community doesn't trust</span>
                    </div>
                  </div>
                  <div className="mt-4 text-center text-xs text-red-400/60 uppercase tracking-wider">Risky</div>
                </div>

                {/* Arrow */}
                <div className="flex-shrink-0 text-executive-gold text-3xl animate-pulse">
                  →
                </div>

                {/* After */}
                <div className="flex-1 bg-gradient-to-br from-executive-gold/10 to-executive-darkGray/50 border-2 border-executive-gold/50 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">📚</span>
                    <h3 className="text-executive-gold font-serif">Alexandria DAO</h3>
                  </div>
                  <p className="text-xs text-executive-gold/80 mb-3">The Solution:</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="text-green-400 mt-1">✓</span>
                      <span className="text-executive-lightGray">Community controls treasury</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-400 mt-1">✓</span>
                      <span className="text-executive-lightGray">Fiat salaries via LLC</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-400 mt-1">✓</span>
                      <span className="text-executive-lightGray">IRS compliant payroll</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-400 mt-1">✓</span>
                      <span className="text-executive-lightGray">100% transparent ops</span>
                    </div>
                  </div>
                  <div className="mt-4 text-center text-xs text-green-400 uppercase tracking-wider">Legitimate</div>
                </div>
              </div>
            </div>

            <div className="mt-12 text-center">
              <p className="text-executive-lightGray/60 text-sm italic">
                DAOPad provides the payment rails and entity structure for any business
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How to Use This NOW - Practical Steps */}
      <section className="py-16 border-t border-executive-gold/20 bg-executive-darkGray/20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-display text-executive-gold mb-4">
                How to Use This NOW
              </h2>
              <p className="text-executive-lightGray/70">
                If you're an LLC owner, you can start today
              </p>
            </div>

            <div className="bg-gradient-to-br from-executive-gold/10 to-executive-darkGray/50 border-2 border-executive-gold/50 rounded-lg p-8">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-executive-gold/20 border border-executive-gold flex items-center justify-center text-executive-gold font-bold">
                    1
                  </div>
                  <div>
                    <h4 className="text-executive-ivory font-semibold mb-2">Open an Orbit Station</h4>
                    <p className="text-executive-lightGray/70 text-sm">
                      Link it to DAOPad.org and move some company assets there. 5 minute setup.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-executive-gold/20 border border-executive-gold flex items-center justify-center text-executive-gold font-bold">
                    2
                  </div>
                  <div>
                    <h4 className="text-executive-ivory font-semibold mb-2">Update Operating Agreement</h4>
                    <p className="text-executive-lightGray/70 text-sm">
                      Reference the autonomously generated equivalent as binding. The smart contract <span className="italic">is</span> the agreement.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-executive-gold/20 border border-executive-gold flex items-center justify-center text-executive-gold font-bold">
                    3
                  </div>
                  <div>
                    <h4 className="text-executive-ivory font-semibold mb-2">Start Operating</h4>
                    <p className="text-executive-lightGray/70 text-sm">
                      Pay employees without intermediaries, interchange between fiat/stablecoins from your business bank, and self-custody your assets while keeping full auditability for tax time.
                    </p>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-executive-gold/30 text-center">
                  <p className="text-executive-gold/80 text-sm italic">
                    Congratulations! You're now among the first companies that can self-custody and operate peer-to-peer.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Now - Technical Explanation */}
      <section className="py-16 border-t border-executive-gold/20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-display text-executive-gold mb-4">
                Why Now?
              </h2>
            </div>

            <div className="space-y-6">
              <p className="text-executive-lightGray/80 text-lg">
                Most of the 2014-2017 rhetoric around 'Smart Contracts' was about moving legal contracts into tamper-proof code. It was coined as such because that's how it was understood.
              </p>

              <p className="text-executive-lightGray/80 text-lg">
                <span className="text-executive-gold">So why has it never succeeded on a meaningful scale?</span>
              </p>

              <div className="bg-executive-darkGray/50 border border-executive-gold/30 rounded-lg p-6">
                <p className="text-executive-lightGray/70 mb-4">
                  The answer lies in the limitations of non actor-model blockchains, which are not sophisticated enough to fulfill the terms of most contracts:
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="text-executive-gold mt-1">✗</span>
                    <span className="text-executive-lightGray">Cannot provide their own event triggers</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-executive-gold mt-1">✗</span>
                    <span className="text-executive-lightGray">Don't support code execution through liquid democracy</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-executive-gold mt-1">✗</span>
                    <span className="text-executive-lightGray">Cannot mutate themselves to meet elastic clauses</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-executive-gold/10 to-executive-darkGray/50 border-2 border-executive-gold/50 rounded-lg p-6">
                <p className="text-executive-ivory font-semibold mb-3">
                  The Internet Computer's actor-model changes everything:
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">✓</span>
                    <span className="text-executive-lightGray">Autonomous event triggers (timers, HTTP outcalls)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">✓</span>
                    <span className="text-executive-lightGray">Liquid democracy with weighted voting power</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">✓</span>
                    <span className="text-executive-lightGray">Self-modifying code that adapts to governance decisions</span>
                  </div>
                </div>
              </div>

              <p className="text-executive-lightGray/70 text-center italic text-sm pt-4">
                For the first time, smart contracts can actually fulfill the promise of self-executing legal agreements.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Gradual Transition */}
      <section className="py-20 border-t border-executive-gold/20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-display text-executive-gold mb-4">
                Start Your DAO Journey Today
              </h2>
              <p className="text-executive-lightGray/70 mb-2">
                Anyone can start - just lock liquidity and begin the transition
              </p>
              <p className="text-executive-lightGray/50 text-sm">
                No founders needed. No permission required. Just participation.
              </p>
            </div>

            {/* Tiered Services */}
            <div className="grid md:grid-cols-2 gap-8">
              {/* Community DAO */}
              <div className="bg-executive-darkGray/50 rounded-lg p-8 border border-executive-gold/30">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-serif text-executive-ivory">Community DAO</h3>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Start Today</Badge>
                </div>
                <p className="text-sm text-executive-lightGray/60 mb-6">
                  Anyone can initiate by locking liquidity
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-executive-lightGray">Multi-sig Treasury</span>
                      <p className="text-xs text-executive-lightGray/50 mt-1">Transparent on-chain management</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-executive-lightGray">Token Voting</span>
                      <p className="text-xs text-executive-lightGray/50 mt-1">Weighted by locked liquidity</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-executive-lightGray">Proposal System</span>
                      <p className="text-xs text-executive-lightGray/50 mt-1">Community-driven decisions</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-executive-lightGray">Auto Payments</span>
                      <p className="text-xs text-executive-lightGray/50 mt-1">Recurring team compensation</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-executive-lightGray">TVL Incentives</span>
                      <p className="text-xs text-executive-lightGray/50 mt-1">Grow treasury with rewards</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-executive-lightGray">Canister Management</span>
                      <p className="text-xs text-executive-lightGray/50 mt-1">Deploy and control IC apps</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Official DAO */}
              <div className="bg-gradient-to-br from-executive-gold/10 to-executive-darkGray/50 rounded-lg p-8 border-2 border-executive-gold/50">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-serif text-executive-gold">Official DAO</h3>
                  <Badge className="bg-executive-gold/20 text-executive-goldLight border-executive-gold/30 text-xs">100% Mature</Badge>
                </div>
                <p className="text-sm text-executive-lightGray/60 mb-6">
                  Achieved through community participation
                </p>
                <div className="space-y-3">
                  <div className="text-xs text-executive-gold/70 uppercase tracking-wider mb-2">Everything in Community DAO plus:</div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-executive-gold mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-executive-ivory">Legal Entity (LLC)</span>
                      <p className="text-xs text-executive-lightGray/50 mt-1">Real-world corporate structure</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-executive-gold mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-executive-ivory">Corporate Banking</span>
                      <p className="text-xs text-executive-lightGray/50 mt-1">Traditional finance integration</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-executive-gold mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-executive-ivory">Team Cards</span>
                      <p className="text-xs text-executive-lightGray/50 mt-1">Physical cards for spending</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-executive-gold mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-executive-ivory">IRS Compliant Payroll</span>
                      <p className="text-xs text-executive-lightGray/50 mt-1">Legal salary payments in fiat</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-executive-gold mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-executive-ivory">Investment Ready</span>
                      <p className="text-xs text-executive-lightGray/50 mt-1">Accept VC and institutional funds</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-executive-gold mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-executive-ivory">Legal Protection</span>
                      <p className="text-xs text-executive-lightGray/50 mt-1">Limited liability for members</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* DAO Journey Visual - Hidden by default */}
            <div className="mt-12 text-center">
              <button
                onClick={() => setShowMaturityImage(!showMaturityImage)}
                className="text-executive-gold/70 hover:text-executive-gold text-sm underline decoration-dotted underline-offset-4 transition-colors"
              >
                {showMaturityImage ? 'Hide' : 'View'} DAO Maturity Journey →
              </button>

              {showMaturityImage && (
                <div className="mt-8 flex justify-center animate-fade-in">
                  <img
                    src="/dao-percent.png"
                    alt="DAO Maturity Scale"
                    className="max-w-full h-auto rounded-lg shadow-2xl border border-executive-gold/20"
                    style={{ maxWidth: '800px' }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Revenue Model & Legal Clarity */}
      <section className="py-16 border-t border-executive-gold/20 bg-executive-darkGray/20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Revenue Model */}
              <div className="bg-executive-darkGray/50 border border-executive-gold/30 rounded-lg p-8">
                <div className="flex items-center gap-3 mb-4">
                  <TrendingUp className="w-8 h-8 text-executive-gold" />
                  <h3 className="text-xl font-serif text-executive-ivory">Revenue Model</h3>
                </div>
                <p className="text-executive-lightGray/70 mb-4">
                  <span className="text-executive-gold text-2xl font-bold">1%</span> of traditional LLC dealflow is autonomously distributed to $ALEX stakers (the parent DAO).
                </p>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 mt-1 flex-shrink-0" />
                    <span className="text-executive-lightGray">Existing liquid tokens: <span className="font-semibold">FREE</span> (no fee, no legal help)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 mt-1 flex-shrink-0" />
                    <span className="text-executive-lightGray">Traditional LLCs: 1% of equity transfers only</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 mt-1 flex-shrink-0" />
                    <span className="text-executive-lightGray">No recurring fees, no hidden costs</span>
                  </div>
                </div>
              </div>

              {/* Are These Securities? */}
              <div className="bg-executive-darkGray/50 border border-executive-gold/30 rounded-lg p-8">
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="w-8 h-8 text-executive-gold" />
                  <h3 className="text-xl font-serif text-executive-ivory">Are These Unregistered Securities?</h3>
                </div>
                <div className="space-y-4 text-sm">
                  <div>
                    <p className="text-executive-lightGray/70 mb-2">
                      <span className="font-semibold text-executive-gold">Existing liquid tokens:</span> Can use our software freely. We take no fee and provide no legal help to disassociate from security risk.
                    </p>
                  </div>
                  <div>
                    <p className="text-executive-lightGray/70 mb-2">
                      <span className="font-semibold text-executive-gold">Target customer - Traditional LLCs:</span> Ownership enforced with smart contracts as a digital mirror of traditional equity transfers.
                    </p>
                  </div>
                  <div className="bg-executive-gold/10 border border-executive-gold/30 rounded p-3">
                    <p className="text-executive-lightGray text-xs">
                      These LLCs do not have liquid tokens and follow traditional investment processes (set valuation, participating member status). <span className="font-semibold">Not a security risk.</span>
                    </p>
                  </div>
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
    </TooltipProvider>
  );
}

export default Homepage;