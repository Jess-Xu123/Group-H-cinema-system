import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  updateUserProfile,
  changeUserPassword,
  deleteUserAccount,
} from "../../api/authApi";
import "../../css/user/SettingsPage.css";

function SettingsPage() {
  const { user, setUser } = useAuth();

  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    preferred_cinema: "Oulu",
  });

  const [isCinemaDropdownOpen, setIsCinemaDropdownOpen] = useState(false);
  const cinemaDropdownRef = useRef(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
    });

  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Load current user information
  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || "",
        email: user.email || "",
        preferred_cinema: user.preferred_cinema || "Oulu",
      });
    }
  }, [user]);

  useEffect(() => {
    function handleClickOutside(event) {
        if (
        cinemaDropdownRef.current &&
        !cinemaDropdownRef.current.contains(event.target)
        ) {
        setIsCinemaDropdownOpen(false);
        }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle input changes
  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  }

  // Save profile changes
  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    setIsLoading(true);

    try {
      const result = await updateUserProfile(formData);

      // Update global user information
      setUser(result.user);

      setSuccess("Your profile has been updated successfully.");
    } catch (error) {
      setError(error.message || "Unable to update your profile.");
    } finally {
      setIsLoading(false);
    }
  }

  function handlePasswordChange(e) {
    const { name, value } = e.target;

    setPasswordData((prev) => ({
        ...prev,
        [name]: value,
    }));

    setPasswordError("");
    setPasswordSuccess("");
    }

    async function handlePasswordSubmit(e) {
    e.preventDefault();

    setPasswordError("");
    setPasswordSuccess("");

    if (
        !passwordData.current_password ||
        !passwordData.new_password ||
        !passwordData.confirm_password
    ) {
        setPasswordError("Please fill in all password fields.");
        return;
    }

    setIsPasswordLoading(true);

    try {
        const result = await changeUserPassword(passwordData);

        setPasswordSuccess(result.message || "Password changed successfully.");

        setPasswordData({
        current_password: "",
        new_password: "",
        confirm_password: "",
        });
    } catch (error) {
        setPasswordError(error.message);
    } finally {
        setIsPasswordLoading(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleteError("");
    setIsDeleteLoading(true);

    try {
        await deleteUserAccount({
        current_password: deletePassword,
        });

        setUser(null);
        navigate("/");
    } catch (error) {
        setDeleteError(error.message);
        setShowDeleteConfirm(false);
    } finally {
        setIsDeleteLoading(false);
    }
  }

  return (
    <main className="settings-page">
      {/* Page Header */}
      <header className="settings-header">
        <p className="settings-eyebrow">YOUR ACCOUNT</p>
        <h1>Make yourself at home.</h1>
        <p className="settings-subtitle">
          Manage your personal information and account preferences.
        </p>
      </header>

      {/* Personal Information */}
      <section className="settings-section">
        <div className="settings-section-header">
          <div>
            <p className="settings-eyebrow">PERSONAL DETAILS</p>
            <h2>Personal Information</h2>
            <p className="settings-description">
              Update your personal details and preferred cinema.
            </p>
          </div>
        </div>

        <form
          className="settings-form"
          onSubmit={handleSubmit}
        >
          <div className="settings-form-group">
            <label htmlFor="full_name">Full Name</label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              value={formData.full_name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="settings-form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

        <div className="settings-form-group">
        <label>Preferred Cinema</label>

        <div className="custom-cinema-select">
            <button
            type="button"
            className={`cinema-select-trigger ${
                isCinemaDropdownOpen ? "active" : ""
            }`}
            onClick={() =>
                setIsCinemaDropdownOpen((prev) => !prev)
            }
            aria-expanded={isCinemaDropdownOpen}
            >
            <span>{formData.preferred_cinema}</span>
            <i
                className={`bi ${
                isCinemaDropdownOpen
                    ? "bi-chevron-up"
                    : "bi-chevron-down"
                }`}
            ></i>
            </button>

            {isCinemaDropdownOpen && (
            <div className="cinema-select-options" ref={cinemaDropdownRef}>
                {["Oulu", "Tampere"].map((cinema) => (
                <button
                    key={cinema}
                    type="button"
                    className={`cinema-select-option ${
                    formData.preferred_cinema === cinema
                        ? "selected"
                        : ""
                    }`}
                    onClick={() => {
                    setFormData((prev) => ({
                        ...prev,
                        preferred_cinema: cinema,
                    }));
                    setIsCinemaDropdownOpen(false);
                    setError("");
                    setSuccess("");
                    }}
                >
                    <span>{cinema}</span>

                    {formData.preferred_cinema === cinema && (
                    <i className="bi bi-check2"></i>
                    )}
                </button>
                ))}
            </div>
            )}
        </div>
        </div>

          {error && (
            <p className="settings-error">{error}</p>
          )}

          {success && (
            <p className="settings-success">{success}</p>
          )}

          <div className="settings-form-actions">
            <button
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </section>

    <section className="settings-section">
        <div className="settings-section-header">
            <h2>Security & Password</h2>
            <p className="settings-description">
            Keep your account secure by updating your password.
            </p>
        </div>

        <form className="settings-form" onSubmit={handlePasswordSubmit}>
            <div className="settings-form-group">
            <label htmlFor="current_password">Current Password</label>
            <input
                id="current_password"
                type="password"
                name="current_password"
                value={passwordData.current_password}
                onChange={handlePasswordChange}
                placeholder="Enter your current password"
                autoComplete="current-password"
            />
            </div>

            <div className="settings-form-group">
            <label htmlFor="new_password">New Password</label>
            <input
                id="new_password"
                type="password"
                name="new_password"
                value={passwordData.new_password}
                onChange={handlePasswordChange}
                placeholder="Enter your new password"
                autoComplete="new-password"
            />
            </div>

            <div className="settings-form-group">
            <label htmlFor="confirm_password">Confirm New Password</label>
            <input
                id="confirm_password"
                type="password"
                name="confirm_password"
                value={passwordData.confirm_password}
                onChange={handlePasswordChange}
                placeholder="Confirm your new password"
                autoComplete="new-password"
            />
            </div>

            {passwordError && (
            <p className="settings-error">{passwordError}</p>
            )}

            {passwordSuccess && (
            <p className="settings-success">{passwordSuccess}</p>
            )}

            <div className="settings-form-actions">
            <button type="submit" disabled={isPasswordLoading}>
                {isPasswordLoading ? "Updating..." : "Update Password"}
            </button>
            </div>
        </form>
    </section>

    <section className="settings-section account-management-section">
        <div className="settings-section-header">
            <h2>Account Management</h2>
            <p className="settings-description">
            Permanently delete your RIO Cinema account.
            </p>
        </div>

        <div className="settings-form">
            <div className="settings-form-group">
            <label htmlFor="delete-password">Current Password</label>
            <input
                id="delete-password"
                type="password"
                value={deletePassword}
                onChange={(e) => {
                setDeletePassword(e.target.value);
                setDeleteError("");
                }}
                placeholder="Enter your current password"
                autoComplete="current-password"
            />
            </div>

            {deleteError && (
            <p className="settings-error">{deleteError}</p>
            )}

            <div className="settings-form-actions">
            <button
                type="button"
                className="delete-account-button"
                disabled={!deletePassword || isDeleteLoading}
                onClick={() => setShowDeleteConfirm(true)}
            >
                Delete Account
            </button>
            </div>

            {showDeleteConfirm && (
            <div className="delete-confirmation">
                <h3>Are you absolutely sure?</h3>
                <p>
                This action cannot be undone. Your account will be permanently
                deleted. Your historical bookings will be retained without
                being linked to your account.
                </p>

                <div className="settings-form-actions">
                <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleteLoading}
                >
                    Cancel
                </button>

                <button
                    type="button"
                    className="delete-account-button"
                    onClick={handleDeleteAccount}
                    disabled={isDeleteLoading}
                >
                    {isDeleteLoading ? "Deleting..." : "Yes, Delete My Account"}
                </button>
                </div>
            </div>
            )}
        </div>
        </section>

    </main>
  );
}

export default SettingsPage;
