"use client"

import PageLayout from '@/components/PageLayout'
import dynamic from 'next/dynamic'
import { IconFileText, IconUser, IconMessage, IconUpload, IconShield, IconKey, IconLink } from '@tabler/icons-react'
import Image from "next/image"

// Dynamic Import für animierte Komponenten
const AnimatedSection = dynamic(
  () => import('@/components/AnimatedSection'),
  { ssr: false }
)

export default function AGBPage() {
  return (
    <PageLayout>
      <div className="px-4 md:px-6 lg:px-0">
        <div className="container max-w-4xl lg:max-w-5xl lg:mx-auto space-y-6 md:space-y-8">
          
          {/* Einleitung */}
          <AnimatedSection delay={0.1}>
            <div className="text-center mb-6 md:mb-8">
              <Image 
                src="/viktorialogo.png" 
                alt="Viktoria Wertheim Logo"
                width={80}
                height={80}
                className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 drop-shadow-lg"
                priority
              />
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800 dark:text-gray-200 mb-4">
                Allgemeine Geschäftsbedingungen
              </h1>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed px-4 text-sm md:text-base">
                Nutzungsbedingungen für die Website viktoria-wertheim.de
              </p>
            </div>
          </AnimatedSection>

          {/* 1. Informationen zum Urheberrecht */}
          <AnimatedSection delay={0.2}>
            <div className="relative bg-gray-100/11 dark:bg-white/[0.012] backdrop-blur-xl rounded-xl md:rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_2px_8px_rgba(255,255,255,0.04)] before:content-[''] before:absolute before:inset-0 before:rounded-xl before:md:rounded-2xl before:p-1.5 before:bg-gradient-to-br before:from-white/2 before:via-white/4 before:to-white/8 dark:before:from-white/0.4 dark:before:via-white/1 dark:before:to-white/2 before:mask-composite:subtract before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:pointer-events-none after:content-[''] after:absolute after:inset-[6px] after:rounded-[calc(0.75rem-6px)] after:md:rounded-[calc(1rem-6px)] after:bg-gradient-to-tl after:from-transparent after:via-white/[0.01] after:to-white/[0.02] after:pointer-events-none after:z-0 hover:bg-gray-100/50 dark:hover:bg-white/[0.06] transition-all duration-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.15),0_4px_20px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_6px_20px_rgba(255,255,255,0.12),0_2px_10px_rgba(255,255,255,0.08)] hover:transform hover:translateY(-2px)">
              <div className="px-8 md:px-12 py-6 md:py-8 text-center">
                <h3 className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide">
                  1. Informationen zum Urheberrecht
                </h3>
              </div>
              <div className="p-6 text-gray-700 dark:text-gray-200 text-sm md:text-base leading-relaxed space-y-4 relative z-10">
                <p>
                  Alle Informationen dieser Web-Seite werden wie angegeben ohne Anspruch auf Richtigkeit, Vollständigkeit oder Aktualität zur Verfügung gestellt.
                </p>
                <p>
                  Wenn nicht ausdrücklich anderweitig in dieser Publikation zu verstehen gegeben, und zwar in Zusammenhang mit einem bestimmten Ausschnitt, einer Datei, oder einem Dokument, ist jedermann dazu berechtigt, dieses Dokument anzusehen, zu kopieren, zu drucken und zu verteilen, unter den folgenden Bedingungen:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Das Dokument darf nur für nicht kommerzielle Informationszwecke genutzt werden.</li>
                  <li>Jede Kopie dieses Dokuments oder eines Teils davon muss diese urheberrechtliche Erklärung und das urheberrechtliche Schutzzeichen des Betreibers enthalten.</li>
                  <li>Das Dokument, jede Kopie des Dokuments oder eines Teils davon dürfen nicht ohne schriftliche Zustimmung des Betreibers verändert werden.</li>
                  <li>Der Betreiber behält sich das Recht vor, diese Genehmigung jederzeit zu widerrufen, und jede Nutzung muss sofort eingestellt werden, sobald eine schriftliche Bekanntmachung seitens des Betreibers veröffentlicht wird.</li>
                </ul>
              </div>
            </div>
          </AnimatedSection>

          {/* 2. Vertragliche Zusicherungen und Verzichtserklärungen */}
          <AnimatedSection delay={0.3}>
            <div className="relative bg-gray-100/11 dark:bg-white/[0.012] backdrop-blur-xl rounded-xl md:rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_2px_8px_rgba(255,255,255,0.04)] before:content-[''] before:absolute before:inset-0 before:rounded-xl before:md:rounded-2xl before:p-1.5 before:bg-gradient-to-br before:from-white/2 before:via-white/4 before:to-white/8 dark:before:from-white/0.4 dark:before:via-white/1 dark:before:to-white/2 before:mask-composite:subtract before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:pointer-events-none after:content-[''] after:absolute after:inset-[6px] after:rounded-[calc(0.75rem-6px)] after:md:rounded-[calc(1rem-6px)] after:bg-gradient-to-tl after:from-transparent after:via-white/[0.01] after:to-white/[0.02] after:pointer-events-none after:z-0 hover:bg-gray-100/50 dark:hover:bg-white/[0.06] transition-all duration-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.15),0_4px_20px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_6px_20px_rgba(255,255,255,0.12),0_2px_10px_rgba(255,255,255,0.08)] hover:transform hover:translateY(-2px)">
              <div className="px-8 md:px-12 py-6 md:py-8 text-center">
                <h3 className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide">
                  2. Vertragliche Zusicherungen und Verzichtserklärungen
                </h3>
              </div>
              <div className="p-6 text-gray-700 dark:text-gray-200 text-sm leading-relaxed space-y-4 relative z-10">
                <p>
                  Die Website viktoria-wertheim.de steht Ihnen - soweit nicht anders vereinbart - kostenlos zur Verfügung. Die Betreiber übernehmen keinerlei Gewähr für Richtigkeit der enthaltenen Informationen, Verfügbarkeit der Dienste, Verlust von auf viktoria-wertheim.de abgespeicherten Daten oder Nutzbarkeit für irgendeinen bestimmten Zweck.
                </p>
                <p>
                  Die Betreiber haften auch nicht für Folgeschäden, die auf einer Nutzung des Angebotes beruhen.
                </p>
                <p>
                  Soweit ein Haftungsausschluss nicht in Betracht kommt, haften die Betreiber lediglich für grobe Fahrlässigkeit und Vorsatz. Produkt- und Firmennamen sind Marken der jeweiligen Eigentümer und werden auf diesen Seiten ausschließlich zu Informationszwecken eingesetzt.
                </p>
                <p>
                  Diese Publikation könnte technische oder andere Ungenauigkeiten enthalten oder Schreib-/Tippfehler. Von Zeit zu Zeit werden der vorliegenden Information Änderungen hinzugefügt; diese Änderungen werden in neuen Ausgaben der Publikation eingefügt. Der Betreiber kann jederzeit Verbesserungen und/oder Veränderungen an den Angeboten vornehmen, die in dieser Publikation beschrieben werden.
                </p>
              </div>
            </div>
          </AnimatedSection>

          {/* 3. Meinungsäußerungen bei Kommentaren und im Forum */}
          <AnimatedSection delay={0.4}>
            <div className="relative bg-gray-100/11 dark:bg-white/[0.012] backdrop-blur-xl rounded-xl md:rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_2px_8px_rgba(255,255,255,0.04)] before:content-[''] before:absolute before:inset-0 before:rounded-xl before:md:rounded-2xl before:p-1.5 before:bg-gradient-to-br before:from-white/2 before:via-white/4 before:to-white/8 dark:before:from-white/0.4 dark:before:via-white/1 dark:before:to-white/2 before:mask-composite:subtract before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:pointer-events-none after:content-[''] after:absolute after:inset-[6px] after:rounded-[calc(0.75rem-6px)] after:md:rounded-[calc(1rem-6px)] after:bg-gradient-to-tl after:from-transparent after:via-white/[0.01] after:to-white/[0.02] after:pointer-events-none after:z-0 hover:bg-gray-100/50 dark:hover:bg-white/[0.06] transition-all duration-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.15),0_4px_20px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_6px_20px_rgba(255,255,255,0.12),0_2px_10px_rgba(255,255,255,0.08)] hover:transform hover:translateY(-2px)">
              <div className="px-8 md:px-12 py-6 md:py-8 text-center">
                <h3 className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide">
                  3. Meinungsäußerungen bei Kommentaren und im Forum
                </h3>
              </div>
              <div className="p-6 text-gray-700 dark:text-gray-200 text-sm leading-relaxed space-y-4 relative z-10">
                <p>
                  Aufgrund der sich ständig verändernden Inhalte bei Kommentaren und im Forum ist es dem Betreiber nicht möglich, alle Beiträge lückenlos zu sichten, inhaltlich zu prüfen und die unmittelbare aktive Kontrolle darüber auszuüben. Es wird keine Verantwortung für den Inhalt, die Korrektheit und die Form der eingestellten Beiträge übernommen.
                </p>
                
                <div className="bg-viktoria-blue/5 rounded-lg p-4 border border-viktoria-blue/20">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">3a. Spezielle Bestimmungen für angemeldete Nutzer</h4>
                  <p className="mb-3">
                    Mit der Anmeldung bei viktoria-wertheim.de erklärt sich der Nutzer - nachfolgend »Mitglied« gegenüber dem Betreiber mit folgenden Nutzungsbedingungen einverstanden:
                  </p>
                  <p className="mb-2">Mitglieder, die sich an Diskussionsforen und Kommentaren beteiligen, verpflichten sich dazu,</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Sich in Ihren Beiträgen jeglicher Beleidigungen, strafbarer Inhalte, Pornographie und grober Ausdrucksweise zu enthalten,</li>
                    <li>Die alleinige Verantwortung für die von ihnen eingestellten Inhalte zu tragen, Rechte Dritter (insbesondere Marken-, Urheber- und Persönlichkeitsrechte) nicht zu verletzen und die Betreiber von »viktoria-wertheim.de« von durch ihre Beiträge ausgelösten Ansprüchen Dritter vollständig freizustellen.</li>
                    <li>Weder in Foren noch in Kommentaren Werbung irgendwelcher Art einzustellen oder Foren und Kommentare zu irgendeiner Art gewerblicher Tätigkeit zu nutzen. Insbesondere gilt das für die Veröffentlichung von »0900«-Rufnummern zu irgendeinem Zweck.</li>
                  </ul>
                  <p className="mt-3">
                    Es besteht keinerlei Anspruch auf Veröffentlichung von eingereichten Kommentaren oder Forenbeiträgen. Die Betreiber von »viktoria-wertheim.de« behalten sich vor, Kommentare und Forenbeiträge nach eigenem Ermessen zu editieren oder zu löschen. Bei Verletzungen der Pflichten unter 1), 2) und 3) behalten sich die Betreiber ferner vor, die Mitgliedschaft zeitlich begrenzt zu sperren oder dauernd zu löschen.
                  </p>
                </div>
              </div>
            </div>
          </AnimatedSection>

          {/* 4. Einreichen von Beiträgen und Artikeln */}
          <AnimatedSection delay={0.5}>
            <div className="relative bg-gray-100/11 dark:bg-white/[0.012] backdrop-blur-xl rounded-xl md:rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_2px_8px_rgba(255,255,255,0.04)] before:content-[''] before:absolute before:inset-0 before:rounded-xl before:md:rounded-2xl before:p-1.5 before:bg-gradient-to-br before:from-white/2 before:via-white/4 before:to-white/8 dark:before:from-white/0.4 dark:before:via-white/1 dark:before:to-white/2 before:mask-composite:subtract before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:pointer-events-none after:content-[''] after:absolute after:inset-[6px] after:rounded-[calc(0.75rem-6px)] after:md:rounded-[calc(1rem-6px)] after:bg-gradient-to-tl after:from-transparent after:via-white/[0.01] after:to-white/[0.02] after:pointer-events-none after:z-0 hover:bg-gray-100/50 dark:hover:bg-white/[0.06] transition-all duration-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.15),0_4px_20px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_6px_20px_rgba(255,255,255,0.12),0_2px_10px_rgba(255,255,255,0.08)] hover:transform hover:translateY(-2px)">
              <div className="px-8 md:px-12 py-6 md:py-8 text-center">
                <h3 className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide">
                  4. Einreichen von Beiträgen und Artikeln
                </h3>
              </div>
              <div className="p-6 text-gray-700 dark:text-gray-200 text-sm leading-relaxed space-y-4 relative z-10">
                <p>
                  Soweit das Mitglied von der Möglichkeit Gebrauch macht, eigene Beiträge für redaktionellen Teil von »viktoria-wertheim.de« einzureichen, gilt Folgendes:
                </p>
                <p>
                  Voraussetzung für das Posten eigener Beiträge ist, dass das Mitglied seinen vollständigen und korrekten Vor- und Nachnamen in sein »viktoria-wertheim.de« - Benutzerprofil eingetragen hat oder nach dem Einreichen des Artikels dort einträgt. Mit dem dort eingetragenen Namen wird der eingereichte Beitrag bei Veröffentlichung (öffentlich) gekennzeichnet.
                </p>
                <p>Das Mitglied gibt für alle Beiträge, die von ihm oder ihr zukünftig auf »viktoria-wertheim.de« eingereicht werden, folgende Erklärungen ab:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Das Mitglied versichert, das die eingereichten Beiträge frei von Rechten Dritter, insbesondere Urheber-, Marken- oder Persönlichkeitsrechten sind. Dies gilt für alle eingereichten Beiträge und Bildwerke.</li>
                  <li>Das Mitglied räumt den Betreibern von »viktoria-wertheim.de« ein uneingeschränktes Nutzungsrecht an den eingereichten Beiträgen ein. Dieses umfasst die Veröffentlichung im Internet auf »viktoria-wertheim.de« sowie auf anderen Internetservern, in Newslettern, Printmedien und anderen Publikationen.</li>
                  <li>Eingereichte Beiträge werden auf Verlangen des Mitgliedes per Email an die Adresse des Webmasters wieder gelöscht bzw. anonymisiert. Die Löschung bzw. Anonymisierung erfolgt innerhalb von 7 Tagen nach der Mitteilung.</li>
                  <li>Es besteht keinerlei Anspruch auf Speicherung, Veröffentlichung oder Archivierung der eingereichten Beiträge. Die Betreiber behalten sich vor, eingereichte Beiträge ohne Angabe von Gründen nicht zu veröffentlichen, vor Veröffentlichung zu editieren oder nach Veröffentlichung nach freiem Ermessen wieder zu löschen.</li>
                  <li>Durch die Veröffentlichung eingereichter Beiträge entstehen keinerlei Vergütungsansprüche (Honorare, Lizenzgebühren, Aufwendungsentschädigungen oder ähnliches) des Mitgliedes gegenüber »viktoria-wertheim.de«. Die Mitarbeit ist ehrenamtlich (unentgeltlich).</li>
                </ul>
              </div>
            </div>
          </AnimatedSection>

          {/* 5. Erklärung zum Datenschutz */}
          <AnimatedSection delay={0.6}>
            <div className="relative bg-gray-100/11 dark:bg-white/[0.012] backdrop-blur-xl rounded-xl md:rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_2px_8px_rgba(255,255,255,0.04)] before:content-[''] before:absolute before:inset-0 before:rounded-xl before:md:rounded-2xl before:p-1.5 before:bg-gradient-to-br before:from-white/2 before:via-white/4 before:to-white/8 dark:before:from-white/0.4 dark:before:via-white/1 dark:before:to-white/2 before:mask-composite:subtract before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:pointer-events-none after:content-[''] after:absolute after:inset-[6px] after:rounded-[calc(0.75rem-6px)] after:md:rounded-[calc(1rem-6px)] after:bg-gradient-to-tl after:from-transparent after:via-white/[0.01] after:to-white/[0.02] after:pointer-events-none after:z-0 hover:bg-gray-100/50 dark:hover:bg-white/[0.06] transition-all duration-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.15),0_4px_20px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_6px_20px_rgba(255,255,255,0.12),0_2px_10px_rgba(255,255,255,0.08)] hover:transform hover:translateY(-2px)">
              <div className="px-8 md:px-12 py-6 md:py-8 text-center">
                <h3 className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide">
                  5. Erklärung zum Datenschutz (Privacy Policy)
                </h3>
              </div>
              <div className="p-6 text-gray-700 dark:text-gray-200 text-sm leading-relaxed space-y-4 relative z-10">
                <p>
                  Sofern innerhalb des Internetangebotes die Möglichkeit zur Eingabe persönlicher oder geschäftlicher Daten genutzt wird, so erfolgt die Preisgabe dieser Daten seitens des Nutzers auf ausdrücklich freiwilliger Basis. Die Inanspruchnahme unseres Dienstes ist - soweit technisch möglich und zumutbar - auch ohne Angabe solcher Daten bzw. unter Angabe anonymisierter Daten oder eines Pseudonyms gestattet.
                </p>
                <p>
                  Weitere wichtige Informationen zum Thema Datenschutz finden sich in unserer Datenschutzerklärung.
                </p>
              </div>
            </div>
          </AnimatedSection>

          {/* 6. Registrierung und Passwort */}
          <AnimatedSection delay={0.7}>
            <div className="relative bg-gray-100/11 dark:bg-white/[0.012] backdrop-blur-xl rounded-xl md:rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_2px_8px_rgba(255,255,255,0.04)] before:content-[''] before:absolute before:inset-0 before:rounded-xl before:md:rounded-2xl before:p-1.5 before:bg-gradient-to-br before:from-white/2 before:via-white/4 before:to-white/8 dark:before:from-white/0.4 dark:before:via-white/1 dark:before:to-white/2 before:mask-composite:subtract before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:pointer-events-none after:content-[''] after:absolute after:inset-[6px] after:rounded-[calc(0.75rem-6px)] after:md:rounded-[calc(1rem-6px)] after:bg-gradient-to-tl after:from-transparent after:via-white/[0.01] after:to-white/[0.02] after:pointer-events-none after:z-0 hover:bg-gray-100/50 dark:hover:bg-white/[0.06] transition-all duration-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.15),0_4px_20px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_6px_20px_rgba(255,255,255,0.12),0_2px_10px_rgba(255,255,255,0.08)] hover:transform hover:translateY(-2px)">
              <div className="px-8 md:px-12 py-6 md:py-8 text-center">
                <h3 className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide">
                  6. Registrierung und Passwort
                </h3>
              </div>
              <div className="p-6 text-gray-700 dark:text-gray-200 text-sm leading-relaxed relative z-10">
                <p>
                  Der Benutzer ist verpflichtet, die Kombination Benutzername/Passwort vertraulich zu behandeln und nicht an Dritte weiterzugeben. Bei Verdacht auf Missbrauch der Zugangsdaten ist der Betreiber zu informieren.
                </p>
              </div>
            </div>
          </AnimatedSection>

          {/* 7. Hinweis gemäß Teledienstgesetz */}
          <AnimatedSection delay={0.8}>
            <div className="relative bg-gray-100/11 dark:bg-white/[0.012] backdrop-blur-xl rounded-xl md:rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_2px_8px_rgba(255,255,255,0.04)] before:content-[''] before:absolute before:inset-0 before:rounded-xl before:md:rounded-2xl before:p-1.5 before:bg-gradient-to-br before:from-white/2 before:via-white/4 before:to-white/8 dark:before:from-white/0.4 dark:before:via-white/1 dark:before:to-white/2 before:mask-composite:subtract before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:pointer-events-none after:content-[''] after:absolute after:inset-[6px] after:rounded-[calc(0.75rem-6px)] after:md:rounded-[calc(1rem-6px)] after:bg-gradient-to-tl after:from-transparent after:via-white/[0.01] after:to-white/[0.02] after:pointer-events-none after:z-0 hover:bg-gray-100/50 dark:hover:bg-white/[0.06] transition-all duration-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.15),0_4px_20px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_6px_20px_rgba(255,255,255,0.12),0_2px_10px_rgba(255,255,255,0.08)] hover:transform hover:translateY(-2px)">
              <div className="px-8 md:px-12 py-6 md:py-8 text-center">
                <h3 className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide">
                  7. Hinweis gemäß Teledienstgesetz
                </h3>
              </div>
              <div className="p-6 text-gray-700 dark:text-gray-200 text-sm leading-relaxed space-y-4 relative z-10">
                <p>
                  Für Internetseiten Dritter, auf die dieses Angebot durch sog. Links verweist, tragen die jeweiligen Anbieter die Verantwortung. Der Betreiber ist für den Inhalt solcher Seiten Dritter nicht verantwortlich.
                </p>
                <p>
                  Des Weiteren kann die Web-Seite ohne unser Wissen von anderen Seiten mittels sog. Links angelinkt werden. Der Betreiber übernimmt keine Verantwortung für Darstellungen, Inhalt oder irgendeine Verbindung zu dieser Web-Seite in Web-Seiten Dritter.
                </p>
                <p>
                  Für fremde Inhalte ist der Betreiber nur dann verantwortlich, wenn von ihnen (d.h. auch von einem rechtswidrigen oder strafbaren Inhalt) positive Kenntnis vorliegt und es technisch möglich und zumutbar ist, deren Nutzung zu verhindern. Der Betreiber ist nach dem Teledienstgesetz jedoch nicht verpflichtet, die fremden Inhalte ständig zu überprüfen.
                </p>
              </div>
            </div>
          </AnimatedSection>

          {/* Kontakt und Rechtswirksamkeit */}
          <AnimatedSection delay={0.9}>
            <div className="relative bg-gray-100/11 dark:bg-white/[0.012] backdrop-blur-xl rounded-xl md:rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_2px_8px_rgba(255,255,255,0.04)] before:content-[''] before:absolute before:inset-0 before:rounded-xl before:md:rounded-2xl before:p-1.5 before:bg-gradient-to-br before:from-white/2 before:via-white/4 before:to-white/8 dark:before:from-white/0.4 dark:before:via-white/1 dark:before:to-white/2 before:mask-composite:subtract before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:pointer-events-none after:content-[''] after:absolute after:inset-[6px] after:rounded-[calc(0.75rem-6px)] after:md:rounded-[calc(1rem-6px)] after:bg-gradient-to-tl after:from-transparent after:via-white/[0.01] after:to-white/[0.02] after:pointer-events-none after:z-0 hover:bg-gray-100/50 dark:hover:bg-white/[0.06] transition-all duration-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.15),0_4px_20px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_6px_20px_rgba(255,255,255,0.12),0_2px_10px_rgba(255,255,255,0.08)] hover:transform hover:translateY(-2px)">
              <div className="px-8 md:px-12 py-6 md:py-8 text-center">
                <h3 className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide">
                  Kontakt & Rechtswirksamkeit
                </h3>
              </div>
              <div className="p-6 text-gray-700 dark:text-gray-200 text-sm leading-relaxed space-y-4 relative z-10">
                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Kontakt</h4>
                  <p>
                    Fragen rund um viktoria-wertheim.de bitte an den Webmaster richten.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Rechtswirksamkeit</h4>
                  <p>
                    Diese Allgemeinen Nutzungsbedingungen beziehen sich auf viktoria-wertheim.de.
                  </p>
                  <p className="mt-2">
                    Sofern Teile oder einzelne Formulierungen dieses Textes der geltenden Rechtslage nicht, nicht mehr oder nicht vollständig entsprechen sollten, bleiben die übrigen Teile des Dokumentes in ihrem Inhalt und ihrer Gültigkeit davon unberührt.
                  </p>
                </div>
              </div>
            </div>
          </AnimatedSection>

        </div>
      </div>
    </PageLayout>
  )
}