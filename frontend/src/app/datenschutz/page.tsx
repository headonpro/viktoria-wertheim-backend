"use client"

import PageLayout from '@/components/PageLayout'
import AnimatedSection from '@/components/AnimatedSection'
import { IconShield, IconUser, IconDatabase, IconLock, IconGavel, IconCookie, IconTrash, IconMail, IconEye, IconFileText } from '@tabler/icons-react'

export default function DatenschutzPage() {
  return (
    <PageLayout>
      <main className="px-4 py-6">
        <div className="container max-w-4xl space-y-6">
          
          {/* Titel und Einleitung */}
          <AnimatedSection delay={0.1}>
            <div className="bg-gray-100/40 dark:bg-white/[0.04] backdrop-blur-lg rounded-xl border-2 border-white/80 dark:border-white/[0.15] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_1px_8px_rgba(255,255,255,0.05)]">
              <div className="p-6 text-gray-700 dark:text-gray-200 text-sm leading-relaxed">
                <h1 className="text-xl font-bold text-viktoria-blue dark:text-white flex items-center mb-4">
                  <IconShield className="mr-3 text-viktoria-yellow" size={24} />
                  Datenschutzerklärung
                </h1>
                <p>
                  Diese Datenschutzerklärung klärt Sie über die Art, den Umfang und Zweck der Verarbeitung von personenbezogenen Daten (nachfolgend kurz &quot;Daten&quot;) im Rahmen der Erbringung unserer Leistungen sowie innerhalb unseres Onlineangebotes und der mit ihm verbundenen Webseiten, Funktionen und Inhalte sowie externen Onlinepräsenzen, wie z.B. unser Social Media Profile auf (nachfolgend gemeinsam bezeichnet als &quot;Onlineangebot&quot;). Im Hinblick auf die verwendeten Begrifflichkeiten, wie z.B. &quot;Verarbeitung&quot; oder &quot;Verantwortlicher&quot; verweisen wir auf die Definitionen im Art. 4 der Datenschutzgrundverordnung (DSGVO).
                </p>
              </div>
            </div>
          </AnimatedSection>

          {/* Verantwortlicher */}
          <AnimatedSection delay={0.2}>
            <div className="bg-gray-100/40 dark:bg-white/[0.04] backdrop-blur-lg rounded-xl border-2 border-white/80 dark:border-white/[0.15] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_1px_8px_rgba(255,255,255,0.05)]">
              <div className="p-6 text-gray-700 dark:text-gray-200 text-sm">
                <h2 className="text-lg font-bold text-viktoria-blue dark:text-white flex items-center mb-4">
                  <IconUser className="mr-3 text-viktoria-yellow" size={20} />
                  Verantwortlicher
                </h2>
                <div className="space-y-2">
                  <p><strong>SV Viktoria Wertheim</strong></p>
                  <p>Ingrid Scheurich</p>
                  <p>Haslocher Weg 85</p>
                  <p>97877 Wertheim</p>
                  <p>
                    <a href="mailto:ingrid-s@web.de" className="text-viktoria-blue dark:text-white hover:underline">
                      ingrid-s@web.de
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </AnimatedSection>

          {/* Arten der verarbeiteten Daten */}
          <AnimatedSection delay={0.3}>
            <div className="bg-gray-100/40 dark:bg-white/[0.04] backdrop-blur-lg rounded-xl border-2 border-white/80 dark:border-white/[0.15] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_1px_8px_rgba(255,255,255,0.05)]">
              <div className="p-6 text-gray-700 dark:text-gray-200 text-sm">
                <h2 className="text-lg font-bold text-viktoria-blue dark:text-white flex items-center mb-4">
                  <IconDatabase className="mr-3 text-viktoria-yellow" size={20} />
                  Arten der verarbeiteten Daten
                </h2>
                <ul className="list-disc list-inside space-y-2">
                  <li>Bestandsdaten (z.B., Personen-Stammdaten, Namen oder Adressen).</li>
                  <li>Kontaktdaten (z.B., E-Mail, Telefonnummern).</li>
                  <li>Inhaltsdaten (z.B., Texteingaben, Fotografien, Videos).</li>
                  <li>Nutzungsdaten (z.B., besuchte Webseiten, Interesse an Inhalten, Zugriffszeiten).</li>
                  <li>Meta-/Kommunikationsdaten (z.B., Geräte-Informationen, IP-Adressen).</li>
                </ul>
              </div>
            </div>
          </AnimatedSection>

          {/* Kategorien betroffener Personen */}
          <AnimatedSection delay={0.4}>
            <div className="bg-gray-100/40 dark:bg-white/[0.04] backdrop-blur-lg rounded-xl border-2 border-white/80 dark:border-white/[0.15] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_1px_8px_rgba(255,255,255,0.05)]">
              <div className="p-6 text-gray-700 dark:text-gray-200 text-sm">
                <h2 className="text-lg font-bold text-viktoria-blue dark:text-white mb-4">
                  Kategorien betroffener Personen
                </h2>
                <p>
                  Besucher und Nutzer des Onlineangebotes (Nachfolgend bezeichnen wir die betroffenen Personen zusammenfassend auch als &quot;Nutzer&quot;).
                </p>
              </div>
            </div>
          </AnimatedSection>

          {/* Zweck der Verarbeitung */}
          <AnimatedSection delay={0.5}>
            <div className="bg-gray-100/40 dark:bg-white/[0.04] backdrop-blur-lg rounded-xl border-2 border-white/80 dark:border-white/[0.15] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_1px_8px_rgba(255,255,255,0.05)]">
              <div className="p-6 text-gray-700 dark:text-gray-200 text-sm">
                <h2 className="text-lg font-bold text-viktoria-blue dark:text-white mb-4">
                  Zweck der Verarbeitung
                </h2>
                <ul className="list-disc list-inside space-y-2">
                  <li>Zurverfügungstellung des Onlineangebotes, seiner Funktionen und Inhalte.</li>
                  <li>Beantwortung von Kontaktanfragen und Kommunikation mit Nutzern.</li>
                  <li>Sicherheitsmaßnahmen.</li>
                  <li>Reichweitenmessung/Marketing</li>
                </ul>
              </div>
            </div>
          </AnimatedSection>

          {/* Verwendete Begrifflichkeiten */}
          <AnimatedSection delay={0.6}>
            <div className="bg-gray-100/40 dark:bg-white/[0.04] backdrop-blur-lg rounded-xl border-2 border-white/80 dark:border-white/[0.15] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_1px_8px_rgba(255,255,255,0.05)]">
              <div className="p-6 text-gray-700 dark:text-gray-200 text-sm leading-relaxed space-y-4">
                <h2 className="text-lg font-bold text-viktoria-blue dark:text-white flex items-center mb-4">
                  <IconFileText className="mr-3 text-viktoria-yellow" size={20} />
                  Verwendete Begrifflichkeiten
                </h2>
                <div>
                  <h3 className="font-semibold text-viktoria-blue dark:text-white mb-2">&quot;Personenbezogene Daten&quot;</h3>
                  <p>
                    sind alle Informationen, die sich auf eine identifizierte oder identifizierbare natürliche Person (im Folgenden &quot;betroffene Person&quot;) beziehen; als identifizierbar wird eine natürliche Person angesehen, die direkt oder indirekt, insbesondere mittels Zuordnung zu einer Kennung wie einem Namen, zu einer Kennnummer, zu Standortdaten, zu einer Online-Kennung (z.B. Cookie) oder zu einem oder mehreren besonderen Merkmalen identifiziert werden kann, die Ausdruck der physischen, physiologischen, genetischen, psychischen, wirtschaftlichen, kulturellen oder sozialen Identität dieser natürlichen Person sind.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-viktoria-blue dark:text-white mb-2">&quot;Verarbeitung&quot;</h3>
                  <p>
                    ist jeder mit oder ohne Hilfe automatisierter Verfahren ausgeführte Vorgang oder jede solche Vorgangsreihe im Zusammenhang mit personenbezogenen Daten. Der Begriff reicht weit und umfasst praktisch jeden Umgang mit Daten.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-viktoria-blue dark:text-white mb-2">&quot;Pseudonymisierung&quot;</h3>
                  <p>
                    die Verarbeitung personenbezogener Daten in einer Weise, dass die personenbezogenen Daten ohne Hinzuziehung zusätzlicher Informationen nicht mehr einer spezifischen betroffenen Person zugeordnet werden können, sofern diese zusätzlichen Informationen gesondert aufbewahrt werden und technischen und organisatorischen Maßnahmen unterliegen, die gewährleisten, dass die personenbezogenen Daten nicht einer identifizierten oder identifizierbaren natürlichen Person zugewiesen werden.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-viktoria-blue dark:text-white mb-2">&quot;Profiling&quot;</h3>
                  <p>
                    jede Art der automatisierten Verarbeitung personenbezogener Daten, die darin besteht, dass diese personenbezogenen Daten verwendet werden, um bestimmte persönliche Aspekte, die sich auf eine natürliche Person beziehen, zu bewerten, insbesondere um Aspekte bezüglich Arbeitsleistung, wirtschaftliche Lage, Gesundheit, persönliche Vorlieben, Interessen, Zuverlässigkeit, Verhalten, Aufenthaltsort oder Ortswechsel dieser natürlichen Person zu analysieren oder vorherzusagen.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-viktoria-blue dark:text-white mb-2">&quot;Verantwortlicher&quot;</h3>
                  <p>
                    wird die natürliche oder juristische Person, Behörde, Einrichtung oder andere Stelle, die allein oder gemeinsam mit anderen über die Zwecke und Mittel der Verarbeitung von personenbezogenen Daten entscheidet, bezeichnet.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-viktoria-blue dark:text-white mb-2">&quot;Auftragsverarbeiter&quot;</h3>
                  <p>
                    eine natürliche oder juristische Person, Behörde, Einrichtung oder andere Stelle, die personenbezogene Daten im Auftrag des Verantwortlichen verarbeitet.
                  </p>
                </div>
              </div>
            </div>
          </AnimatedSection>

          {/* Maßgebliche Rechtsgrundlagen */}
          <AnimatedSection delay={0.7}>
            <div className="bg-gray-100/40 dark:bg-white/[0.04] backdrop-blur-lg rounded-xl border-2 border-white/80 dark:border-white/[0.15] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_1px_8px_rgba(255,255,255,0.05)]">
              <div className="p-6 text-gray-700 dark:text-gray-200 text-sm leading-relaxed space-y-3">
                <h2 className="text-lg font-bold text-viktoria-blue dark:text-white flex items-center mb-4">
                  <IconGavel className="mr-3 text-viktoria-yellow" size={20} />
                  Maßgebliche Rechtsgrundlagen
                </h2>
                <p>
                  Nach Maßgabe des Art. 13 DSGVO teilen wir Ihnen die Rechtsgrundlagen unserer Datenverarbeitungen mit. Für Nutzer aus dem Geltungsbereich der Datenschutzgrundverordnung (DSGVO), d.h. der EU und des EWG gilt, sofern die Rechtsgrundlage in der Datenschutzerklärung nicht genannt wird, Folgendes:
                </p>
                <ul className="list-disc list-inside space-y-2">
                  <li>Die Rechtsgrundlage für die Einholung von Einwilligungen ist Art. 6 Abs. 1 lit. a und Art. 7 DSGVO;</li>
                  <li>Die Rechtsgrundlage für die Verarbeitung zur Erfüllung unserer Leistungen und Durchführung vertraglicher Maßnahmen sowie Beantwortung von Anfragen ist Art. 6 Abs. 1 lit. b DSGVO;</li>
                  <li>Die Rechtsgrundlage für die Verarbeitung zur Erfüllung unserer rechtlichen Verpflichtungen ist Art. 6 Abs. 1 lit. c DSGVO;</li>
                  <li>Für den Fall, dass lebenswichtige Interessen der betroffenen Person oder einer anderen natürlichen Person eine Verarbeitung personenbezogener Daten erforderlich machen, dient Art. 6 Abs. 1 lit. d DSGVO als Rechtsgrundlage.</li>
                  <li>Die Rechtsgrundlage für die erforderliche Verarbeitung zur Wahrnehmung einer Aufgabe, die im öffentlichen Interesse liegt oder in Ausübung öffentlicher Gewalt erfolgt, die dem Verantwortlichen übertragen wurde ist Art. 6 Abs. 1 lit. e DSGVO.</li>
                  <li>Die Rechtsgrundlage für die Verarbeitung zur Wahrung unserer berechtigten Interessen ist Art. 6 Abs. 1 lit. f DSGVO.</li>
                </ul>
              </div>
            </div>
          </AnimatedSection>

          {/* Sicherheitsmaßnahmen */}
          <AnimatedSection delay={0.8}>
            <div className="bg-gray-100/40 dark:bg-white/[0.04] backdrop-blur-lg rounded-xl border-2 border-white/80 dark:border-white/[0.15] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_1px_8px_rgba(255,255,255,0.05)]">
              <div className="p-6 text-gray-700 dark:text-gray-200 text-sm leading-relaxed space-y-4">
                <h2 className="text-lg font-bold text-viktoria-blue dark:text-white flex items-center mb-4">
                  <IconLock className="mr-3 text-viktoria-yellow" size={20} />
                  Sicherheitsmaßnahmen
                </h2>
                <p>
                  Wir treffen nach Maßgabe der gesetzlichen Vorgaben unter Berücksichtigung des Stands der Technik, der Implementierungskosten und der Art, des Umfangs, der Umstände und der Zwecke der Verarbeitung sowie der unterschiedlichen Eintrittswahrscheinlichkeit und Schwere des Risikos für die Rechte und Freiheiten natürlicher Personen, geeignete technische und organisatorische Maßnahmen, um ein dem Risiko angemessenes Schutzniveau zu gewährleisten.
                </p>
                <p>
                  Zu den Maßnahmen gehören insbesondere die Sicherung der Vertraulichkeit, Integrität und Verfügbarkeit von Daten durch Kontrolle des physischen Zugangs zu den Daten, als auch des sie betreffenden Zugriffs, der Eingabe, Weitergabe, der Sicherung der Verfügbarkeit und ihrer Trennung. Des Weiteren haben wir Verfahren eingerichtet, die eine Wahrnehmung von Betroffenenrechten, Löschung von Daten und Reaktion auf Gefährdung der Daten gewährleisten. Ferner berücksichtigen wir den Schutz personenbezogener Daten bereits bei der Entwicklung, bzw. Auswahl von Hardware, Software sowie Verfahren, entsprechend dem Prinzip des Datenschutzes durch Technikgestaltung und durch datenschutzfreundliche Voreinstellungen.
                </p>
              </div>
            </div>
          </AnimatedSection>

          {/* Cookies */}
          <AnimatedSection delay={0.9}>
            <div className="bg-gray-100/40 dark:bg-white/[0.04] backdrop-blur-lg rounded-xl border-2 border-white/80 dark:border-white/[0.15] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_1px_8px_rgba(255,255,255,0.05)]">
              <div className="p-6 text-gray-700 dark:text-gray-200 text-sm leading-relaxed space-y-4">
                <h2 className="text-lg font-bold text-viktoria-blue dark:text-white flex items-center mb-4">
                  <IconCookie className="mr-3 text-viktoria-yellow" size={20} />
                  Cookies und Widerspruchsrecht bei Direktwerbung
                </h2>
                <p>
                  Als &quot;Cookies&quot; werden kleine Dateien bezeichnet, die auf Rechnern der Nutzer gespeichert werden. Innerhalb der Cookies können unterschiedliche Angaben gespeichert werden. Ein Cookie dient primär dazu, die Angaben zu einem Nutzer (bzw. dem Gerät auf dem das Cookie gespeichert ist) während oder auch nach seinem Besuch innerhalb eines Onlineangebotes zu speichern.
                </p>
                <p>
                  Als temporäre Cookies, bzw. &quot;Session-Cookies&quot; oder &quot;transiente Cookies&quot;, werden Cookies bezeichnet, die gelöscht werden, nachdem ein Nutzer ein Onlineangebot verlässt und seinen Browser schließt. Als &quot;permanent&quot; oder &quot;persistent&quot; werden Cookies bezeichnet, die auch nach dem Schließen des Browsers gespeichert bleiben.
                </p>
                <p>
                  Falls die Nutzer nicht möchten, dass Cookies auf ihrem Rechner gespeichert werden, werden sie gebeten die entsprechende Option in den Systemeinstellungen ihres Browsers zu deaktivieren. Gespeicherte Cookies können in den Systemeinstellungen des Browsers gelöscht werden. Der Ausschluss von Cookies kann zu Funktionseinschränkungen dieses Onlineangebotes führen.
                </p>
              </div>
            </div>
          </AnimatedSection>

          {/* Rechte der betroffenen Personen */}
          <AnimatedSection delay={1.0}>
            <div className="bg-gray-100/40 dark:bg-white/[0.04] backdrop-blur-lg rounded-xl border-2 border-white/80 dark:border-white/[0.15] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_1px_8px_rgba(255,255,255,0.05)]">
              <div className="p-6 text-gray-700 dark:text-gray-200 text-sm leading-relaxed space-y-3">
                <h2 className="text-lg font-bold text-viktoria-blue dark:text-white flex items-center mb-4">
                  <IconEye className="mr-3 text-viktoria-yellow" size={20} />
                  Rechte der betroffenen Personen
                </h2>
                <ul className="list-disc list-inside space-y-2">
                  <li>Sie haben das Recht, eine Bestätigung darüber zu verlangen, ob betreffende Daten verarbeitet werden und auf Auskunft über diese Daten sowie auf weitere Informationen und Kopie der Daten entsprechend den gesetzlichen Vorgaben.</li>
                  <li>Sie haben entsprechend den gesetzlichen Vorgaben das Recht, die Vervollständigung der Sie betreffenden Daten oder die Berichtigung der Sie betreffenden unrichtigen Daten zu verlangen.</li>
                  <li>Sie haben nach Maßgabe der gesetzlichen Vorgaben das Recht zu verlangen, dass betreffende Daten unverzüglich gelöscht werden, bzw. alternativ nach Maßgabe der gesetzlichen Vorgaben eine Einschränkung der Verarbeitung der Daten zu verlangen.</li>
                  <li>Sie haben das Recht zu verlangen, dass die Sie betreffenden Daten, die Sie uns bereitgestellt haben nach Maßgabe der gesetzlichen Vorgaben zu erhalten und deren Übermittlung an andere Verantwortliche zu fordern.</li>
                  <li>Sie haben ferner nach Maßgabe der gesetzlichen Vorgaben das Recht, eine Beschwerde bei der zuständigen Aufsichtsbehörde einzureichen.</li>
                </ul>
                
                <div className="bg-viktoria-blue/5 rounded-lg p-4 border border-viktoria-blue/20 mt-6">
                  <h3 className="font-semibold text-viktoria-blue dark:text-white mb-2">Widerrufsrecht</h3>
                  <p>Sie haben das Recht, erteilte Einwilligungen mit Wirkung für die Zukunft zu widerrufen.</p>
                  
                  <h3 className="font-semibold text-viktoria-blue dark:text-white mb-2 mt-4">Widerspruchsrecht</h3>
                  <p>Sie können der künftigen Verarbeitung der Sie betreffenden Daten nach Maßgabe der gesetzlichen Vorgaben jederzeit widersprechen. Der Widerspruch kann insbesondere gegen die Verarbeitung für Zwecke der Direktwerbung erfolgen.</p>
                </div>
              </div>
            </div>
          </AnimatedSection>

          {/* Löschung von Daten */}
          <AnimatedSection delay={1.1}>
            <div className="bg-gray-100/40 dark:bg-white/[0.04] backdrop-blur-lg rounded-xl border-2 border-white/80 dark:border-white/[0.15] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_1px_8px_rgba(255,255,255,0.05)]">
              <div className="p-6 text-gray-700 dark:text-gray-200 text-sm leading-relaxed">
                <h2 className="text-lg font-bold text-viktoria-blue dark:text-white flex items-center mb-4">
                  <IconTrash className="mr-3 text-viktoria-yellow" size={20} />
                  Löschung von Daten
                </h2>
                <p>
                  Die von uns verarbeiteten Daten werden nach Maßgabe der gesetzlichen Vorgaben gelöscht oder in ihrer Verarbeitung eingeschränkt. Sofern nicht im Rahmen dieser Datenschutzerklärung ausdrücklich angegeben, werden die bei uns gespeicherten Daten gelöscht, sobald sie für ihre Zweckbestimmung nicht mehr erforderlich sind und der Löschung keine gesetzlichen Aufbewahrungspflichten entgegenstehen.
                </p>
              </div>
            </div>
          </AnimatedSection>

          {/* Kontaktaufnahme */}
          <AnimatedSection delay={1.2}>
            <div className="bg-gray-100/40 dark:bg-white/[0.04] backdrop-blur-lg rounded-xl border-2 border-white/80 dark:border-white/[0.15] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_1px_8px_rgba(255,255,255,0.05)]">
              <div className="p-6 text-gray-700 dark:text-gray-200 text-sm leading-relaxed">
                <h2 className="text-lg font-bold text-viktoria-blue dark:text-white flex items-center mb-4">
                  <IconMail className="mr-3 text-viktoria-yellow" size={20} />
                  Kontaktaufnahme
                </h2>
                <p>
                  Bei der Kontaktaufnahme mit uns (z.B. per Kontaktformular, E-Mail, Telefon oder via sozialer Medien) werden die Angaben des Nutzers zur Bearbeitung der Kontaktanfrage und deren Abwicklung gem. Art. 6 Abs. 1 lit. b. (im Rahmen vertraglicher-/vorvertraglicher Beziehungen), Art. 6 Abs. 1 lit. f. (andere Anfragen) DSGVO verarbeitet. Die Angaben der Nutzer können in einem Customer-Relationship-Management System (&quot;CRM System&quot;) oder vergleichbarer Anfragenorganisation gespeichert werden.
                </p>
                <p className="mt-3">
                  Wir löschen die Anfragen, sofern diese nicht mehr erforderlich sind. Wir überprüfen die Erforderlichkeit alle zwei Jahre; Ferner gelten die gesetzlichen Archivierungspflichten.
                </p>
              </div>
            </div>
          </AnimatedSection>

          {/* Quelle */}
          <AnimatedSection delay={1.3}>
            <div className="bg-viktoria-blue/5 rounded-xl p-4 border border-viktoria-blue/20 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Erstellt mit Datenschutz-Generator.de von RA Dr. Thomas Schwenke
              </p>
            </div>
          </AnimatedSection>

        </div>
      </main>
    </PageLayout>
  )
}