"use client"
import { useState } from 'react'
import PageLayout from '@/components/PageLayout'
import AnimatedSection from '@/components/AnimatedSection'
import { IconMail, IconPhone, IconMapPin, IconBrandInstagram, IconBrandFacebook } from '@tabler/icons-react'

export default function KontaktPage() {
  const [formStatus, setFormStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormStatus('sending')

    // Simulate form submission
    setTimeout(() => {
      setFormStatus('success')
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: ''
      })
    }, 1500)
  }

  return (
    <PageLayout>
      {/* Map Section */}
      <AnimatedSection className="px-4 py-6" delay={0.1}>
        <div className="container max-w-4xl lg:max-w-5xl lg:mx-auto">
          <div className="bg-white/40 backdrop-blur-sm rounded-xl border border-white/20 overflow-hidden shadow-lg">
            <div className="bg-white/30 px-4 py-3 border-b border-white/20 text-center">
              <h2 className="text-xs md:text-sm font-medium text-gray-600 uppercase tracking-wide">
                Unser Standort
              </h2>
            </div>
            <div className="p-4 md:p-6">
              <div className="relative h-[30vh] md:h-[40vh] overflow-hidden rounded-lg border border-gray-200">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2565.5!2d9.503520380745258!3d49.78259140894397!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNDnCsDQ2JzU3LjMiTiA5wrAzMCcxMi43IkU!5e1!3m2!1sde!2sde!4v1701123456789!5m2!1sde!2sde"
                  className="w-full h-full border-0 rounded-lg"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
              </div>
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* Contact Info Cards */}
      <AnimatedSection className="px-4 py-6" delay={0.2}>
        <div className="container max-w-4xl lg:max-w-5xl lg:mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {/* Email Card */}
            <div className="bg-white/40 backdrop-blur-sm rounded-xl border border-white/20 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="bg-white/30 px-4 py-3 border-b border-white/20 text-center">
                <h2 className="text-xs md:text-sm font-medium text-gray-600 uppercase tracking-wide">
                  Email
                </h2>
              </div>
              <div className="p-5 flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-viktoria-blue rounded-full flex items-center justify-center mb-3">
                  <IconMail size={20} className="text-viktoria-yellow" />
                </div>
                <a href="mailto:info@viktoria-wertheim.de" className="text-viktoria-blue hover:text-viktoria-blue-light transition-colors font-medium">
                  info@viktoria-wertheim.de
                </a>
                <p className="text-sm text-gray-600 mt-2">
                  Wir antworten innerhalb von 24 Stunden
                </p>
              </div>
            </div>

            {/* Phone Card */}
            <div className="bg-white/40 backdrop-blur-sm rounded-xl border border-white/20 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="bg-white/30 px-4 py-3 border-b border-white/20 text-center">
                <h2 className="text-xs md:text-sm font-medium text-gray-600 uppercase tracking-wide">
                  Telefon
                </h2>
              </div>
              <div className="p-5 flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-viktoria-blue rounded-full flex items-center justify-center mb-3">
                  <IconPhone size={20} className="text-viktoria-yellow" />
                </div>
                <a href="tel:+4993421234567" className="text-viktoria-blue hover:text-viktoria-blue-light transition-colors font-medium">
                  (09342) 123-4567
                </a>
                <p className="text-sm text-gray-600 mt-2">
                  Mo-Fr: 17:00-20:00 Uhr
                </p>
              </div>
            </div>

            {/* Address Card */}
            <div className="bg-white/40 backdrop-blur-sm rounded-xl border border-white/20 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="bg-white/30 px-4 py-3 border-b border-white/20 text-center">
                <h2 className="text-xs md:text-sm font-medium text-gray-600 uppercase tracking-wide">
                  Adresse
                </h2>
              </div>
              <div className="p-5 flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-viktoria-blue rounded-full flex items-center justify-center mb-3">
                  <IconMapPin size={20} className="text-viktoria-yellow" />
                </div>
                <p className="text-viktoria-blue font-medium">
                  Sportplatz SV Viktoria Wertheim
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  Haslocherweg 85<br />
                  97877 Wertheim-Bestenheid
                </p>
              </div>
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* Contact Form */}
      <AnimatedSection className="px-4 py-6" delay={0.3}>
        <div className="container max-w-4xl lg:max-w-5xl lg:mx-auto">
          <div className="bg-white/40 backdrop-blur-sm rounded-xl border border-white/20 overflow-hidden shadow-lg">
            <div className="bg-white/30 px-4 py-3 border-b border-white/20 text-center">
              <h2 className="text-xs md:text-sm font-medium text-gray-600 uppercase tracking-wide">
                Kontaktformular
              </h2>
            </div>
            <div className="p-4 md:p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name Field */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 bg-white/70 border border-gray-300 rounded-lg focus:ring-viktoria-blue focus:border-viktoria-blue text-sm"
                      placeholder="Dein Name"
                    />
                  </div>

                  {/* Email Field */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 bg-white/70 border border-gray-300 rounded-lg focus:ring-viktoria-blue focus:border-viktoria-blue text-sm"
                      placeholder="deine.email@beispiel.de"
                    />
                  </div>
                </div>

                {/* Subject Field */}
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                    Betreff
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-white/70 border border-gray-300 rounded-lg focus:ring-viktoria-blue focus:border-viktoria-blue text-sm"
                  >
                    <option value="">Bitte wählen</option>
                    <option value="Allgemeine Anfrage">Allgemeine Anfrage</option>
                    <option value="Mitgliedschaft">Mitgliedschaft</option>
                    <option value="Sponsoring">Sponsoring</option>
                    <option value="Jugendabteilung">Jugendabteilung</option>
                    <option value="Veranstaltungen">Veranstaltungen</option>
                  </select>
                </div>

                {/* Message Field */}
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                    Nachricht
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    className="w-full px-3 py-2 bg-white/70 border border-gray-300 rounded-lg focus:ring-viktoria-blue focus:border-viktoria-blue text-sm"
                    placeholder="Deine Nachricht an uns..."
                  ></textarea>
                </div>

                {/* Submit Button */}
                <div className="flex justify-center pt-2">
                  <button
                    type="submit"
                    disabled={formStatus === 'sending'}
                    className="px-6 py-2 bg-viktoria-blue text-white rounded-lg hover:bg-viktoria-blue-light transition-colors duration-300 font-medium text-sm flex items-center justify-center min-w-[150px]"
                  >
                    {formStatus === 'sending' ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Wird gesendet...
                      </span>
                    ) : formStatus === 'success' ? (
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        Gesendet!
                      </span>
                    ) : (
                      'Nachricht senden'
                    )}
                  </button>
                </div>

                {/* Form Status Message */}
                {formStatus === 'success' && (
                  <div className="text-center text-green-600 text-sm mt-2">
                    Vielen Dank für deine Nachricht! Wir werden uns schnellstmöglich bei dir melden.
                  </div>
                )}
                {formStatus === 'error' && (
                  <div className="text-center text-red-600 text-sm mt-2">
                    Es ist ein Fehler aufgetreten. Bitte versuche es später erneut.
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* Social Media Section */}
      <AnimatedSection className="px-4 py-6" delay={0.4}>
        <div className="container max-w-4xl lg:max-w-5xl lg:mx-auto">
          <div className="bg-white/40 backdrop-blur-sm rounded-xl border border-white/20 overflow-hidden shadow-lg">
            <div className="bg-white/30 px-4 py-3 border-b border-white/20 text-center">
              <h2 className="text-xs md:text-sm font-medium text-gray-600 uppercase tracking-wide">
                Social Media
              </h2>
            </div>
            <div className="p-4 md:p-6">
              <div className="flex justify-center space-x-6">
                <a
                  href="https://www.instagram.com/viktoria_wertheim/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <IconBrandInstagram size={24} className="text-white" />
                  </div>
                  <p className="text-xs text-center mt-2">Instagram</p>
                </a>
                <a
                  href="https://www.facebook.com/viktoriawertheim/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group"
                >
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <IconBrandFacebook size={24} className="text-white" />
                  </div>
                  <p className="text-xs text-center mt-2">Facebook</p>
                </a>
              </div>
              <p className="text-center text-sm text-gray-600 mt-4">
                Folge uns auf Social Media für aktuelle Updates, Spielergebnisse und Vereinsneuigkeiten!
              </p>
            </div>
          </div>
        </div>
      </AnimatedSection>
    </PageLayout>
  )
}