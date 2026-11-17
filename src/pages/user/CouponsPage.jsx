import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getLoyaltyRewards } from "../../api/bookingApi";
import "../../css/user/CouponsPage.css";

function CouponsPage() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState("available");
  const [rewards, setRewards] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function fetchRewards() {
      setIsLoading(true);
      setError("");

      try {
        const result = await getLoyaltyRewards(controller.signal);
        setRewards(result);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Unable to load your rewards.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    if (user) {
      fetchRewards();
    } else {
      setIsLoading(false);
    }

    return () => controller.abort();
  }, [user]);

  const paidTickets = Number(
    rewards?.paid_tickets_count ?? user?.paid_tickets_count ?? 0
  );

  const ticketsProgress = paidTickets % 10;
  const ticketsRemaining = 10 - ticketsProgress;
  const progressPercentage = (ticketsProgress / 10) * 100;

  const earnedRewards = Number(rewards?.earned_rewards ?? 0);
  const availableRewards = Number(rewards?.available_rewards ?? 0);
  const redeemedRewards = Number(rewards?.redeemed_rewards ?? 0);
  const reservedRewards = Number(rewards?.reserved_rewards ?? 0);
  const loyaltyDiscountPercent = Number(
    rewards?.loyalty_ticket_discount_percent ?? 50
  );

  return (
    <main className="coupons-page">
      {/* Page Header */}
      <header className="coupons-header">
        <div>
          <p className="coupons-eyebrow">YOUR REWARDS</p>
          <h1>A little more magic, every visit.</h1>
          <p className="coupons-subtitle">
            Enjoy more rewards with every cinema visit.
          </p>
        </div>
      </header>

      {/* Membership Rewards */}
      <section className="membership-rewards">
        <div className="membership-card">
          <p className="membership-eyebrow">RIO CINEMA MEMBERSHIP</p>

          <h2>Movie Lover</h2>

          {isLoading ? (
            <p className="membership-message">
              Loading your membership progress...
            </p>
          ) : error ? (
            <p className="membership-message">
              Your membership progress is temporarily unavailable.
            </p>
          ) : (
            <>
              <div className="membership-progress-info">
                <span>Your ticket progress</span>
                <span>{ticketsProgress} / 10</span>
              </div>

              <div className="membership-progress-track">
                <div
                  className="membership-progress-fill"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>

              <p className="membership-message">
                {ticketsProgress === 0
                  ? paidTickets >= 10
                    ? "You've completed another reward cycle. Keep collecting tickets for your next reward."
                    : "Start collecting tickets to earn your first reward."
                  : `${ticketsRemaining} more ${
                      ticketsRemaining === 1 ? "ticket" : "tickets"
                    } until your next ${loyaltyDiscountPercent}%-off reward.`}
              </p>

              <div className="membership-reward-summary">
                <div>
                  <span>Total rewards earned</span>
                  <strong>{earnedRewards}</strong>
                </div>

                <div>
                  <span>Available to use</span>
                  <strong>{availableRewards}</strong>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Your Membership Rewards */}
      <section className="your-coupons-section">
        <div className="coupons-section-header">
          <div>
            <p className="coupons-eyebrow">SPECIAL OFFERS</p>
            <h2>Your Rewards</h2>
          </div>
        </div>

        <div className="coupons-tabs">
          <button
            className={activeTab === "available" ? "active" : ""}
            onClick={() => setActiveTab("available")}
          >
            Available ({availableRewards})
          </button>

          <button
            className={activeTab === "redeemed" ? "active" : ""}
            onClick={() => setActiveTab("redeemed")}
          >
            Redeemed ({redeemedRewards})
          </button>
        </div>

        <div className="coupons-list">
          {isLoading ? (
            <div className="coupons-empty-state">
              <h3>Loading rewards...</h3>
            </div>
          ) : error ? (
            <div className="coupons-empty-state">
              <h3>Unable to load rewards</h3>
              <p>{error}</p>
            </div>
          ) : activeTab === "available" ? (
            availableRewards > 0 ? (
              <div className="loyalty-rewards-list">
                {Array.from({ length: availableRewards }, (_, index) => (
                  <article
                    className="loyalty-reward-card"
                    key={`available-${index}`}
                  >
                    <div className="loyalty-reward-card-content">
                      <p className="coupons-eyebrow">
                        RIO CINEMA MEMBERSHIP REWARD
                      </p>
                      <h3>{loyaltyDiscountPercent}%-Off Movie Ticket</h3>
                      <p>
                        Enjoy {loyaltyDiscountPercent}% off the base ticket price on one seat.
                      </p>
                    </div>

                    <span className="loyalty-reward-status">
                      Available
                    </span>
                  </article>
                ))}
              </div>
            ) : (
              <div className="coupons-empty-state">
                <h3>No available rewards</h3>
                <p>
                  {reservedRewards > 0
                    ? `${reservedRewards} reward${
                        reservedRewards === 1 ? " is" : "s are"
                      } currently being used in an unfinished booking.`
                    : "Keep collecting paid movie tickets to earn your next ${loyaltyDiscountPercent}%-off reward."}
                </p>
              </div>
            )
          ) : redeemedRewards > 0 ? (
            <div className="loyalty-reward-card redeemed">
              <div className="loyalty-reward-card-content">
                <p className="coupons-eyebrow">
                  RIO CINEMA MEMBERSHIP REWARD
                </p>
                <h3>{loyaltyDiscountPercent}%-Off Movie Tickets</h3>
                <p>
                  You have redeemed {redeemedRewards} membership{" "}
                  {redeemedRewards === 1 ? "reward" : "rewards"}.
                </p>
              </div>

              <span className="loyalty-reward-status">
                Redeemed
              </span>
            </div>
          ) : (
            <div className="coupons-empty-state">
              <h3>No redeemed rewards yet</h3>
              <p>
                Rewards you use for paid bookings will appear here.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Usage Rules */}
      <section className="usage-rules-section">
        <p className="coupons-eyebrow">GOOD TO KNOW</p>
        <h2>Membership Reward Rules</h2>

        <div className="usage-rules-content">
          <p>
            Earn one ticket towards your membership reward for every
            paid movie ticket.
          </p>
          <p>
            After every 10 paid tickets, you earn one ticket reward
            with {loyaltyDiscountPercent}% off.
          </p>
          <p>
            Child and wheelchair tickets also count towards your
            membership progress.
          </p>
          <p>
            A membership reward ticket does not count towards
            membership progress.
          </p>
          <p>
            Each reward can be used for one seat and cannot be
            combined with another ticket discount.
          </p>
        </div>
      </section>
    </main>
  );
}

export default CouponsPage;
