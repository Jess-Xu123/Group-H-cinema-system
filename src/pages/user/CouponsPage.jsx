import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import "../../css/user/CouponsPage.css";

function CouponsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("available");

  const paidTickets = user?.paid_tickets_count || 0;
  const ticketsProgress = paidTickets % 10;
  const ticketsRemaining = 10 - ticketsProgress;
  const progressPercentage = (ticketsProgress / 10) * 100;

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
          <p className="membership-eyebrow">
            RIO CINEMA MEMBERSHIP
          </p>

          <h2>Movie Lover</h2>

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
              ? "Start collecting tickets to earn your next reward."
              : `${ticketsRemaining} more ${
                  ticketsRemaining === 1 ? "ticket" : "tickets"
                } until your next half-price reward.`}
          </p>
        </div>
      </section>

      {/* Your Coupons */}
      <section className="your-coupons-section">
        <div className="coupons-section-header">
          <div>
            <p className="coupons-eyebrow">SPECIAL OFFERS</p>
            <h2>Your Coupons</h2>
          </div>
        </div>

        <div className="coupons-tabs">
          <button
            className={activeTab === "available" ? "active" : ""}
            onClick={() => setActiveTab("available")}
          >
            Available
          </button>

          <button
            className={activeTab === "redeemed" ? "active" : ""}
            onClick={() => setActiveTab("redeemed")}
          >
            Redeemed
          </button>
        </div>

        <div className="coupons-list">
          {activeTab === "available" ? (
            <div className="coupons-empty-state">
              <h3>No available coupons</h3>
              <p>
                Your available offers will appear here when you receive them.
              </p>
            </div>
          ) : (
            <div className="coupons-empty-state">
              <h3>No redeemed coupons yet</h3>
              <p>
                Coupons you have used will appear here.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Usage Rules */}
      <section className="usage-rules-section">
        <p className="coupons-eyebrow">GOOD TO KNOW</p>
        <h2>Usage Rules</h2>

        <div className="usage-rules-content">
          <p>
            Earn one ticket towards your membership reward for every
            paid movie ticket.
          </p>
          <p>
            After collecting 10 paid tickets, you become eligible for
            a half-price reward.
          </p>
          <p>
            Each coupon is subject to its own validity period and
            redemption conditions.
          </p>
        </div>
      </section>
    </main>
  );
}

export default CouponsPage;
