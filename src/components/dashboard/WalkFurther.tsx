// Panel D — Walk further: three equal-weight invitations.
// No single loud CTA; balanced by design.

const WHATSAPP_COMMUNITY_LINK = process.env.NEXT_PUBLIC_WHATSAPP_COMMUNITY_URL ?? "https://wa.me/message/PLACEHOLDER";
const SEVASTACK_DONATE_URL = process.env.NEXT_PUBLIC_SEVASTACK_DONATE_URL ?? "https://www.myhumrahi.org/donate.html";

export function WalkFurther() {
  return (
    <section aria-label="Walk further — next steps">
      <p className="eyebrow mb-4">
        Walk further
        <span className="red-rule" aria-hidden="true" />
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Give again */}
        <a
          href={SEVASTACK_DONATE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="card group hover:shadow-card-hover transition-shadow block"
          aria-label="Give again — donate to Humrahi Foundation"
        >
          <p className="text-2xl mb-3" aria-hidden="true">🫙</p>
          <h3 className="font-lora text-base text-ink mb-1 group-hover:text-red transition-colors">
            Give again
          </h3>
          <p className="text-xs text-soft leading-relaxed">
            From ₹500 · or walk with us monthly.
          </p>
        </a>

        {/* Volunteer */}
        <a
          href="https://www.myhumrahi.org/index.html#volunteer"
          target="_blank"
          rel="noopener noreferrer"
          className="card group hover:shadow-card-hover transition-shadow block"
          aria-label="Volunteer with Humrahi Foundation"
        >
          <p className="text-2xl mb-3" aria-hidden="true">🤝</p>
          <h3 className="font-lora text-base text-ink mb-1 group-hover:text-red transition-colors">
            Lend your hands
          </h3>
          <p className="text-xs text-soft leading-relaxed">
            Volunteer with us in Siliguri. Every skill finds a place.
          </p>
        </a>

        {/* WhatsApp community */}
        <a
          href={WHATSAPP_COMMUNITY_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="card group hover:shadow-card-hover transition-shadow block"
          aria-label="Join the Humrahi WhatsApp community"
        >
          <p className="text-2xl mb-3" aria-hidden="true">💬</p>
          <h3 className="font-lora text-base text-ink mb-1 group-hover:text-red transition-colors">
            Join the circle
          </h3>
          <p className="text-xs text-soft leading-relaxed">
            The WhatsApp community — where Humrahis hear first.
          </p>
        </a>
      </div>
    </section>
  );
}
