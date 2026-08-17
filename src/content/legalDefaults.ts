/**
 * Built-in fallback content for the legal pages.
 *
 * The pages render whatever an admin saved in the `legal_documents` table.
 * When a language is still empty there, these defaults are used, so the
 * Privacy Policy and Terms are never blank.
 */

export interface LegalDefault {
  title: string;
  subtitle: string;
  lastUpdated: string;
  body: string;
}

export type LegalSlug = "privacy-policy" | "terms";

const privacyEn: LegalDefault = {
  title: "Privacy Policy",
  subtitle:
    "How we collect, use and protect your personal data in the LN-RADS Certification platform.",
  lastUpdated: "12 August 2026",
  body: `## 1. Data Controller

The controller of your personal data is **Praktyka Lekarska Cezary Chudobiński**, ul. Bursztynowa 2, 95-050 Konstantynów Łódzki, Poland, NIP (VAT) 8291244164, REGON 731020643 (the "Controller", "we", "us").

In all matters relating to personal data you may contact us at [cert@lnrads.com](mailto:cert@lnrads.com).

This Policy describes how we process personal data in connection with the LN-RADS Certification platform (the "Platform") and is issued in accordance with Regulation (EU) 2016/679 (GDPR) and Polish data protection law.

## 2. What data we collect

- **Account data:** full name, e-mail address, password (stored only as a cryptographic hash), and — where you sign in with Google or Apple — the basic profile information shared by that provider.
- **Consent records:** the date and version of the Privacy Policy and Terms and Conditions you accepted.
- **Learning data:** course progress, completed lessons, bookmarks, test answers, scores, number and results of certification attempts, issued certificates and the name printed on a certificate.
- **Purchase and invoicing data:** purchased courses and extra certification attempts, amounts paid, currency, payment identifiers, billing name and company, billing address, country and VAT identification number, refunds and issued invoices or corrective invoices.
- **Technical data:** data necessary to maintain your session and secure the Platform, including data stored in your browser's local storage, and server logs.

Card and other payment credentials are entered directly on the payment provider's page and are never collected or stored by us.

## 3. Purposes and legal bases

- **Providing the Platform** — creating and maintaining your account, giving access to courses, running tests, issuing certificates: performance of a contract, Art. 6(1)(b) GDPR.
- **Processing payments and issuing invoices**: performance of a contract, Art. 6(1)(b) GDPR, and compliance with tax and accounting obligations, Art. 6(1)(c) GDPR.
- **Confirming your e-mail address and securing accounts**: performance of a contract and our legitimate interest in protecting the Platform, Art. 6(1)(b) and (f) GDPR.
- **Recording your acceptance of the Terms and this Policy**: compliance with our accountability obligations, Art. 6(1)(c) and Art. 5(2) GDPR.
- **Handling complaints, refunds and defending claims**: our legitimate interest, Art. 6(1)(f) GDPR.
- **Optional communication you request** (for example messages you agree to receive): your consent, Art. 6(1)(a) GDPR, which you may withdraw at any time.

Providing account and billing data is voluntary but necessary to use the paid features of the Platform; without it we cannot conclude or perform the contract.

## 4. Recipients and processors

We disclose personal data only to the extent necessary, to:

- our hosting, database, authentication and e-mail delivery providers, which operate the technical infrastructure of the Platform on our behalf;
- Stripe, which processes card payments and refunds as an independent payment service provider;
- Google and Apple, if you choose to sign in using their identity services;
- our accounting office, and legal or tax advisers where required;
- public authorities, where we are obliged by law to do so.

All processors act under written data processing agreements and may process your data only on our instructions.

## 5. Transfers outside the EEA

Some of our providers may process data outside the European Economic Area. In such cases the transfer is based on an adequacy decision of the European Commission or on the Standard Contractual Clauses adopted by the European Commission, together with supplementary technical safeguards. You may request information about the safeguards applied by contacting us.

## 6. Retention periods

- **Account and learning data:** for as long as your account exists, and afterwards for the period needed to establish, exercise or defend legal claims.
- **Invoices and accounting records:** 5 years counted from the end of the calendar year in which the tax payment deadline fell, as required by Polish tax law.
- **Issued certificates and their verification records:** for the validity period of the certification and afterwards for archival purposes, so that a certificate can be verified.
- **Consent records:** for the duration of the consent and the applicable limitation period.

## 7. Your rights

You have the right to:

- access your data and obtain a copy of it;
- rectify inaccurate or incomplete data;
- erase your data ("right to be forgotten"), unless we must keep it by law;
- restrict processing;
- data portability;
- object to processing based on our legitimate interest;
- withdraw consent at any time, without affecting the lawfulness of processing carried out before withdrawal.

To exercise these rights, write to [cert@lnrads.com](mailto:cert@lnrads.com). You also have the right to lodge a complaint with the President of the Personal Data Protection Office (Prezes Urzędu Ochrony Danych Osobowych), ul. Stawki 2, 00-193 Warsaw, Poland.

## 8. Cookies and local storage

The Platform uses only storage that is strictly necessary to provide the service: a session token kept in your browser's local storage so that you remain signed in, and technical identifiers required for security and for the payment process. These are not used for advertising or cross-site tracking, and therefore do not require your consent under Art. 173 of the Polish Telecommunications Act.

You can clear this data at any time in your browser settings; signing in again will be required afterwards.

## 9. Automated decision-making

Test results are scored automatically against a predefined answer key and a fixed passing threshold. This scoring does not constitute automated decision-making producing legal effects within the meaning of Art. 22 GDPR, and every result may be reviewed by us on request. We do not carry out profiling for marketing purposes.

## 10. Security

We apply technical and organisational measures appropriate to the risk, including encrypted transmission (TLS), hashed passwords, access control at row level in our database, restricted administrative access and regular backups.

## 11. Children

The Platform is intended for medical professionals and is not directed at persons under 16 years of age. We do not knowingly collect data of such persons.

## 12. Changes to this Policy

We may update this Policy, for example when we change the scope of our services or our providers. The current version is always published on this page with its date of update. In the case of material changes we will inform registered users by e-mail or by a notice in the Platform before the change takes effect.`,
};

