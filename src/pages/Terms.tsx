import LegalPage, { LegalSection } from "@/components/LegalPage";

const Terms = () => {
  return (
    <LegalPage
      title="Terms and Conditions"
      subtitle="Rules for using the LN-RADS Certification platform and for purchasing courses and certification attempts (Regulamin)."
      lastUpdated="12 August 2026"
    >
      <LegalSection id="provider" title="1. Service provider">
        <p>
          The Platform is operated by <strong>Praktyka Lekarska Cezary Chudobiński</strong>,
          ul. Bursztynowa 2, 95-050 Konstantynów Łódzki, Poland, NIP (VAT) 8291244164,
          REGON 731020643 (the "Provider", "we", "us").
        </p>
        <p>
          Contact: <a href="mailto:cert@lnrads.com">cert@lnrads.com</a>. These Terms are issued
          pursuant to Art. 8 of the Polish Act of 18 July 2002 on the provision of electronic services.
        </p>
      </LegalSection>

      <LegalSection id="definitions" title="2. Definitions">
        <ul>
          <li><strong>Platform</strong> — the LN-RADS Certification website and application.</li>
          <li><strong>User</strong> — a natural person using the Platform.</li>
          <li><strong>Consumer</strong> — a User who is a natural person acting for purposes outside their business or professional activity, and (where applicable) an entrepreneur benefiting from consumer protection under Art. 385(5) of the Polish Civil Code.</li>
          <li><strong>Course</strong> — digital educational content made available on the Platform.</li>
          <li><strong>Certification Test</strong> — the examination which, if passed, results in a certificate.</li>
          <li><strong>Attempt</strong> — a single start of a Certification Test.</li>
        </ul>
      </LegalSection>

      <LegalSection id="services" title="3. Scope of services">
        <ul>
          <li>access to online Courses consisting of lessons, materials and practice use cases;</li>
          <li>free preview of content expressly marked as free preview, available also without an account;</li>
          <li>Certification Tests and issuance of an electronic certificate upon passing;</li>
          <li>purchase of additional Attempts, where offered for a given Course.</li>
        </ul>
        <p>
          Courses are digital content and are made available electronically. We do not provide medical
          advice; the content is educational and does not replace the User's own clinical judgement.
        </p>
      </LegalSection>

      <LegalSection id="account" title="4. Account and e-mail confirmation">
        <ul>
          <li>Registration requires a valid e-mail address, a password and acceptance of these Terms and the Privacy Policy.</li>
          <li>After registration we send a confirmation link to the e-mail address provided. The account is activated only after the link is used; until then signing in is not possible.</li>
          <li>Alternatively you may create an account using Google or Apple sign-in.</li>
          <li>The User must provide true data, keep the password confidential and not share account access with third parties.</li>
          <li>Technical requirements: a device with internet access, a current version of a web browser with JavaScript and local storage enabled, and an active e-mail account.</li>
          <li>The User may delete the account at any time by contacting us. Deletion does not affect documents we are required by law to retain.</li>
        </ul>
      </LegalSection>

      <LegalSection id="orders" title="5. Orders, prices and payment">
        <ul>
          <li>Prices shown on the Platform are total prices in euro (EUR) and include VAT where applicable.</li>
          <li>A contract is concluded when the payment is successfully authorised and we confirm access to the purchased Course or Attempt.</li>
          <li>Payments are handled by Stripe. To complete a purchase you must provide a billing address; business buyers may provide a VAT identification number.</li>
          <li>For buyers with a valid VAT identification number from another EU Member State, VAT is accounted for under the reverse charge mechanism.</li>
          <li>An invoice is issued electronically and sent to the e-mail address given at checkout. By purchasing, the User consents to receiving invoices in electronic form.</li>
          <li>Access to purchased content is granted immediately after payment and, unless stated otherwise in the Course description, is not limited in time as long as the Platform is operated.</li>
        </ul>
      </LegalSection>

      <LegalSection id="withdrawal" title="6. Right of withdrawal (Consumers)">
        <p>
          A Consumer may withdraw from a distance contract within 14 days of its conclusion without
          giving a reason, by sending a statement to{" "}
          <a href="mailto:cert@lnrads.com">cert@lnrads.com</a>. We refund the payment within 14 days
          using the same payment method.
        </p>
        <p>
          <strong>Loss of the right of withdrawal.</strong> In accordance with Art. 38(1)(13) of the
          Polish Act on Consumer Rights, the right of withdrawal does not apply to contracts for the
          supply of digital content which is not supplied on a tangible medium if performance began with
          the Consumer's prior express consent and their acknowledgement that they thereby lose the
          right of withdrawal. Before granting access we ask for this consent; if you start the Course
          or a Certification Test, the right of withdrawal expires.
        </p>
        <p>
          <strong>Model withdrawal form.</strong> "I hereby withdraw from the contract for the supply of
          digital content concluded on [date]. Name and surname: [...]. Address / e-mail: [...]. Order
          or invoice number: [...]. Date: [...]."
        </p>
      </LegalSection>

      <LegalSection id="certification" title="7. Certification rules">
        <ul>
          <li>Each Course with certification specifies the number of Attempts included in the price and the maximum total number of Attempts.</li>
          <li>Additional Attempts beyond those included may be purchased at the price shown for the given Course.</li>
          <li>Attempts are personal and non-transferable. An Attempt is deemed used once the test has been started.</li>
          <li>Once all permitted Attempts have been used, further examination is not available through the Platform; the User should contact <a href="mailto:cert@lnrads.com">cert@lnrads.com</a>.</li>
          <li>A certificate is issued in the name provided by the User and confirms passing the test; it does not constitute a professional qualification or licence granted by a public authority.</li>
          <li>Any attempt to falsify results, share test content or use unauthorised assistance may result in annulment of the result and blocking of the account.</li>
        </ul>
      </LegalSection>

      <LegalSection id="licence" title="8. Licence and intellectual property">
        <p>
          All content of the Platform, including texts, images, cases and test questions, is protected by
          copyright and belongs to the Provider or its licensors. Upon purchase the User obtains a
          non-exclusive, non-transferable licence to use the content for their own educational purposes
          only, for the duration of access.
        </p>
        <p>
          It is prohibited in particular to copy, record, distribute, publish, resell or share the
          content or account credentials, and to use the content for training automated systems, without
          our prior written consent.
        </p>
      </LegalSection>

      <LegalSection id="conduct" title="9. Prohibited conduct">
        <ul>
          <li>providing unlawful content or data of third parties without authorisation;</li>
          <li>interfering with the operation or security of the Platform, including automated scraping and attempts to bypass access controls;</li>
          <li>using the Platform in a manner infringing the rights of others or applicable law.</li>
        </ul>
        <p>
          In the event of a material breach we may suspend or terminate access after prior notice, or
          immediately where required to prevent damage.
        </p>
      </LegalSection>

      <LegalSection id="complaints" title="10. Complaints and non-conformity of digital content">
        <ul>
          <li>Complaints may be submitted to <a href="mailto:cert@lnrads.com">cert@lnrads.com</a> and should describe the problem and the account or order concerned.</li>
          <li>We respond within 14 days of receipt.</li>
          <li>If digital content is not in conformity with the contract, the Consumer may demand that it be brought into conformity and, in the cases provided by law, submit a statement on a price reduction or withdrawal from the contract, in accordance with the Polish Act on Consumer Rights implementing Directive (EU) 2019/770.</li>
        </ul>
      </LegalSection>

      <LegalSection id="availability" title="11. Availability and liability">
        <p>
          We take care to keep the Platform available continuously, but we may carry out maintenance and
          updates, informing Users of planned interruptions where practicable. We are not liable for
          interruptions caused by circumstances beyond our control, including the User's internet
          connection or force majeure.
        </p>
        <p>
          Our liability towards Users who are not Consumers is limited to the amount paid for the
          relevant Course or Attempt and excludes lost profits. Nothing in these Terms limits liability
          that cannot be excluded under applicable law, in particular liability for damage caused
          intentionally or towards Consumers.
        </p>
      </LegalSection>

      <LegalSection id="privacy" title="12. Personal data">
        <p>
          Personal data is processed in accordance with the <a href="/privacy-policy">Privacy Policy</a>,
          which forms an integral part of these Terms.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="13. Changes to the Terms">
        <p>
          We may amend these Terms for legally valid reasons, in particular changes in law, in the scope
          of services or in payment methods. Registered Users will be informed at least 14 days in
          advance by e-mail or a notice in the Platform, and may terminate the contract before the
          change takes effect. Amendments do not affect contracts already performed.
        </p>
      </LegalSection>

      <LegalSection id="disputes" title="14. Governing law and disputes">
        <p>
          These Terms are governed by Polish law. This does not deprive a Consumer of the protection of
          the mandatory provisions of the law of their country of habitual residence.
        </p>
        <p>
          Consumers may use out-of-court dispute resolution, including the permanent consumer
          arbitration courts and mediation at the Trade Inspection (Inspekcja Handlowa), and the EU
          online dispute resolution platform at{" "}
          <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">
            ec.europa.eu/consumers/odr
          </a>
          . Disputes with Users who are not Consumers are subject to the courts competent for our
          registered seat.
        </p>
      </LegalSection>
    </LegalPage>
  );
};

export default Terms;
