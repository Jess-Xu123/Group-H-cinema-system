const steps = ["Screening", "Seats", "Checkout"];

export default function BookingProgress({ activeStep }) {
  return (
    <nav className="booking-progress" aria-label="Booking progress">
      <ol>
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isComplete = stepNumber < activeStep;
          const isCurrent = stepNumber === activeStep;

          return (
            <li
              key={step}
              className={[
                isComplete ? "is-complete" : "",
                isCurrent ? "is-current" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-current={isCurrent ? "step" : undefined}
            >
              <span className="booking-progress-number" aria-hidden="true">
                {isComplete ? "✓" : stepNumber}
              </span>
              <span>{step}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
