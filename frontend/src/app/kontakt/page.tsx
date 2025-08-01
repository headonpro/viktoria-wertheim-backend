"use client"

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import PageLayout from '@/components/PageLayout'
import dynamic from 'next/dynamic'
import { IconMail, IconPhone, IconMapPin, IconArrowRight, IconArrowLeft, IconCheck, IconAt, IconMessage, IconTag, IconUser, IconUsers, IconCreditCard, IconClock } from '@tabler/icons-react'

// Dynamic Import für animierte Komponenten - löst SSR-Probleme
const AnimatedSection = dynamic(
  () => import('@/components/AnimatedSection'),
  { ssr: false }
)

export default function KontaktPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [formStatus, setFormStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })

  const steps = [
    {
      id: 'name',
      title: 'Kontaktiere uns.',
      subtitle: '',
      icon: IconMessage,
      field: 'name',
      type: 'text',
      placeholder: 'Wie sollen wir dich nennen?',
      validation: (value: string) => value.length >= 2
    },
    {
      id: 'email',
      title: 'Deine E-Mail?',
      subtitle: 'Damit wir dir antworten können',
      icon: IconAt,
      field: 'email',
      type: 'email',
      placeholder: 'deine@email.de',
      validation: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    },
    {
      id: 'subject',
      title: 'Worum geht es?',
      subtitle: 'Wähle ein Thema aus',
      icon: IconTag,
      field: 'subject',
      type: 'select',
      options: [
        'Allgemeine Anfrage',
        'Mitgliedschaft',
        'Sponsoring',
        'Jugendabteilung',
        'Veranstaltungen'
      ],
      validation: (value: string) => value.length > 0
    },
    {
      id: 'message',
      title: 'Deine Nachricht',
      subtitle: '',
      icon: IconMessage,
      field: 'message',
      type: 'textarea',
      placeholder: 'Schreib uns deine Nachricht...',
      validation: (value: string) => value.length >= 10
    }
  ]

  const handleChange = (value: string) => {
    const currentField = steps[currentStep].field
    setFormData(prev => ({ ...prev, [currentField]: value }))
  }

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const isCurrentStepValid = () => {
    const step = steps[currentStep]
    const value = formData[step.field as keyof typeof formData]
    return step.validation(value)
  }

  const handleSubmit = async () => {
    setFormStatus('sending')
    // Simulate API call
    setTimeout(() => {
      setFormStatus('success')
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: ''
      })
      setCurrentStep(0)
    }, 2000)
  }

  return (
    <PageLayout>
      <div className="px-4 md:px-6 lg:px-0">
        <div className="container max-w-4xl lg:max-w-5xl lg:mx-auto">
          
          {/* Quick Contact Actions */}
          <div className="mt-4 md:mt-9 lg:mt-8">
            <AnimatedSection className="py-2 md:py-3" delay={0.1}>
              <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
                <motion.button
                  onClick={() => navigator.clipboard.writeText('info@viktoria-wertheim.de')}
                  className="relative bg-gray-100/11 dark:bg-white/[0.012] backdrop-blur-xl rounded-xl aspect-square flex flex-col items-center justify-center hover:bg-gray-100/15 dark:hover:bg-white/[0.018] transition-all duration-300 overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_2px_8px_rgba(255,255,255,0.04)] before:content-[''] before:absolute before:inset-0 before:rounded-xl before:p-1.5 before:bg-gradient-to-br before:from-white/2 before:via-white/4 before:to-white/8 dark:before:from-white/0.4 dark:before:via-white/1 dark:before:to-white/2 before:mask-composite:subtract before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:pointer-events-none after:content-[''] after:absolute after:inset-[6px] after:rounded-[calc(0.75rem-6px)] after:bg-gradient-to-tl after:from-transparent after:via-white/[0.01] after:to-white/[0.02] after:pointer-events-none after:z-0 hover:transform hover:translateY(-2px)"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <IconMail size={32} className="text-viktoria-blue dark:text-viktoria-yellow mb-2 relative z-10" style={{ strokeWidth: 1.5 }} />
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide relative z-10">E-Mail</span>
                </motion.button>

                <motion.a
                  href="tel:+4993421234567"
                  className="relative bg-gray-100/11 dark:bg-white/[0.012] backdrop-blur-xl rounded-xl aspect-square flex flex-col items-center justify-center hover:bg-gray-100/15 dark:hover:bg-white/[0.018] transition-all duration-300 overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_2px_8px_rgba(255,255,255,0.04)] before:content-[''] before:absolute before:inset-0 before:rounded-xl before:p-1.5 before:bg-gradient-to-br before:from-white/2 before:via-white/4 before:to-white/8 dark:before:from-white/0.4 dark:before:via-white/1 dark:before:to-white/2 before:mask-composite:subtract before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:pointer-events-none after:content-[''] after:absolute after:inset-[6px] after:rounded-[calc(0.75rem-6px)] after:bg-gradient-to-tl after:from-transparent after:via-white/[0.01] after:to-white/[0.02] after:pointer-events-none after:z-0 hover:transform hover:translateY(-2px)"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <IconPhone size={32} className="text-viktoria-blue dark:text-viktoria-yellow mb-2 relative z-10" style={{ strokeWidth: 1.5 }} />
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide relative z-10">Telefon</span>
                </motion.a>

                <motion.button
                  onClick={() => window.open('https://maps.google.com/?q=Haslocherweg+85,+97877+Wertheim-Bestenheid', '_blank')}
                  className="relative bg-gray-100/11 dark:bg-white/[0.012] backdrop-blur-xl rounded-xl aspect-square flex flex-col items-center justify-center hover:bg-gray-100/15 dark:hover:bg-white/[0.018] transition-all duration-300 overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_2px_8px_rgba(255,255,255,0.04)] before:content-[''] before:absolute before:inset-0 before:rounded-xl before:p-1.5 before:bg-gradient-to-br before:from-white/2 before:via-white/4 before:to-white/8 dark:before:from-white/0.4 dark:before:via-white/1 dark:before:to-white/2 before:mask-composite:subtract before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:pointer-events-none after:content-[''] after:absolute after:inset-[6px] after:rounded-[calc(0.75rem-6px)] after:bg-gradient-to-tl after:from-transparent after:via-white/[0.01] after:to-white/[0.02] after:pointer-events-none after:z-0 hover:transform hover:translateY(-2px)"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <IconMapPin size={32} className="text-viktoria-blue dark:text-viktoria-yellow mb-2 relative z-10" style={{ strokeWidth: 1.5 }} />
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide relative z-10">Karte</span>
                </motion.button>
              </div>
            </AnimatedSection>
          </div>

          {/* Contact Form */}
          <div className="mt-4 md:mt-9 lg:mt-8">
            <AnimatedSection className="py-2 md:py-3" delay={0.2}>
              <div className="relative bg-gray-100/11 dark:bg-white/[0.012] backdrop-blur-xl rounded-xl md:rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_2px_8px_rgba(255,255,255,0.04)] before:content-[''] before:absolute before:inset-0 before:rounded-xl before:md:rounded-2xl before:p-1.5 before:bg-gradient-to-br before:from-white/2 before:via-white/4 before:to-white/8 dark:before:from-white/0.4 dark:before:via-white/1 dark:before:to-white/2 before:mask-composite:subtract before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:pointer-events-none after:content-[''] after:absolute after:inset-[6px] after:rounded-[calc(0.75rem-6px)] after:md:rounded-[calc(1rem-6px)] after:bg-gradient-to-tl after:from-transparent after:via-white/[0.01] after:to-white/[0.02] after:pointer-events-none after:z-0">
                <div className="px-6 py-4 border-b border-white/20 dark:border-white/[0.08] relative z-10">
                  {/* Progress Dots - Centered */}
                  <div className="flex justify-center space-x-2">
                    {steps.map((_, index) => (
                      <motion.div
                        key={index}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${index <= currentStep
                          ? 'bg-viktoria-blue dark:bg-viktoria-yellow'
                          : 'bg-gray-300 dark:bg-gray-600'
                          }`}
                        animate={{
                          scale: index === currentStep ? 1.2 : 1
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className="p-6 relative z-10">
                  <AnimatePresence mode="wait">
                    {formStatus === 'success' ? (
                      <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-12"
                      >
                        <div className="w-20 h-20 bg-viktoria-yellow rounded-full flex items-center justify-center mx-auto mb-6">
                          <IconCheck size={32} className="text-white" />
                        </div>
                        <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
                          Nachricht gesendet!
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          Vielen Dank! Wir melden uns schnellstmöglich bei dir.
                        </p>
                      </motion.div>
                    ) : (
                      <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                      >
                        {/* Step Header */}
                        <div className="mb-8 text-center">
                          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center justify-center">
                            <IconMessage size={20} className="text-viktoria-blue dark:text-viktoria-yellow mr-2" />
                            {steps[currentStep].title}
                          </h3>
                          {steps[currentStep].subtitle && (
                            <p className="text-gray-600 dark:text-gray-400">
                              {steps[currentStep].subtitle}
                            </p>
                          )}
                        </div>

                        {/* Input Field */}
                        <div className="mb-8">
                          {steps[currentStep].type === 'select' ? (
                            <div className="space-y-3">
                              {steps[currentStep].options?.map((option) => (
                                <button
                                  key={option}
                                  onClick={() => handleChange(option)}
                                  className={`w-full p-4 rounded-lg text-left transition-all duration-200 ${formData[steps[currentStep].field as keyof typeof formData] === option
                                    ? 'bg-viktoria-blue/20 dark:bg-viktoria-yellow/20 border-2 border-viktoria-blue dark:border-viktoria-yellow text-gray-800 dark:text-gray-200'
                                    : 'bg-white/30 dark:bg-white/[0.05] border border-white/40 dark:border-white/[0.08] text-gray-700 dark:text-gray-300 hover:bg-white/40 dark:hover:bg-white/[0.08]'
                                    }`}
                                >
                                  {option}
                                </button>
                              ))}
                            </div>
                          ) : steps[currentStep].type === 'textarea' ? (
                            <textarea
                              value={formData[steps[currentStep].field as keyof typeof formData]}
                              onChange={(e) => handleChange(e.target.value)}
                              placeholder={steps[currentStep].placeholder}
                              rows={5}
                              className="w-full p-4 bg-white/60 dark:bg-transparent border border-white/40 dark:border-white/[0.08] rounded-lg focus:border-viktoria-blue dark:focus:border-viktoria-yellow focus:outline-none text-gray-800 dark:text-gray-200 placeholder-gray-600 dark:placeholder-gray-400 resize-none shadow-sm"
                            />
                          ) : (
                            <input
                              type={steps[currentStep].type}
                              value={formData[steps[currentStep].field as keyof typeof formData]}
                              onChange={(e) => handleChange(e.target.value)}
                              placeholder={steps[currentStep].placeholder}
                              className="w-full p-4 bg-white/60 dark:bg-transparent border border-white/40 dark:border-white/[0.08] rounded-lg focus:border-viktoria-blue dark:focus:border-viktoria-yellow focus:outline-none text-gray-800 dark:text-gray-200 placeholder-gray-600 dark:placeholder-gray-400 shadow-sm"
                            />
                          )}
                        </div>

                        {/* Navigation Buttons */}
                        {currentStep === steps.length - 1 ? (
                          <div className="flex flex-col items-center space-y-4">
                            {currentStep > 0 && (
                              <button
                                onClick={prevStep}
                                className="flex items-center px-3 py-2 sm:px-4 sm:py-2 rounded-lg transition-all duration-200 bg-white/40 dark:bg-white/[0.08] hover:bg-white/50 dark:hover:bg-white/[0.12] text-gray-700 dark:text-gray-300 border border-white/50 dark:border-white/[0.12] text-sm"
                              >
                                <IconArrowLeft size={14} className="mr-1" />
                                Zurück
                              </button>
                            )}
                            
                            <motion.button
                              onClick={handleSubmit}
                              disabled={!isCurrentStepValid() || formStatus === 'sending'}
                              className={`relative overflow-hidden px-4 py-2 sm:px-8 sm:py-3 rounded-lg font-medium shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border text-sm ${
                                isCurrentStepValid() && formStatus !== 'sending'
                                  ? 'bg-viktoria-blue/20 dark:bg-viktoria-yellow/20 border-viktoria-blue dark:border-viktoria-yellow text-viktoria-blue dark:text-viktoria-yellow hover:bg-viktoria-blue/30 dark:hover:bg-viktoria-yellow/30'
                                  : 'bg-white/20 dark:bg-white/[0.02] border-white/40 dark:border-white/[0.08] text-gray-600 dark:text-gray-400'
                              }`}
                              whileHover={{ scale: isCurrentStepValid() && formStatus !== 'sending' ? 1.05 : 1 }}
                              whileTap={{ scale: isCurrentStepValid() && formStatus !== 'sending' ? 0.95 : 1 }}
                            >
                              <span className="relative z-10 flex items-center">
                                {formStatus === 'sending' ? (
                                  <>
                                    <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Wird gesendet...
                                  </>
                                ) : (
                                  <>
                                    <IconCheck size={16} className="mr-1" />
                                    Nachricht senden
                                  </>
                                )}
                              </span>
                            </motion.button>
                          </div>
                        ) : (
                          <div className="flex justify-center items-center relative">
                            {currentStep > 0 && (
                              <button
                                onClick={prevStep}
                                className="absolute left-0 flex items-center px-3 py-2 sm:px-4 sm:py-2 rounded-lg transition-all duration-200 bg-white/40 dark:bg-white/[0.08] hover:bg-white/50 dark:hover:bg-white/[0.12] text-gray-700 dark:text-gray-300 border border-white/50 dark:border-white/[0.12] text-sm"
                              >
                                <IconArrowLeft size={14} className="mr-1" />
                                Zurück
                              </button>
                            )}

                            <motion.button
                              onClick={nextStep}
                              disabled={!isCurrentStepValid()}
                              className={`relative overflow-hidden px-4 py-2 sm:px-8 sm:py-3 rounded-lg font-medium shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border text-sm ${
                                isCurrentStepValid()
                                  ? 'bg-viktoria-yellow dark:bg-viktoria-yellow sm:bg-viktoria-blue-light sm:dark:bg-viktoria-blue-light border-viktoria-yellow dark:border-viktoria-yellow sm:border-viktoria-blue-light sm:dark:border-viktoria-blue-light text-viktoria-dark dark:text-viktoria-dark sm:text-white sm:dark:text-white hover:bg-viktoria-yellow/90 dark:hover:bg-viktoria-yellow/90 sm:hover:bg-viktoria-blue sm:dark:hover:bg-viktoria-blue'
                                  : 'bg-white/20 dark:bg-viktoria-yellow/30 sm:bg-white/20 sm:dark:bg-white/[0.02] border-white/40 dark:border-viktoria-yellow/50 sm:border-white/40 sm:dark:border-white/[0.08] text-gray-600 dark:text-viktoria-dark sm:text-gray-600 sm:dark:text-gray-400'
                              }`}
                              whileHover={{ scale: isCurrentStepValid() ? 1.05 : 1 }}
                              whileTap={{ scale: isCurrentStepValid() ? 0.95 : 1 }}
                            >
                              <span className="relative z-10 flex items-center text-viktoria-dark dark:text-viktoria-dark sm:text-white sm:dark:text-white">
                                Weiter
                                <IconArrowRight size={16} className="ml-1 text-viktoria-dark dark:text-viktoria-dark sm:text-white sm:dark:text-white" />
                              </span>
                            </motion.button>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </AnimatedSection>
          </div>
   
          {/* Ansprechpartner Section */}
          <div className="mt-4 md:mt-9 lg:mt-8">
            <AnimatedSection className="py-2 md:py-3" delay={0.3}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* 1. Vorsitzender */}
                <motion.div
                  className="relative bg-gray-100/11 dark:bg-white/[0.012] backdrop-blur-xl rounded-xl md:rounded-2xl p-6 overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_2px_8px_rgba(255,255,255,0.04)] hover:bg-gray-100/15 dark:hover:bg-white/[0.018] transition-all duration-300 hover:transform hover:translateY(-2px) before:content-[''] before:absolute before:inset-0 before:rounded-xl before:md:rounded-2xl before:p-1.5 before:bg-gradient-to-br before:from-white/2 before:via-white/4 before:to-white/8 dark:before:from-white/0.4 dark:before:via-white/1 dark:before:to-white/2 before:mask-composite:subtract before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:pointer-events-none after:content-[''] after:absolute after:inset-[6px] after:rounded-[calc(0.75rem-6px)] after:md:rounded-[calc(1rem-6px)] after:bg-gradient-to-tl after:from-transparent after:via-white/[0.01] after:to-white/[0.02] after:pointer-events-none after:z-0"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="text-center relative z-10">
                    <div className="w-16 h-16 bg-viktoria-blue dark:bg-viktoria-yellow rounded-full flex items-center justify-center mx-auto mb-4">
                      <IconUser size={24} className="text-viktoria-yellow dark:text-viktoria-dark" />
                    </div>
                    <h3 className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide mb-2">
                      Fabian Väthjeder
                    </h3>
                    <p className="text-viktoria-blue dark:text-viktoria-yellow font-medium mb-3">
                      1. Vorsitzender & Ansprechpartner
                    </p>
                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center justify-center">
                        <IconPhone size={16} className="mr-2" />
                        <a href="tel:+4993421234567" className="hover:text-viktoria-blue dark:hover:text-viktoria-yellow transition-colors">
                          0934 / 12345-67
                        </a>
                      </div>
                      <div className="flex items-center justify-center">
                        <IconMail size={16} className="mr-2" />
                        <a href="mailto:vorsitzender@viktoria-wertheim.de" className="hover:text-viktoria-blue dark:hover:text-viktoria-yellow transition-colors">
                          vorsitzender@viktoria-wertheim.de
                        </a>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Jugendleiter */}
                <motion.div
                  className="relative bg-gray-100/11 dark:bg-white/[0.012] backdrop-blur-xl rounded-xl md:rounded-2xl p-6 overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_2px_8px_rgba(255,255,255,0.04)] hover:bg-gray-100/15 dark:hover:bg-white/[0.018] transition-all duration-300 hover:transform hover:translateY(-2px) before:content-[''] before:absolute before:inset-0 before:rounded-xl before:md:rounded-2xl before:p-1.5 before:bg-gradient-to-br before:from-white/2 before:via-white/4 before:to-white/8 dark:before:from-white/0.4 dark:before:via-white/1 dark:before:to-white/2 before:mask-composite:subtract before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:pointer-events-none after:content-[''] after:absolute after:inset-[6px] after:rounded-[calc(0.75rem-6px)] after:md:rounded-[calc(1rem-6px)] after:bg-gradient-to-tl after:from-transparent after:via-white/[0.01] after:to-white/[0.02] after:pointer-events-none after:z-0"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="text-center relative z-10">
                    <div className="w-16 h-16 bg-viktoria-blue dark:bg-viktoria-yellow rounded-full flex items-center justify-center mx-auto mb-4">
                      <IconUsers size={24} className="text-viktoria-yellow dark:text-viktoria-dark" />
                    </div>
                    <h3 className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide mb-2">
                      Marco Schneider
                    </h3>
                    <p className="text-viktoria-blue dark:text-viktoria-yellow font-medium mb-3">
                      Jugendleiter
                    </p>
                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center justify-center">
                        <IconPhone size={16} className="mr-2" />
                        <a href="tel:+4993421234568" className="hover:text-viktoria-blue dark:hover:text-viktoria-yellow transition-colors">
                          0934 / 12345-68
                        </a>
                      </div>
                      <div className="flex items-center justify-center">
                        <IconMail size={16} className="mr-2" />
                        <a href="mailto:jugend@viktoria-wertheim.de" className="hover:text-viktoria-blue dark:hover:text-viktoria-yellow transition-colors">
                          jugend@viktoria-wertheim.de
                        </a>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Kassenwart */}
                <motion.div
                  className="relative bg-gray-100/11 dark:bg-white/[0.012] backdrop-blur-xl rounded-xl md:rounded-2xl p-6 overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_2px_8px_rgba(255,255,255,0.04)] hover:bg-gray-100/15 dark:hover:bg-white/[0.018] transition-all duration-300 hover:transform hover:translateY(-2px) before:content-[''] before:absolute before:inset-0 before:rounded-xl before:md:rounded-2xl before:p-1.5 before:bg-gradient-to-br before:from-white/2 before:via-white/4 before:to-white/8 dark:before:from-white/0.4 dark:before:via-white/1 dark:before:to-white/2 before:mask-composite:subtract before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:pointer-events-none after:content-[''] after:absolute after:inset-[6px] after:rounded-[calc(0.75rem-6px)] after:md:rounded-[calc(1rem-6px)] after:bg-gradient-to-tl after:from-transparent after:via-white/[0.01] after:to-white/[0.02] after:pointer-events-none after:z-0"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="text-center relative z-10">
                    <div className="w-16 h-16 bg-viktoria-blue dark:bg-viktoria-yellow rounded-full flex items-center justify-center mx-auto mb-4">
                      <IconCreditCard size={24} className="text-viktoria-yellow dark:text-viktoria-dark" />
                    </div>
                    <h3 className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide mb-2">
                      Petra Weber
                    </h3>
                    <p className="text-viktoria-blue dark:text-viktoria-yellow font-medium mb-3">
                      Kassenwart
                    </p>
                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center justify-center">
                        <IconPhone size={16} className="mr-2" />
                        <a href="tel:+4993421234569" className="hover:text-viktoria-blue dark:hover:text-viktoria-yellow transition-colors">
                          0934 / 12345-69
                        </a>
                      </div>
                      <div className="flex items-center justify-center">
                        <IconMail size={16} className="mr-2" />
                        <a href="mailto:kasse@viktoria-wertheim.de" className="hover:text-viktoria-blue dark:hover:text-viktoria-yellow transition-colors">
                          kasse@viktoria-wertheim.de
                        </a>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </AnimatedSection>
          </div>

          {/* Sportplatz Section */}
          <div className="mt-4 md:mt-9 lg:mt-8 pb-16 md:pb-24 lg:pb-32">
            <AnimatedSection className="py-2 md:py-3" delay={0.4}>
              <div className="relative bg-gray-100/11 dark:bg-white/[0.012] backdrop-blur-xl rounded-xl md:rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_2px_8px_rgba(255,255,255,0.04)] before:content-[''] before:absolute before:inset-0 before:rounded-xl before:md:rounded-2xl before:p-1.5 before:bg-gradient-to-br before:from-white/2 before:via-white/4 before:to-white/8 dark:before:from-white/0.4 dark:before:via-white/1 dark:before:to-white/2 before:mask-composite:subtract before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:pointer-events-none after:content-[''] after:absolute after:inset-[6px] after:rounded-[calc(0.75rem-6px)] after:md:rounded-[calc(1rem-6px)] after:bg-gradient-to-tl after:from-transparent after:via-white/[0.01] after:to-white/[0.02] after:pointer-events-none after:z-0">
                <div className="p-6 relative z-10">
                  <div className="text-center mb-4">
                    <h2 className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide">
                      Unser Sportplatz
                    </h2>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-lg p-4">
                      <h3 className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide mb-4 flex items-center justify-center">
                        <IconMapPin size={20} className="text-viktoria-blue dark:text-viktoria-yellow mr-2" />
                        Sportplatz Adresse
                      </h3>
                      <div className="space-y-2 text-gray-700 dark:text-gray-300 text-center">
                        <p className="font-medium">Sportanlage Viktoria Wertheim</p>
                        <p>Haslocherweg 85</p>
                        <p>97877 Wertheim-Bestenheid</p>
                      </div>
                      <div className="mt-3 text-center">
                        <button
                          onClick={() => window.open('https://maps.google.com/?q=Haslocherweg+85,+97877+Wertheim-Bestenheid', '_blank')}
                          className="text-xs text-gray-500 dark:text-gray-400 hover:text-viktoria-blue dark:hover:text-viktoria-yellow transition-colors duration-200 underline underline-offset-2"
                        >
                          Karte öffnen
                        </button>
                      </div>
                    </div>

                    <div className="rounded-lg p-4">
                      <h3 className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide mb-4 flex items-center justify-center">
                        <IconClock size={20} className="text-viktoria-blue dark:text-viktoria-yellow mr-2" />
                        Trainingszeiten
                      </h3>
                      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                        <div className="flex justify-between md:justify-center md:space-x-12">
                          <span className="font-medium md:w-40 md:text-right">1. Mannschaft:</span>
                          <span className="md:w-40 md:text-left">Di & Do 19:00-20:30</span>
                        </div>
                        <div className="flex justify-between md:justify-center md:space-x-12">
                          <span className="font-medium md:w-40 md:text-right">2. Mannschaft:</span>
                          <span className="md:w-40 md:text-left">Mo & Mi 18:00-19:30</span>
                        </div>
                        <div className="flex justify-between md:justify-center md:space-x-12">
                          <span className="font-medium md:w-40 md:text-right">3. Mannschaft:</span>
                          <span className="md:w-40 md:text-left">Sa 15:00-16:30</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          </div>

        </div>
      </div>
    </PageLayout>
  )
}