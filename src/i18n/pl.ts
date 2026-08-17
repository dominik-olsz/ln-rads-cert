/**
 * Polish dictionary. Keys are the exact English source strings, so any string
 * that is not translated yet simply renders in English — nothing can break.
 */
const pl: Record<string, string> = {
  // ---- Navigation / shell ----
  "Home": "Strona główna",
  "Courses": "Kursy",
  "FAQ": "FAQ",
  "Dashboard": "Panel",
  "My Dashboard": "Mój panel",
  "Admin": "Admin",
  "Account": "Konto",
  "My payments": "Moje płatności",
  "Payments": "Płatności",
  "Sign In": "Zaloguj się",
  "Sign in": "Zaloguj się",
  "Sign Up": "Zarejestruj się",
  "Sign up": "Zarejestruj się",
  "Sign Out": "Wyloguj się",
  "Sign out": "Wyloguj się",
  "Menu": "Menu",
  "Loading...": "Ładowanie...",
  "Back": "Wstecz",
  "Back to Courses": "Powrót do kursów",
  "Save": "Zapisz",
  "Cancel": "Anuluj",
  "Close": "Zamknij",
  "Continue": "Kontynuuj",
  "Next": "Dalej",
  "Previous": "Wstecz",
  "Submit": "Wyślij",
  "Download": "Pobierz",
  "Privacy Policy": "Polityka prywatności",
  "Terms and Conditions": "Regulamin",
  "Terms & Conditions": "Regulamin",
  "Contact": "Kontakt",
  "All rights reserved.": "Wszelkie prawa zastrzeżone.",
  "Legal": "Informacje prawne",
  "Platform": "Platforma",
  "Frequently Asked Questions": "Najczęściej zadawane pytania",
  "LN-RADS Certification FAQ": "LN-RADS — pytania i odpowiedzi",
  "Find answers to common questions about the LN-RADS certification program":
    "Odpowiedzi na najczęstsze pytania o program certyfikacji LN-RADS",
  "Loading questions…": "Ładowanie pytań…",
  "Still have questions?": "Masz jeszcze pytania?",
  "Contact Support": "Skontaktuj się z nami",
  "About us": "O nas",
  "Publications": "Publikacje",
  "Account Settings": "Ustawienia konta",
  "My Payments": "Moje płatności",
  "Get Started": "Rozpocznij",

  // ---- Cookie bar ----
  "We use only strictly necessary cookies to keep you signed in and to make this site work. No tracking, no advertising.":
    "Używamy wyłącznie niezbędnych plików cookie, aby utrzymać Twoje zalogowanie i zapewnić działanie serwisu. Bez śledzenia i bez reklam.",
  "Got it": "Rozumiem",
  "Learn more": "Dowiedz się więcej",

  // ---- Courses / course detail ----
  "Our Courses": "Nasze kursy",
  "All Courses": "Wszystkie kursy",
  "View Course": "Zobacz kurs",
  "Buy Course": "Kup kurs",
  "Buy course": "Kup kurs",
  "Enroll": "Zapisz się",
  "Start Course": "Rozpocznij kurs",
  "Continue Course": "Kontynuuj kurs",
  "Continue Learning": "Kontynuuj naukę",
  "Course Content": "Zawartość kursu",
  "Lessons": "Lekcje",
  "Lesson": "Lekcja",
  "Use Cases": "Przypadki",
  "Use Case": "Przypadek",
  "What you'll learn": "Czego się nauczysz",
  "This course includes": "Ten kurs zawiera",
  "Preview free content": "Zobacz darmową treść",
  "Free preview": "Darmowy podgląd",
  "Free": "Bezpłatnie",
  "Certification Test": "Test certyfikacyjny",
  "Take Certification Test": "Rozpocznij test certyfikacyjny",
  "Retake Certification Test": "Powtórz test certyfikacyjny",
  "Download Certificate": "Pobierz certyfikat",
  "Review Course Material": "Powtórz materiał kursu",
  "Course materials": "Materiały kursu",
  "Materials": "Materiały",
  "Progress": "Postęp",
  "Completed": "Ukończono",
  "You already own this course": "Masz już ten kurs",
  "Prices are shown in EUR. Polish customers can pay in PLN at checkout.":
    "Ceny podano w EUR. Klienci z Polski mogą zapłacić w PLN podczas płatności.",

  // ---- Tests / results ----
  "Question": "Pytanie",
  "Questions": "Pytania",
  "Accept Answer": "Zatwierdź odpowiedź",
  "Next Question": "Następne pytanie",
  "Submit Test": "Zakończ test",
  "Your Score": "Twój wynik",
  "Score": "Wynik",
  "Passed": "Zaliczony",
  "Failed": "Niezaliczony",
  "Correct": "Poprawnie",
  "Incorrect": "Niepoprawnie",
  "Explanation": "Wyjaśnienie",
  "Results": "Wyniki",
  "Retake Test": "Powtórz test",
  "Attempts remaining": "Pozostałe próby",
  "Time left": "Pozostały czas",

  // ---- Auth ----
  "Email": "E-mail",
  "Password": "Hasło",
  "Full name": "Imię i nazwisko",
  "Forgot password?": "Nie pamiętasz hasła?",
  "Reset password": "Zresetuj hasło",
  "Continue with Google": "Kontynuuj z Google",
  "Continue with Apple": "Kontynuuj z Apple",
  "Create account": "Utwórz konto",
  "Already have an account?": "Masz już konto?",
  "Don't have an account?": "Nie masz konta?",

  // ---- Payments ----
  "Invoice": "Faktura",
  "Invoices": "Faktury",
  "Invoice number": "Numer faktury",
  "Date": "Data",
  "Amount": "Kwota",
  "Status": "Status",
  "Download PDF": "Pobierz PDF",
  "Correction": "Korekta",
  "Refunded": "Zwrócono",
  "Paid": "Opłacono",
  "No payments yet": "Brak płatności",
  "Payment successful": "Płatność zakończona sukcesem",
  "Thank you for your purchase!": "Dziękujemy za zakup!",
  // ---- Home page (hero) ----
  "Eduradiology": "Eduradiologia",
  "Official LN-RADS Certification": "Oficjalna certyfikacja LN-RADS",
  "Lymph Nodes Reporting and Data System": "System oceny i raportowania węzłów chłonnych",
  "Transform the way you diagnose lymph nodes with our innovative multiparametric approach. Detect macrometastases as small as 2-3mm and improve diagnostic accuracy by over 20% compared to traditional methods.":
    "Zmień sposób, w jaki diagnozujesz węzły chłonne, dzięki naszemu innowacyjnemu podejściu wieloparametrycznemu. Wykrywaj makroprzerzuty już od 2–3 mm i zwiększ dokładność diagnostyczną o ponad 20% w porównaniu z metodami tradycyjnymi.",
  "Start Certification Course": "Rozpocznij kurs certyfikacyjny",
  "Practical": "Praktyczny",
  "All Modalities": "Wszystkie modalności",
  "LN-RADS Certification": "Certyfikacja LN-RADS",
  "LN-RADS Certification — Lymph Node Imaging Course": "Certyfikacja LN-RADS — kurs obrazowania węzłów chłonnych",
  "Learn the LN-RADS system with practical lessons, annotated US, CT, MR and PET cases and earn an official certification in lymph node assessment.":
    "Poznaj system LN-RADS dzięki praktycznym lekcjom oraz opisanym przypadkom USG, TK, MR i PET i zdobądź oficjalny certyfikat w ocenie węzłów chłonnych.",

  // ---- Home page (course overview) ----
  "Course Overview": "Przegląd kursu",
  "Complete LN-RADS certification program with comprehensive training materials":
    "Kompletny program certyfikacji LN-RADS z obszernymi materiałami szkoleniowymi",
  "What You'll Learn": "Czego się nauczysz",
  "Master the LN-RADS classification system for lymph node assessment":
    "Opanuj system klasyfikacji LN-RADS w ocenie węzłów chłonnych",
  "LN-RADS 1: Normal Lymph Nodes": "LN-RADS 1: prawidłowe węzły chłonne",
  "No enlargement, oval shape, regular cortex ≤3mm":
    "Bez powiększenia, owalny kształt, regularna kora ≤3 mm",
  "LN-RADS 2: Steatotic LN": "LN-RADS 2: węzeł stłuszczony",
  "Enlarged with hyperechoic hilum, no architectural changes":
    "Powiększony, z hiperechogenną wnęką, bez zmian architektury",
  "LN-RADS 3: Reactive LN": "LN-RADS 3: węzeł odczynowy",
  "Thickened cortex >3mm, preserved oval shape and medulla":
    "Pogrubiała kora >3 mm, zachowany owalny kształt i rdzeń",
  "LN-RADS 4: Suspicious LN": "LN-RADS 4: węzeł podejrzany",
  "4a (low) and 4b (high) suspicion categories":
    "Kategorie 4a (niskie) i 4b (wysokie) podejrzenie",
  "LN-RADS 5: Malignant LN": "LN-RADS 5: węzeł złośliwy",
  "Evident features of malignancy with FCT, necrosis":
    "Wyraźne cechy złośliwości z FCT i martwicą",
  "LN-RADS Classification Flowchart": "Schemat klasyfikacji LN-RADS",
  "Practical Lessons": "Praktyczne lekcje",
  "Expert tutorials explaining each LN-RADS category with real clinical examples":
    "Eksperckie omówienia każdej kategorii LN-RADS na prawdziwych przykładach klinicznych",
  "Radiological Images": "Obrazy radiologiczne",
  "Detailed US, CT, MR, and PET images with annotations and diagnostic explanations":
    "Szczegółowe obrazy USG, TK, MR i PET z opisami i wyjaśnieniami diagnostycznymi",
  "Complete a certification exam to earn your official LN-RADS certificate":
    "Zdaj egzamin certyfikacyjny i zdobądź oficjalny certyfikat LN-RADS",

  // ---- Home page (why LN-RADS) ----
  "Why LN-RADS?": "Dlaczego LN-RADS?",
  "Revolutionary approach to lymph node diagnosis with proven clinical benefits":
    "Przełomowe podejście do diagnostyki węzłów chłonnych o udowodnionych korzyściach klinicznych",
  "Superior Detection Rate": "Wyższa wykrywalność",
  "Find over 20% more metastatic lymph nodes compared to traditional 10mm SAD size criteria. Detect macrometastases as small as 2-3mm using multiparametric morphological criteria.":
    "Wykryj o ponad 20% więcej przerzutowych węzłów chłonnych niż przy tradycyjnym kryterium wielkości 10 mm SAD. Rozpoznawaj makroprzerzuty już od 2–3 mm dzięki wieloparametrycznym kryteriom morfologicznym.",
  "Quick Evaluations": "Szybka ocena",
  "Heuristic assessment model ensures rapid evaluation without compromising accuracy. Streamline your workflow while maintaining diagnostic excellence.":
    "Heurystyczny model oceny pozwala działać szybko bez utraty dokładności. Usprawnij swoją pracę, zachowując najwyższą jakość diagnostyki.",
  "Better Communication": "Lepsza komunikacja",
  "Simple, standardized system improves communication between radiologists and clinicians. Clear categorization facilitates better patient management decisions.":
    "Prosty, ustandaryzowany system poprawia komunikację między radiologami a klinicystami. Jasna kategoryzacja wspiera lepsze decyzje o postępowaniu z pacjentem.",
  "Universal Application": "Uniwersalne zastosowanie",
  "Apply LN-RADS across all imaging modalities: Ultrasound, CT, MR, and PET. One system for all your lymph node assessment needs.":
    "Stosuj LN-RADS we wszystkich modalnościach: USG, TK, MR i PET. Jeden system do każdej oceny węzłów chłonnych.",
  "Get Certified Today": "Zdobądź certyfikat już dziś",
  "Join radiologists and oncologists worldwide who are mastering the LN-RADS system":
    "Dołącz do radiologów i onkologów z całego świata, którzy opanowują system LN-RADS",
  "Self-paced learning": "Nauka we własnym tempie",
  "Practical test": "Praktyczny test",
  "Official certificate": "Oficjalny certyfikat",
  "Enroll Now": "Zapisz się teraz",

  // ---- Footer ----
  "The official certification program for the Lymph Nodes Reporting and Data System. Advancing diagnostic accuracy in lymph node assessment.":
    "Oficjalny program certyfikacji systemu LN-RADS. Podnosimy dokładność diagnostyki węzłów chłonnych.",
  "Quick Links": "Szybkie linki",
  "Resources": "Materiały",
  "Last updated": "Ostatnia aktualizacja",

  // ---- 404 ----
  "Page not found": "Nie znaleziono strony",
  "The page you are looking for does not exist or has been moved.":
    "Strona, której szukasz, nie istnieje lub została przeniesiona.",
  "Back to Home": "Wróć na stronę główną",
  "Browse Courses": "Przeglądaj kursy",
};

export default pl;