const privacyPl: LegalDefault = {
  title: "Polityka prywatności",
  subtitle:
    "Jak zbieramy, wykorzystujemy i chronimy Twoje dane osobowe na platformie certyfikacji LN-RADS.",
  lastUpdated: "12 sierpnia 2026",
  body: `## 1. Administrator danych

Administratorem Twoich danych osobowych jest **Praktyka Lekarska Cezary Chudobiński**, ul. Bursztynowa 2, 95-050 Konstantynów Łódzki, Polska, NIP 8291244164, REGON 731020643 („Administrator", „my").

We wszystkich sprawach dotyczących danych osobowych możesz skontaktować się z nami pod adresem [cert@lnrads.com](mailto:cert@lnrads.com).

Niniejsza Polityka opisuje, w jaki sposób przetwarzamy dane osobowe w związku z platformą certyfikacji LN-RADS („Platforma"), zgodnie z rozporządzeniem (UE) 2016/679 (RODO) oraz polskimi przepisami o ochronie danych osobowych.

## 2. Jakie dane zbieramy

- **Dane konta:** imię i nazwisko, adres e-mail, hasło (przechowywane wyłącznie jako skrót kryptograficzny), a w przypadku logowania przez Google lub Apple — podstawowe informacje profilowe udostępnione przez tego dostawcę.
- **Zapisy zgód:** data i wersja Polityki prywatności oraz Regulaminu, które zaakceptowałeś/aś.
- **Dane o nauce:** postęp w kursie, ukończone lekcje, zakładki, odpowiedzi w testach, wyniki, liczba i rezultaty podejść certyfikacyjnych, wydane certyfikaty oraz imię i nazwisko drukowane na certyfikacie.
- **Dane zakupowe i rozliczeniowe:** zakupione kursy i dodatkowe podejścia certyfikacyjne, zapłacone kwoty, waluta, identyfikatory płatności, nazwa nabywcy i firma, adres rozliczeniowy, kraj i numer VAT, zwroty oraz wystawione faktury i faktury korygujące.
- **Dane techniczne:** dane niezbędne do utrzymania sesji i zapewnienia bezpieczeństwa Platformy, w tym dane zapisane w pamięci lokalnej przeglądarki oraz logi serwera.

Dane karty płatniczej i inne dane uwierzytelniające płatność podajesz bezpośrednio na stronie dostawcy płatności — nigdy ich nie zbieramy ani nie przechowujemy.

## 3. Cele i podstawy prawne

- **Świadczenie usług Platformy** — założenie i utrzymanie konta, udostępnianie kursów, przeprowadzanie testów, wydawanie certyfikatów: wykonanie umowy, art. 6 ust. 1 lit. b RODO.
- **Obsługa płatności i wystawianie faktur**: wykonanie umowy, art. 6 ust. 1 lit. b RODO, oraz wypełnienie obowiązków podatkowych i księgowych, art. 6 ust. 1 lit. c RODO.
- **Potwierdzanie adresu e-mail i zabezpieczanie kont**: wykonanie umowy oraz nasz prawnie uzasadniony interes polegający na ochronie Platformy, art. 6 ust. 1 lit. b i f RODO.
- **Rejestrowanie akceptacji Regulaminu i niniejszej Polityki**: realizacja obowiązku rozliczalności, art. 6 ust. 1 lit. c oraz art. 5 ust. 2 RODO.
- **Obsługa reklamacji, zwrotów i obrona przed roszczeniami**: nasz prawnie uzasadniony interes, art. 6 ust. 1 lit. f RODO.
- **Dobrowolna komunikacja, o którą prosisz** (np. wiadomości, na które wyrazisz zgodę): Twoja zgoda, art. 6 ust. 1 lit. a RODO, którą możesz wycofać w każdej chwili.

Podanie danych konta i danych rozliczeniowych jest dobrowolne, ale niezbędne do korzystania z płatnych funkcji Platformy; bez nich nie możemy zawrzeć ani wykonać umowy.

## 4. Odbiorcy i podmioty przetwarzające

Dane osobowe ujawniamy wyłącznie w niezbędnym zakresie:

- dostawcom hostingu, bazy danych, uwierzytelniania i wysyłki poczty e-mail, którzy w naszym imieniu utrzymują infrastrukturę techniczną Platformy;
- Stripe, który jako niezależny dostawca usług płatniczych obsługuje płatności kartą i zwroty;
- Google i Apple, jeśli wybierzesz logowanie przy użyciu ich usług tożsamości;
- naszemu biuru rachunkowemu oraz doradcom prawnym lub podatkowym, gdy jest to konieczne;
- organom publicznym, gdy jesteśmy do tego zobowiązani przepisami prawa.

Wszystkie podmioty przetwarzające działają na podstawie pisemnych umów powierzenia i mogą przetwarzać dane wyłącznie zgodnie z naszymi poleceniami.

## 5. Przekazywanie danych poza EOG

Część naszych dostawców może przetwarzać dane poza Europejskim Obszarem Gospodarczym. W takich przypadkach przekazanie odbywa się na podstawie decyzji Komisji Europejskiej stwierdzającej odpowiedni stopień ochrony albo na podstawie standardowych klauzul umownych przyjętych przez Komisję Europejską, wraz z dodatkowymi zabezpieczeniami technicznymi. Informacje o zastosowanych zabezpieczeniach możesz uzyskać, kontaktując się z nami.

## 6. Okresy przechowywania

- **Dane konta i dane o nauce:** przez czas istnienia konta, a następnie przez okres niezbędny do ustalenia, dochodzenia lub obrony roszczeń.
- **Faktury i dokumentacja księgowa:** 5 lat licząc od końca roku kalendarzowego, w którym upłynął termin płatności podatku, zgodnie z polskimi przepisami podatkowymi.
- **Wydane certyfikaty i dane umożliwiające ich weryfikację:** przez okres ważności certyfikacji, a następnie w celach archiwalnych, aby certyfikat mógł zostać zweryfikowany.
- **Zapisy zgód:** przez czas obowiązywania zgody oraz okres przedawnienia roszczeń.

## 7. Twoje prawa

Masz prawo do:

- dostępu do swoich danych i uzyskania ich kopii;
- sprostowania danych nieprawidłowych lub niekompletnych;
- usunięcia danych („prawo do bycia zapomnianym"), o ile nie musimy ich przechowywać na podstawie przepisów prawa;
- ograniczenia przetwarzania;
- przenoszenia danych;
- sprzeciwu wobec przetwarzania opartego na naszym prawnie uzasadnionym interesie;
- wycofania zgody w dowolnym momencie, bez wpływu na zgodność z prawem przetwarzania dokonanego przed jej wycofaniem.

Aby skorzystać z tych praw, napisz na adres [cert@lnrads.com](mailto:cert@lnrads.com). Masz również prawo wniesienia skargi do Prezesa Urzędu Ochrony Danych Osobowych, ul. Stawki 2, 00-193 Warszawa.

## 8. Pliki cookie i pamięć lokalna

Platforma korzysta wyłącznie z danych niezbędnych do świadczenia usługi: tokenu sesji zapisanego w pamięci lokalnej przeglądarki, dzięki któremu pozostajesz zalogowany/a, oraz identyfikatorów technicznych wymaganych dla bezpieczeństwa i procesu płatności. Nie służą one reklamie ani śledzeniu między witrynami, a zatem nie wymagają Twojej zgody na podstawie art. 173 Prawa telekomunikacyjnego.

Dane te możesz w każdej chwili usunąć w ustawieniach przeglądarki; konieczne będzie wtedy ponowne zalogowanie.

## 9. Zautomatyzowane podejmowanie decyzji

Wyniki testów są oceniane automatycznie na podstawie z góry ustalonego klucza odpowiedzi i stałego progu zaliczenia. Ocena ta nie stanowi zautomatyzowanego podejmowania decyzji wywołującego skutki prawne w rozumieniu art. 22 RODO, a każdy wynik może zostać przez nas zweryfikowany na wniosek. Nie prowadzimy profilowania w celach marketingowych.

## 10. Bezpieczeństwo

Stosujemy środki techniczne i organizacyjne odpowiednie do ryzyka, w tym szyfrowaną transmisję (TLS), haszowanie haseł, kontrolę dostępu na poziomie wierszy w bazie danych, ograniczony dostęp administracyjny oraz regularne kopie zapasowe.

## 11. Dzieci

Platforma jest przeznaczona dla profesjonalistów medycznych i nie jest kierowana do osób poniżej 16. roku życia. Nie zbieramy świadomie danych takich osób.

## 12. Zmiany Polityki

Możemy aktualizować niniejszą Politykę, na przykład w przypadku zmiany zakresu naszych usług lub dostawców. Aktualna wersja jest zawsze publikowana na tej stronie wraz z datą aktualizacji. O istotnych zmianach poinformujemy zarejestrowanych użytkowników pocztą e-mail lub komunikatem na Platformie przed wejściem zmian w życie.`,
};

