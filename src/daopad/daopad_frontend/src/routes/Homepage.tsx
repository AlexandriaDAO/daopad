import React, { useState, useRef, useEffect } from 'react';
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

  // Animation control
  const [animationPhase, setAnimationPhase] = useState('idle'); // 'idle' | 'playing' | 'complete'
  const convergenceSectionRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Intersection observer to replay on view
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && animationPhase === 'idle') {
          setAnimationPhase('playing');
          // Trigger animation sequence
          setTimeout(() => setAnimationPhase('complete'), 3500);
        }
      },
      { threshold: 0.3 }
    );

    if (convergenceSectionRef.current) {
      observer.observe(convergenceSectionRef.current);
    }

    return () => observer.disconnect();
  }, [animationPhase]);

  // Particle system
  useEffect(() => {
    if (animationPhase !== 'playing' || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const particles = [];

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Create particles
    class Particle {
      constructor(startX, startY, targetX, targetY) {
        this.x = startX;
        this.y = startY;
        this.targetX = targetX;
        this.targetY = targetY;
        this.progress = 0;
        this.speed = 0.02 + Math.random() * 0.02;
        this.size = 2 + Math.random() * 3;
        this.alpha = 0.8;
      }

      update() {
        this.progress += this.speed;
        // Bezier curve for natural flow
        const t = this.progress;
        this.x = this.x + (this.targetX - this.x) * t;
        this.y = this.y + (this.targetY - this.y) * t;
        this.alpha = 1 - t; // Fade as approaching center
      }

      draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212, 175, 55, ${this.alpha})`;
        ctx.fill();
      }
    }

    // Spawn particles from each box position
    const spawnParticles = () => {
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Top box (Smart Contract)
      particles.push(new Particle(centerX, centerY * 0.18, centerX, centerY));

      // Bottom left (Operating Agreement)
      particles.push(new Particle(centerX * 0.28, centerY * 1.72, centerX, centerY));

      // Bottom right (LLC)
      particles.push(new Particle(centerX * 1.72, centerY * 1.72, centerX, centerY));
    };

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Spawn new particles periodically during convergence phase
      if (Math.random() < 0.3) spawnParticles();

      // Update and draw particles
      particles.forEach((particle, index) => {
        particle.update();
        particle.draw(ctx);

        // Remove completed particles
        if (particle.progress >= 1) {
          particles.splice(index, 1);
        }
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Start animation loop at 0.8s (phase 2 start)
    const startTimeout = setTimeout(() => {
      animate();
    }, 800);

    // Stop at 3s (phase 3 end)
    const stopTimeout = setTimeout(() => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }, 3000);

    return () => {
      clearTimeout(startTimeout);
      clearTimeout(stopTimeout);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [animationPhase]);

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
              <p className="text-lg text-executive-lightGray/80">
                Your company, contracts, and operations become <span className="text-executive-gold">one autonomous system</span>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The Convergence - Circular Diagram */}
      <section
        ref={convergenceSectionRef}
        className="py-16 bg-executive-darkGray/20"
      >
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {/* Circular Diagram with Canvas Overlay */}
            <div className="relative w-full max-w-2xl mx-auto" style={{ aspectRatio: '1/1' }}>

              {/* Particle Canvas */}
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ zIndex: 5 }}
              />

              {/* Center - One Thing */}
              <div className={`
                absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10
                ${animationPhase === 'playing' ? 'animate-convergence-center' : ''}
                ${animationPhase === 'complete' ? 'animate-float-subtle' : ''}
              `}>
                <div className="relative">
                  {/* Dynamic glow that intensifies during phase 3-4 */}
                  <div className={`
                    absolute inset-0 blur-xl
                    ${animationPhase === 'complete'
                      ? 'bg-executive-gold/30 animate-pulse-slow'
                      : 'bg-executive-gold/20 animate-pulse'
                    }
                  `}></div>

                  <div className="relative bg-executive-charcoal border-2 border-executive-gold rounded-full w-32 h-32 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-3xl mb-1">⚡</div>
                      <div className="text-xs text-executive-gold font-semibold">One Thing</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top - Smart Contract */}
              <div className={`
                absolute left-1/2 -translate-x-1/2
                ${animationPhase === 'idle' ? 'top-[-20%] opacity-0' : ''}
                ${animationPhase === 'playing' ? 'animate-converge-from-top' : ''}
                ${animationPhase === 'complete' ? 'top-0 opacity-100 animate-float-subtle-1' : ''}
              `}>
                <div className="bg-executive-darkGray/80 border border-executive-gold/30 rounded-lg p-6 text-center w-40 relative">
                  {/* Glow trail effect during convergence */}
                  <div className={`
                    absolute inset-0 blur-md opacity-0
                    ${animationPhase === 'playing' ? 'animate-glow-trail' : ''}
                  `}></div>

                  <div className="text-2xl mb-2">⚙️</div>
                  <div className="text-executive-ivory font-semibold text-sm mb-1">Smart Contract</div>
                  <div className="text-executive-lightGray/60 text-xs">Executable code</div>
                </div>
              </div>

              {/* Bottom Left - Operating Agreement */}
              <div className={`
                absolute bottom-0 left-0
                ${animationPhase === 'idle' ? 'translate-x-[-30%] translate-y-[20%] opacity-0' : ''}
                ${animationPhase === 'playing' ? 'animate-converge-from-bottom-left' : ''}
                ${animationPhase === 'complete' ? 'opacity-100 animate-float-subtle-2' : ''}
              `}>
                <div className="bg-executive-darkGray/80 border border-executive-gold/30 rounded-lg p-6 text-center w-40 relative">
                  <div className={`
                    absolute inset-0 blur-md opacity-0
                    ${animationPhase === 'playing' ? 'animate-glow-trail' : ''}
                  `}></div>

                  <div className="text-2xl mb-2">📄</div>
                  <div className="text-executive-ivory font-semibold text-sm mb-1">Operating Agreement</div>
                  <div className="text-executive-lightGray/60 text-xs">Legal contract</div>
                </div>
              </div>

              {/* Bottom Right - LLC */}
              <div className={`
                absolute bottom-0 right-0
                ${animationPhase === 'idle' ? 'translate-x-[30%] translate-y-[20%] opacity-0' : ''}
                ${animationPhase === 'playing' ? 'animate-converge-from-bottom-right' : ''}
                ${animationPhase === 'complete' ? 'opacity-100 animate-float-subtle-3' : ''}
              `}>
                <div className="bg-executive-darkGray/80 border border-executive-gold/30 rounded-lg p-6 text-center w-40 relative">
                  <div className={`
                    absolute inset-0 blur-md opacity-0
                    ${animationPhase === 'playing' ? 'animate-glow-trail' : ''}
                  `}></div>

                  <div className="text-2xl mb-2">🏢</div>
                  <div className="text-executive-ivory font-semibold text-sm mb-1">LLC Entity</div>
                  <div className="text-executive-lightGray/60 text-xs">Legal structure</div>
                </div>
              </div>

              {/* Connection Lines - Enhanced SVG */}
              <svg
                className={`
                  absolute inset-0 w-full h-full
                  ${animationPhase === 'complete' ? 'opacity-100' : 'opacity-0'}
                `}
                style={{ zIndex: 1, transition: 'opacity 0.5s ease-in 2.8s' }}
              >
                <defs>
                  <marker id="arrowhead-enhanced" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="rgb(212, 175, 55, 0.8)" />
                  </marker>

                  {/* Gradient for glowing effect */}
                  <linearGradient id="arrow-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style={{ stopColor: 'rgb(212, 175, 55)', stopOpacity: 0.3 }} />
                    <stop offset="50%" style={{ stopColor: 'rgb(212, 175, 55)', stopOpacity: 0.8 }} />
                    <stop offset="100%" style={{ stopColor: 'rgb(212, 175, 55)', stopOpacity: 0.3 }} />
                  </linearGradient>
                </defs>

                {/* Bidirectional arrows with glow */}
                <g className="animate-arrow-glow">
                  {/* Top to Bottom Left */}
                  <path d="M 50% 18% L 28% 72%"
                    stroke="url(#arrow-gradient)"
                    strokeWidth="2"
                    fill="none"
                    markerEnd="url(#arrowhead-enhanced)"
                  />
                  <path d="M 28% 72% L 50% 18%"
                    stroke="url(#arrow-gradient)"
                    strokeWidth="2"
                    fill="none"
                    markerEnd="url(#arrowhead-enhanced)"
                  />

                  {/* Bottom Left to Bottom Right */}
                  <path d="M 32% 82% L 68% 82%"
                    stroke="url(#arrow-gradient)"
                    strokeWidth="2"
                    fill="none"
                    markerEnd="url(#arrowhead-enhanced)"
                  />
                  <path d="M 68% 82% L 32% 82%"
                    stroke="url(#arrow-gradient)"
                    strokeWidth="2"
                    fill="none"
                    markerEnd="url(#arrowhead-enhanced)"
                  />

                  {/* Bottom Right to Top */}
                  <path d="M 72% 72% L 50% 18%"
                    stroke="url(#arrow-gradient)"
                    strokeWidth="2"
                    fill="none"
                    markerEnd="url(#arrowhead-enhanced)"
                  />
                  <path d="M 50% 18% L 72% 72%"
                    stroke="url(#arrow-gradient)"
                    strokeWidth="2"
                    fill="none"
                    markerEnd="url(#arrowhead-enhanced)"
                  />
                </g>
              </svg>
            </div>

            <div className="text-center mt-12">
              <p className={`
                text-executive-lightGray/70 text-sm italic
                ${animationPhase === 'complete' ? 'animate-fade-in' : 'opacity-0'}
              `}
                style={{ animationDelay: '3.2s' }}
              >
                No longer separate — one unified autonomous system
              </p>
            </div>
          </div>
        </div>

        {/* Enhanced Convergence Animations */}
        <style jsx>{`
          /* Phase 1-2: Convergence from far positions */
          @keyframes converge-from-top {
            0% {
              top: -20%;
              opacity: 0.4;
              filter: saturate(0.7);
            }
            40% {
              opacity: 0.6;
            }
            100% {
              top: 0;
              opacity: 1;
              filter: saturate(1);
            }
          }

          @keyframes converge-from-bottom-left {
            0% {
              transform: translate(-30%, 20%);
              opacity: 0.4;
              filter: saturate(0.7);
            }
            40% {
              opacity: 0.6;
            }
            100% {
              transform: translate(0, 0);
              opacity: 1;
              filter: saturate(1);
            }
          }

          @keyframes converge-from-bottom-right {
            0% {
              transform: translate(30%, 20%);
              opacity: 0.4;
              filter: saturate(0.7);
            }
            40% {
              opacity: 0.6;
            }
            100% {
              transform: translate(0, 0);
              opacity: 1;
              filter: saturate(1);
            }
          }

          /* Phase 3-4: Center unification */
          @keyframes convergence-center {
            0% {
              transform: translate(-50%, -50%) scale(0.9);
              opacity: 0.8;
            }
            50% {
              transform: translate(-50%, -50%) scale(1);
            }
            70% {
              transform: translate(-50%, -50%) scale(1.1);
              opacity: 1;
            }
            100% {
              transform: translate(-50%, -50%) scale(1);
              opacity: 1;
            }
          }

          /* Phase 5: Sustain animations */
          @keyframes float-subtle {
            0%, 100% {
              transform: translate(-50%, -50%) translateY(0);
            }
            50% {
              transform: translate(-50%, -50%) translateY(-5px);
            }
          }

          @keyframes float-subtle-1 {
            0%, 100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-3px);
            }
          }

          @keyframes float-subtle-2 {
            0%, 100% {
              transform: translateY(0) translateX(0);
            }
            33% {
              transform: translateY(-2px) translateX(1px);
            }
            66% {
              transform: translateY(1px) translateX(-1px);
            }
          }

          @keyframes float-subtle-3 {
            0%, 100% {
              transform: translateY(0) translateX(0);
            }
            33% {
              transform: translateY(2px) translateX(-1px);
            }
            66% {
              transform: translateY(-1px) translateX(1px);
            }
          }

          @keyframes pulse-slow {
            0%, 100% {
              opacity: 0.3;
            }
            50% {
              opacity: 0.5;
            }
          }

          /* Glow trail effect during convergence */
          @keyframes glow-trail {
            0% {
              opacity: 0;
            }
            50% {
              opacity: 0.6;
              background: radial-gradient(circle, rgba(212, 175, 55, 0.4) 0%, transparent 70%);
            }
            100% {
              opacity: 0;
            }
          }

          /* Arrow glow effect */
          @keyframes arrow-glow {
            0%, 100% {
              filter: drop-shadow(0 0 2px rgba(212, 175, 55, 0.4));
            }
            50% {
              filter: drop-shadow(0 0 6px rgba(212, 175, 55, 0.8));
            }
          }

          /* Fade in effect */
          @keyframes fade-in {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          /* Apply animations with proper timing */
          .animate-converge-from-top {
            animation: converge-from-top 2s cubic-bezier(0.4, 0, 0.2, 1) 0s both;
          }

          .animate-converge-from-bottom-left {
            animation: converge-from-bottom-left 2s cubic-bezier(0.4, 0, 0.2, 1) 0.1s both;
          }

          .animate-converge-from-bottom-right {
            animation: converge-from-bottom-right 2s cubic-bezier(0.4, 0, 0.2, 1) 0.2s both;
          }

          .animate-convergence-center {
            animation: convergence-center 1.5s cubic-bezier(0.4, 0, 0.2, 1) 2s both;
          }

          .animate-float-subtle {
            animation: float-subtle 4s ease-in-out 3.5s infinite;
          }

          .animate-float-subtle-1 {
            animation: float-subtle-1 5s ease-in-out infinite;
          }

          .animate-float-subtle-2 {
            animation: float-subtle-2 6s ease-in-out 0.5s infinite;
          }

          .animate-float-subtle-3 {
            animation: float-subtle-3 5.5s ease-in-out 1s infinite;
          }

          .animate-pulse-slow {
            animation: pulse-slow 2s ease-in-out infinite;
          }

          .animate-glow-trail {
            animation: glow-trail 1.5s ease-out 0.8s both;
          }

          .animate-arrow-glow {
            animation: arrow-glow 2s ease-in-out 2.8s infinite;
          }

          .animate-fade-in {
            animation: fade-in 0.5s ease-out both;
          }

          /* Reduced motion support */
          @media (prefers-reduced-motion: reduce) {
            .animate-converge-from-top,
            .animate-converge-from-bottom-left,
            .animate-converge-from-bottom-right,
            .animate-convergence-center,
            .animate-float-subtle,
            .animate-float-subtle-1,
            .animate-float-subtle-2,
            .animate-float-subtle-3,
            .animate-glow-trail,
            .animate-arrow-glow,
            .animate-pulse-slow,
            .animate-fade-in {
              animation: none !important;
            }

            /* Show final state immediately */
            div[class*="converge"] {
              opacity: 1 !important;
              transform: none !important;
            }
          }
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

      {/* Two Paths to Decentralization */}
      <section className="py-20 border-t border-executive-gold/20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-display text-executive-gold mb-4">
                Two Paths to Decentralization
              </h2>
              <p className="text-executive-lightGray/70">
                DAOPad serves both crypto-native projects and traditional businesses
              </p>
            </div>

            {/* Tiered Services */}
            <div className="grid md:grid-cols-2 gap-8">
              {/* Liquid Token DAOs */}
              <div className="bg-executive-darkGray/50 rounded-lg p-8 border border-executive-gold/30">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-serif text-executive-ivory">Liquid Token DAOs</h3>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Free & Open</Badge>
                </div>
                <p className="text-sm text-executive-lightGray/60 mb-6">
                  For crypto projects with liquid, decentralized tokens
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

              {/* Traditional LLCs */}
              <div className="bg-gradient-to-br from-executive-gold/10 to-executive-darkGray/50 rounded-lg p-8 border-2 border-executive-gold/50">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-serif text-executive-gold">Traditional LLCs</h3>
                  <Badge className="bg-executive-gold/20 text-executive-goldLight border-executive-gold/30 text-xs">1% Revenue</Badge>
                </div>
                <p className="text-sm text-executive-lightGray/60 mb-6">
                  For established businesses with real legal contracts and illiquid equity
                </p>
                <div className="space-y-3">
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