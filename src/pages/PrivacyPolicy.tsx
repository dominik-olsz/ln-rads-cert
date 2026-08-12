import LegalPage, { LegalSection } from "@/components/LegalPage";
import Seo from "@/components/Seo";

const PrivacyPolicy = () => {
  return (
    <>
    <Seo title="Privacy Policy — LN-RADS Certification" description="How LN-RADS Certification collects, uses, stores and protects your personal data under the GDPR, including your rights and contact details." path="/privacy-policy" />
    <LegalPage
      title="Privacy Policy"
      subtitle="How we collect, use and protect your personal data in the LN-RADS Certification platform."
      lastUpdated="12 August 2026"
    >
      <LegalSection id="controller" title="1. Data Controller">
        <p>
          The controller of your personal data is <strong>Praktyka Lekarska Cezary Chudobiński</strong>,
          ul. Bursztynowa 2, 95-050 Konstantynów Łódzki, Poland, NIP (VAT) 8291244164, REGON 731020643
          (the "Controller", "we", "us").
        </p>
        <p>
          In all matters relating to personal data you may contact us at{" "}
          <a href="mailto:cert@lnrads.com">cert@lnrads.com</a>.
        </p>
        <p>
          This Policy describes how we process personal data in connection with the LN-RADS
          Certification platform (the "Platform") and is issued in accordance with Regulation (EU)
          2016/679 (GDPR) and Polish data protection law.
        </p>
      </LegalSection>

      <LegalSection id="data" title="2. What data we collect">
        <ul>
          <li>
            <strong>Account data:</strong> full name, e-mail address, password (stored only as a
            cryptographic hash), and — where you sign in with Google or Apple — the basic profile
            information shared by that provider.
          </li>
          <li>
            <strong>Consent records:</strong> the date and version of the Privacy Policy and Terms and
            Conditions you accepted.
          </li>
          <li>
            <strong>Learning data:</strong> course progress, completed lessons, bookmarks, test
            answers, scores, number and results of certification attempts, issued certificates and the
            name printed on a certificate.
          </li>
          <li>
            <strong>Purchase and invoicing data:</strong> purchased courses and extra certification
            attempts, amounts paid, currency, payment identifiers, billing name and company, billing
            address, country and VAT identification number, refunds and issued invoices or corrective
            invoices.
          </li>
          <li>
            <strong>Technical data:</strong> data necessary to maintain your session and secure the
            Platform, including data stored in your browser's local storage, and server logs.
          </li>
        </ul>
        <p>
          Card and other payment credentials are entered directly on the payment provider's page and are
          never collected or stored by us.
        </p>
      </LegalSection>

      <LegalSection id="purposes" title="3. Purposes and legal bases">
        <ul>
          <li>
            <strong>Providing the Platform</strong> — creating and maintaining your account, giving
            access to courses, running tests, issuing certificates: performance of a contract,
            Art. 6(1)(b) GDPR.
          </li>
          <li>
            <strong>Processing payments and issuing invoices</strong>: performance of a contract,
            Art. 6(1)(b) GDPR, and compliance with tax and accounting obligations, Art. 6(1)(c) GDPR.
          </li>
          <li>
            <strong>Confirming your e-mail address and securing accounts</strong>: performance of a
            contract and our legitimate interest in protecting the Platform, Art. 6(1)(b) and (f) GDPR.
          </li>
          <li>
            <strong>Recording your acceptance of the Terms and this Policy</strong>: compliance with our
            accountability obligations, Art. 6(1)(c) and Art. 5(2) GDPR.
          </li>
          <li>
            <strong>Handling complaints, refunds and defending claims</strong>: our legitimate interest,
            Art. 6(1)(f) GDPR.
          </li>
          <li>
            <strong>Optional communication you request</strong> (for example messages you agree to
            receive): your consent, Art. 6(1)(a) GDPR, which you may withdraw at any time.
          </li>
        </ul>
        <p>
          Providing account and billing data is voluntary but necessary to use the paid features of the
          Platform; without it we cannot conclude or perform the contract.
        </p>
      </LegalSection>

      <LegalSection id="recipients" title="4. Recipients and processors">
        <p>We disclose personal data only to the extent necessary, to:</p>
        <ul>
          <li>our hosting, database, authentication and e-mail delivery providers, which operate the technical infrastructure of the Platform on our behalf;</li>
          <li>Stripe, which processes card payments and refunds as an independent payment service provider;</li>
          <li>Google and Apple, if you choose to sign in using their identity services;</li>
          <li>our accounting office, and legal or tax advisers where required;</li>
          <li>public authorities, where we are obliged by law to do so.</li>
        </ul>
        <p>
          All processors act under written data processing agreements and may process your data only on
          our instructions.
        </p>
      </LegalSection>

      <LegalSection id="transfers" title="5. Transfers outside the EEA">
        <p>
          Some of our providers may process data outside the European Economic Area. In such cases the
          transfer is based on an adequacy decision of the European Commission or on the Standard
          Contractual Clauses adopted by the European Commission, together with supplementary technical
          safeguards. You may request information about the safeguards applied by contacting us.
        </p>
      </LegalSection>

      <LegalSection id="retention" title="6. Retention periods">
        <ul>
          <li><strong>Account and learning data:</strong> for as long as your account exists, and afterwards for the period needed to establish, exercise or defend legal claims.</li>
          <li><strong>Invoices and accounting records:</strong> 5 years counted from the end of the calendar year in which the tax payment deadline fell, as required by Polish tax law.</li>
          <li><strong>Issued certificates and their verification records:</strong> for the validity period of the certification and afterwards for archival purposes, so that a certificate can be verified.</li>
          <li><strong>Consent records:</strong> for the duration of the consent and the applicable limitation period.</li>
        </ul>
      </LegalSection>

      <LegalSection id="rights" title="7. Your rights">
        <p>You have the right to:</p>
        <ul>
          <li>access your data and obtain a copy of it;</li>
          <li>rectify inaccurate or incomplete data;</li>
          <li>erase your data ("right to be forgotten"), unless we must keep it by law;</li>
          <li>restrict processing;</li>
          <li>data portability;</li>
          <li>object to processing based on our legitimate interest;</li>
          <li>withdraw consent at any time, without affecting the lawfulness of processing carried out before withdrawal.</li>
        </ul>
        <p>
          To exercise these rights, write to <a href="mailto:cert@lnrads.com">cert@lnrads.com</a>. You
          also have the right to lodge a complaint with the President of the Personal Data Protection
          Office (Prezes Urzędu Ochrony Danych Osobowych), ul. Stawki 2, 00-193 Warsaw, Poland.
        </p>
      </LegalSection>

      <LegalSection id="cookies" title="8. Cookies and local storage">
        <p>
          The Platform uses only storage that is strictly necessary to provide the service: a session
          token kept in your browser's local storage so that you remain signed in, and technical
          identifiers required for security and for the payment process. These are not used for
          advertising or cross-site tracking, and therefore do not require your consent under Art. 173
          of the Polish Telecommunications Act.
        </p>
        <p>
          You can clear this data at any time in your browser settings; signing in again will be
          required afterwards.
        </p>
      </LegalSection>

      <LegalSection id="automated" title="9. Automated decision-making">
        <p>
          Test results are scored automatically against a predefined answer key and a fixed passing
          threshold. This scoring does not constitute automated decision-making producing legal effects
          within the meaning of Art. 22 GDPR, and every result may be reviewed by us on request. We do
          not carry out profiling for marketing purposes.
        </p>
      </LegalSection>

      <LegalSection id="security" title="10. Security">
        <p>
          We apply technical and organisational measures appropriate to the risk, including encrypted
          transmission (TLS), hashed passwords, access control at row level in our database, restricted
          administrative access and regular backups.
        </p>
      </LegalSection>

      <LegalSection id="children" title="11. Children">
        <p>
          The Platform is intended for medical professionals and is not directed at persons under 16
          years of age. We do not knowingly collect data of such persons.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="12. Changes to this Policy">
        <p>
          We may update this Policy, for example when we change the scope of our services or our
          providers. The current version is always published on this page with its date of update. In
          the case of material changes we will inform registered users by e-mail or by a notice in the
          Platform before the change takes effect.
        </p>
      </LegalSection>
    </LegalPage>
  );
};

export default PrivacyPolicy