const termsEn: LegalDefault = {
  title: "Terms and Conditions",
  subtitle:
    "Rules for using the LN-RADS Certification platform and for purchasing courses and certification attempts (Regulamin).",
  lastUpdated: "12 August 2026",
  body: `## 1. Service provider

The Platform is operated by **Praktyka Lekarska Cezary Chudobiński**, ul. Bursztynowa 2, 95-050 Konstantynów Łódzki, Poland, NIP (VAT) 8291244164, REGON 731020643 (the "Provider", "we", "us").

Contact: [cert@lnrads.com](mailto:cert@lnrads.com). These Terms are issued pursuant to Art. 8 of the Polish Act of 18 July 2002 on the provision of electronic services.

## 2. Definitions

- **Platform** — the LN-RADS Certification website and application.
- **User** — a natural person using the Platform.
- **Consumer** — a User who is a natural person acting for purposes outside their business or professional activity, and (where applicable) an entrepreneur benefiting from consumer protection under Art. 385(5) of the Polish Civil Code.
- **Course** — digital educational content made available on the Platform.
- **Certification Test** — the examination which, if passed, results in a certificate.
- **Attempt** — a single start of a Certification Test.

## 3. Scope of services

- access to online Courses consisting of lessons, materials and practice use cases;
- free preview of content expressly marked as free preview, available also without an account;
- Certification Tests and issuance of an electronic certificate upon passing;
- purchase of additional Attempts, where offered for a given Course.

Courses are digital content and are made available electronically. We do not provide medical advice; the content is educational and does not replace the User's own clinical judgement.

## 4. Account and e-mail confirmation

- Registration requires a valid e-mail address, a password and acceptance of these Terms and the Privacy Policy.
- After registration we send a confirmation link to the e-mail address provided. The account is activated only after the link is used; until then signing in is not possible.
- Alternatively you may create an account using Google or Apple sign-in.
- The User must provide true data, keep the password confidential and not share account access with third parties.
- Technical requirements: a device with internet access, a current version of a web browser with JavaScript and local storage enabled, and an active e-mail account.
- The User may delete the account at any time by contacting us. Deletion does not affect documents we are required by law to retain.

## 5. Orders, prices and payment

- Prices shown on the Platform are total prices in euro (EUR) and include VAT where applicable.
- A contract is concluded when the payment is successfully authorised and we confirm access to the purchased Course or Attempt.
- Payments are handled by Stripe. To complete a purchase you must provide a billing address; business buyers may provide a VAT identification number.
- For buyers with a valid VAT identification number from another EU Member State, VAT is accounted for under the reverse charge mechanism.
- An invoice is issued electronically and sent to the e-mail address given at checkout. By purchasing, the User consents to receiving invoices in electronic form.
- Access to purchased content is granted immediately after payment and, unless stated otherwise in the Course description, is not limited in time as long as the Platform is operated.

## 6. Right of withdrawal (Consumers)

A Consumer may withdraw from a distance contract within 14 days of its conclusion without giving a reason, by sending a statement to [cert@lnrads.com](mailto:cert@lnrads.com). We refund the payment within 14 days using the same payment method.

**Loss of the right of withdrawal.** In accordance with Art. 38(1)(13) of the Polish Act on Consumer Rights, the right of withdrawal does not apply to contracts for the supply of digital content which is not supplied on a tangible medium if performance began with the Consumer's prior express consent and their acknowledgement that they thereby lose the right of withdrawal. Before granting access we ask for this consent; if you start the Course or a Certification Test, the right of withdrawal expires.

**Model withdrawal form.** "I hereby withdraw from the contract for the supply of digital content concluded on [date]. Name and surname: [...]. Address / e-mail: [...]. Order or invoice number: [...]. Date: [...]."

## 7. Certification rules

- Each Course with certification specifies the number of Attempts included in the price and the maximum total number of Attempts.
- Additional Attempts beyond those included may be purchased at the price shown for the given Course.
- Attempts are personal and non-transferable. An Attempt is deemed used once the test has been started.
- Once all permitted Attempts have been used, further examination is not available through the Platform; the User should contact [cert@lnrads.com](mailto:cert@lnrads.com).
- A certificate is issued in the name provided by the User and confirms passing the test; it does not constitute a professional qualification or licence granted by a public authority.
- Any attempt to falsify results, share test content or use unauthorised assistance may result in annulment of the result and blocking of the account.

## 8. Licence and intellectual property

All content of the Platform, including texts, images, cases and test questions, is protected by copyright and belongs to the Provider or its licensors. Upon purchase the User obtains a non-exclusive, non-transferable licence to use the content for their own educational purposes only, for the duration of access.

It is prohibited in particular to copy, record, distribute, publish, resell or share the content or account credentials, and to use the content for training automated systems, without our prior written consent.

## 9. Prohibited conduct

- providing unlawful content or data of third parties without authorisation;
- interfering with the operation or security of the Platform, including automated scraping and attempts to bypass access controls;
- using the Platform in a manner infringing the rights of others or applicable law.

In the event of a material breach we may suspend or terminate access after prior notice, or immediately where required to prevent damage.

## 10. Complaints and non-conformity of digital content

- Complaints may be submitted to [cert@lnrads.com](mailto:cert@lnrads.com) and should describe the problem and the account or order concerned.
- We respond within 14 days of receipt.
- If digital content is not in conformity with the contract, the Consumer may demand that it be brought into conformity and, in the cases provided by law, submit a statement on a price reduction or withdrawal from the contract, in accordance with the Polish Act on Consumer Rights implementing Directive (EU) 2019/770.

## 11. Availability and liability

We take care to keep the Platform available continuously, but we may carry out maintenance and updates, informing Users of planned interruptions where practicable. We are not liable for interruptions caused by circumstances beyond our control, including the User's internet connection or force majeure.

Our liability towards Users who are not Consumers is limited to the amount paid for the relevant Course or Attempt and excludes lost profits. Nothing in these Terms limits liability that cannot be excluded under applicable law, in particular liability for damage caused intentionally or towards Consumers.

## 12. Personal data

Personal data is processed in accordance with the [Privacy Policy](/privacy-policy), which forms an integral part of these Terms.

## 13. Changes to the Terms

We may amend these Terms for legally valid reasons, in particular changes in law, in the scope of services or in payment methods. Registered Users will be informed at least 14 days in advance by e-mail or a notice in the Platform, and may terminate the contract before the change takes effect. Amendments do not affect contracts already performed.

## 14. Governing law and disputes

These Terms are governed by Polish law. This does not deprive a Consumer of the protection of the mandatory provisions of the law of their country of habitual residence.

Consumers may use out-of-court dispute resolution, including the permanent consumer arbitration courts and mediation at the Trade Inspection (Inspekcja Handlowa), and the EU online dispute resolution platform at [ec.europa.eu/consumers/odr](https://ec.europa.eu/consumers/odr). Disputes with Users who are not Consumers are subject to the courts competent for our registered seat.`,
};

const termsPl: LegalDefault = {
  title: "Regulamin",
  subtitle:
    "Zasady korzystania z platformy certyfikacji LN-RADS oraz zakupu kursów i podejść certyfikacyjnych.",
  lastUpdated: "12 sierpnia 2026",
  body: `## 1. Usługodawca

Platformę prowadzi **Praktyka Lekarska Cezary Chudobiński**, ul. Bursztynowa 2, 95-050 Konstantynów Łódzki, Polska, NIP 8291244164, REGON 731020643 („Usługodawca", „my").

Kontakt: [cert@lnrads.com](mailto:cert@lnrads.com). Niniejszy Regulamin wydano na podstawie art. 8 ustawy z dnia 18 lipca 2002 r. o świadczeniu usług drogą elektroniczną.

## 2. Definicje

- **Platforma** — serwis i aplikacja LN-RADS Certification.
- **Użytkownik** — osoba fizyczna korzystająca z Platformy.
- **Konsument** — Użytkownik będący osobą fizyczną dokonującą czynności niezwiązanej bezpośrednio z jej działalnością gospodarczą lub zawodową, a także (w odpowiednim zakresie) przedsiębiorca objęty ochroną konsumencką na podstawie art. 385(5) Kodeksu cywilnego.
- **Kurs** — cyfrowe treści edukacyjne udostępniane na Platformie.
- **Test certyfikacyjny** — egzamin, którego zaliczenie skutkuje wydaniem certyfikatu.
- **Podejście** — jednorazowe rozpoczęcie Testu certyfikacyjnego.

## 3. Zakres usług

- dostęp do Kursów online składających się z lekcji, materiałów i przypadków ćwiczeniowych;
- bezpłatny podgląd treści wyraźnie oznaczonych jako darmowy podgląd, dostępny również bez konta;
- Testy certyfikacyjne i wydanie elektronicznego certyfikatu po ich zaliczeniu;
- zakup dodatkowych Podejść, jeżeli są oferowane dla danego Kursu.

Kursy stanowią treści cyfrowe udostępniane drogą elektroniczną. Nie udzielamy porad medycznych; treści mają charakter edukacyjny i nie zastępują własnej oceny klinicznej Użytkownika.

## 4. Konto i potwierdzenie adresu e-mail

- Rejestracja wymaga podania prawidłowego adresu e-mail, hasła oraz akceptacji Regulaminu i Polityki prywatności.
- Po rejestracji wysyłamy link potwierdzający na podany adres e-mail. Konto jest aktywowane dopiero po użyciu linku; wcześniej logowanie nie jest możliwe.
- Alternatywnie konto można założyć, logując się przez Google lub Apple.
- Użytkownik zobowiązany jest podawać prawdziwe dane, zachować hasło w poufności i nie udostępniać dostępu do konta osobom trzecim.
- Wymagania techniczne: urządzenie z dostępem do internetu, aktualna wersja przeglądarki z włączoną obsługą JavaScript i pamięci lokalnej oraz aktywne konto e-mail.
- Użytkownik może w każdej chwili usunąć konto, kontaktując się z nami. Usunięcie nie dotyczy dokumentów, które musimy przechowywać na podstawie przepisów prawa.

## 5. Zamówienia, ceny i płatności

- Ceny podane na Platformie są cenami całkowitymi w euro (EUR) i zawierają VAT, jeżeli ma zastosowanie.
- Umowa zostaje zawarta z chwilą pomyślnej autoryzacji płatności i potwierdzenia przez nas dostępu do zakupionego Kursu lub Podejścia.
- Płatności obsługuje Stripe. Do finalizacji zakupu należy podać adres rozliczeniowy; nabywcy biznesowi mogą podać numer VAT.
- Dla nabywców posiadających ważny numer VAT z innego państwa członkowskiego UE podatek rozliczany jest w mechanizmie odwrotnego obciążenia.
- Faktura wystawiana jest elektronicznie i wysyłana na adres e-mail podany przy zakupie. Dokonując zakupu, Użytkownik wyraża zgodę na otrzymywanie faktur w formie elektronicznej.
- Dostęp do zakupionych treści przyznawany jest niezwłocznie po płatności i — o ile opis Kursu nie stanowi inaczej — nie jest ograniczony w czasie, dopóki Platforma jest prowadzona.

## 6. Prawo odstąpienia (Konsumenci)

Konsument może odstąpić od umowy zawartej na odległość w terminie 14 dni od jej zawarcia, bez podania przyczyny, przesyłając oświadczenie na adres [cert@lnrads.com](mailto:cert@lnrads.com). Zwrot płatności następuje w ciągu 14 dni, tą samą metodą płatności.

**Utrata prawa odstąpienia.** Zgodnie z art. 38 ust. 1 pkt 13 ustawy o prawach konsumenta prawo odstąpienia nie przysługuje w przypadku umów o dostarczanie treści cyfrowych niedostarczanych na nośniku materialnym, jeżeli spełnianie świadczenia rozpoczęło się za uprzednią wyraźną zgodą Konsumenta i po przyjęciu przez niego do wiadomości, że w ten sposób traci prawo odstąpienia. Przed udzieleniem dostępu prosimy o taką zgodę; rozpoczęcie Kursu lub Testu certyfikacyjnego powoduje wygaśnięcie prawa odstąpienia.

**Wzór oświadczenia o odstąpieniu.** „Niniejszym odstępuję od umowy o dostarczanie treści cyfrowych zawartej w dniu [data]. Imię i nazwisko: [...]. Adres / e-mail: [...]. Numer zamówienia lub faktury: [...]. Data: [...]."

## 7. Zasady certyfikacji

- Każdy Kurs z certyfikacją określa liczbę Podejść wliczonych w cenę oraz maksymalną łączną liczbę Podejść.
- Dodatkowe Podejścia ponad liczbę wliczoną można wykupić w cenie wskazanej dla danego Kursu.
- Podejścia są osobiste i niezbywalne. Podejście uznaje się za wykorzystane z chwilą rozpoczęcia testu.
- Po wykorzystaniu wszystkich dozwolonych Podejść dalsze egzaminowanie nie jest dostępne przez Platformę; Użytkownik powinien skontaktować się z [cert@lnrads.com](mailto:cert@lnrads.com).
- Certyfikat wydawany jest na imię i nazwisko podane przez Użytkownika i potwierdza zaliczenie testu; nie stanowi kwalifikacji zawodowej ani uprawnienia nadanego przez organ publiczny.
- Próba fałszowania wyników, udostępniania treści testu lub korzystania z niedozwolonej pomocy może skutkować unieważnieniem wyniku i zablokowaniem konta.

## 8. Licencja i własność intelektualna

Wszystkie treści Platformy, w tym teksty, obrazy, przypadki i pytania testowe, są chronione prawem autorskim i należą do Usługodawcy lub jego licencjodawców. Wraz z zakupem Użytkownik uzyskuje niewyłączną, nieprzenoszalną licencję na korzystanie z treści wyłącznie we własnych celach edukacyjnych, na czas trwania dostępu.

Zabronione jest w szczególności kopiowanie, utrwalanie, rozpowszechnianie, publikowanie, odsprzedaż lub udostępnianie treści albo danych logowania, a także wykorzystywanie treści do trenowania systemów automatycznych — bez naszej uprzedniej pisemnej zgody.

## 9. Zachowania zabronione

- dostarczanie treści bezprawnych lub danych osób trzecich bez upoważnienia;
- ingerowanie w działanie lub bezpieczeństwo Platformy, w tym automatyczne pobieranie danych i próby obejścia kontroli dostępu;
- korzystanie z Platformy w sposób naruszający prawa innych osób lub obowiązujące przepisy.

W przypadku istotnego naruszenia możemy zawiesić lub zakończyć dostęp po uprzednim powiadomieniu, a w razie konieczności zapobieżenia szkodzie — niezwłocznie.

## 10. Reklamacje i niezgodność treści cyfrowych z umową

- Reklamacje można składać na adres [cert@lnrads.com](mailto:cert@lnrads.com), opisując problem oraz wskazując konto lub zamówienie, którego dotyczą.
- Odpowiadamy w terminie 14 dni od otrzymania zgłoszenia.
- Jeżeli treści cyfrowe są niezgodne z umową, Konsument może żądać doprowadzenia ich do zgodności, a w przypadkach przewidzianych prawem złożyć oświadczenie o obniżeniu ceny lub odstąpieniu od umowy, zgodnie z ustawą o prawach konsumenta wdrażającą dyrektywę (UE) 2019/770.

## 11. Dostępność i odpowiedzialność

Dokładamy starań, aby Platforma była dostępna nieprzerwanie, jednak możemy prowadzić prace konserwacyjne i aktualizacje, informując Użytkowników o planowanych przerwach, gdy jest to możliwe. Nie odpowiadamy za przerwy spowodowane okolicznościami od nas niezależnymi, w tym łączem internetowym Użytkownika lub siłą wyższą.

Nasza odpowiedzialność wobec Użytkowników niebędących Konsumentami ogranicza się do kwoty zapłaconej za dany Kurs lub Podejście i nie obejmuje utraconych korzyści. Postanowienia Regulaminu nie ograniczają odpowiedzialności, której nie można wyłączyć na podstawie obowiązujących przepisów, w szczególności odpowiedzialności za szkodę wyrządzoną umyślnie lub wobec Konsumentów.

## 12. Dane osobowe

Dane osobowe przetwarzane są zgodnie z [Polityką prywatności](/privacy-policy), która stanowi integralną część Regulaminu.

## 13. Zmiany Regulaminu

Możemy zmienić Regulamin z ważnych powodów prawnych, w szczególności w związku ze zmianą przepisów, zakresu usług lub metod płatności. Zarejestrowani Użytkownicy zostaną poinformowani co najmniej 14 dni wcześniej pocztą e-mail lub komunikatem na Platformie i mogą wypowiedzieć umowę przed wejściem zmian w życie. Zmiany nie dotyczą umów już wykonanych.

## 14. Prawo właściwe i spory

Regulamin podlega prawu polskiemu. Nie pozbawia to Konsumenta ochrony wynikającej z bezwzględnie obowiązujących przepisów prawa państwa jego zwykłego pobytu.

Konsumenci mogą korzystać z pozasądowych sposobów rozwiązywania sporów, w tym stałych polubownych sądów konsumenckich i mediacji przy Inspekcji Handlowej, oraz z unijnej platformy internetowego rozstrzygania sporów pod adresem [ec.europa.eu/consumers/odr](https://ec.europa.eu/consumers/odr). Spory z Użytkownikami niebędącymi Konsumentami rozstrzyga sąd właściwy dla naszej siedziby.`,
};

export const LEGAL_DEFAULTS: Record<LegalSlug, { en: LegalDefault; pl: LegalDefault }> = {
  "privacy-policy": { en: privacyEn, pl: privacyPl },
  terms: { en: termsEn, pl: termsPl },
};
