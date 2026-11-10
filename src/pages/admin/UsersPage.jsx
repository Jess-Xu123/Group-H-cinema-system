import { useCallback, useEffect, useState } from "react";
import {
  getUserStatistics,
  getUsers,
  getUserById,
  updateUserRole,
} from "../../api/userApi";
import "../../css/admin/AdminUsers.css";

function formatDate(date) {
  if (!date) return "—";

  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-GB");
}

function RoleBadge({ role }) {
  return (
    <span className={`users-role-badge users-role-${role}`}>
      {role?.charAt(0).toUpperCase() + role?.slice(1)}
    </span>
  );
}

function UsersPage() {
  const [statistics, setStatistics] = useState(null);
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 10,
    totalUsers: 0,
    totalPages: 0,
  });

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [cinemaFilter, setCinemaFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedUser, setSelectedUser] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const [editingUserId, setEditingUserId] = useState(null);
  const [newRole, setNewRole] = useState("");
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const fetchStatistics = useCallback(async () => {
    try {
      const result = await getUserStatistics();
      setStatistics(result.statistics);
    } catch (error) {
      console.error("Failed to load user statistics:", error);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const result = await getUsers({
        search,
        role: roleFilter,
        cinema: cinemaFilter,
        page: currentPage,
        limit: 10,
      });

      setUsers(result.users || []);
      setPagination(
        result.pagination || {
          currentPage: 1,
          pageSize: 10,
          totalUsers: 0,
          totalPages: 0,
        }
      );
    } catch (error) {
      setError(error.message || "Failed to load users.");
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [search, roleFilter, cinemaFilter, currentPage]);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  function handleSearchChange(event) {
    setSearch(event.target.value);
    setCurrentPage(1);
  }

  function handleRoleFilterChange(event) {
    setRoleFilter(event.target.value);
    setCurrentPage(1);
  }

  function handleCinemaFilterChange(event) {
    setCinemaFilter(event.target.value);
    setCurrentPage(1);
  }

  async function handleViewDetails(userId) {
    setSelectedUser(null);
    setDetailError("");
    setIsDetailLoading(true);

    try {
      const result = await getUserById(userId);
      setSelectedUser(result.user);
    } catch (error) {
      setDetailError(error.message || "Failed to load user details.");
    } finally {
      setIsDetailLoading(false);
    }
  }

  function closeDetails() {
    setSelectedUser(null);
    setDetailError("");
    setEditingUserId(null);
    setActionError("");
    setActionSuccess("");
  }

  function startEditingRole(user) {
    setEditingUserId(user.id);
    setNewRole(user.role);
    setActionError("");
    setActionSuccess("");
  }

  async function handleUpdateRole(userId) {
    if (!newRole) return;

    setIsUpdatingRole(true);
    setActionError("");
    setActionSuccess("");

    try {
      const result = await updateUserRole(userId, newRole);

      setUsers((previousUsers) =>
        previousUsers.map((user) =>
          user.id === userId ? result.user : user
        )
      );

      if (selectedUser?.id === userId) {
        setSelectedUser(result.user);
      }

      setEditingUserId(null);
      setActionSuccess("User role updated successfully.");

      await fetchStatistics();
    } catch (error) {
      setActionError(error.message || "Failed to update user role.");
    } finally {
      setIsUpdatingRole(false);
    }
  }

  const totalPages = pagination.totalPages || 0;

  return (
    <div className="admin-users-page">
      <div className="users-page-header">
        <div>
          <span className="users-eyebrow">ADMINISTRATION</span>
          <h1>Users Management</h1>
          <p>
            View registered users and manage account roles across RIO Cinema.
          </p>
        </div>

        <button
          type="button"
          className="users-refresh-button"
          onClick={() => {
            fetchStatistics();
            fetchUsers();
          }}
          disabled={isLoading}
        >
          <span aria-hidden="true">↻</span>
          Refresh
        </button>
      </div>

      {/* Statistics */}
      <section className="users-statistics-grid">
        <div className="users-stat-card">
          <span className="users-stat-label">Total Users</span>
          <strong>{formatNumber(statistics?.total_users)}</strong>
          <span className="users-stat-description">Registered accounts</span>
        </div>

        <div className="users-stat-card">
          <span className="users-stat-label">Customers</span>
          <strong>{formatNumber(statistics?.customers)}</strong>
          <span className="users-stat-description">Customer accounts</span>
        </div>

        <div className="users-stat-card">
          <span className="users-stat-label">Staff Members</span>
          <strong>{formatNumber(statistics?.staff)}</strong>
          <span className="users-stat-description">Staff accounts</span>
        </div>

        <div className="users-stat-card">
          <span className="users-stat-label">Administrators</span>
          <strong>{formatNumber(statistics?.admins)}</strong>
          <span className="users-stat-description">Admin accounts</span>
        </div>
      </section>

      {/* Cinema Distribution */}
      <section className="users-cinema-summary">
        <div>
          <span className="users-summary-label">Oulu Members</span>
          <strong>{formatNumber(statistics?.oulu_users)}</strong>
        </div>

        <div>
          <span className="users-summary-label">Tampere Members</span>
          <strong>{formatNumber(statistics?.tampere_users)}</strong>
        </div>
      </section>

      {/* User List */}
      <section className="users-list-section">
        <div className="users-list-heading">
          <div>
            <h2>All Users</h2>
            <p>
              {formatNumber(pagination.totalUsers)} registered accounts
            </p>
          </div>
        </div>

        <div className="users-filter-bar">
          <div className="users-search-box">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search name, email or user ID..."
              aria-label="Search users"
            />
          </div>

          <select
            value={roleFilter}
            onChange={handleRoleFilterChange}
            aria-label="Filter by role"
          >
            <option value="">All Roles</option>
            <option value="customer">Customer</option>
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>

          <select
            value={cinemaFilter}
            onChange={handleCinemaFilterChange}
            aria-label="Filter by cinema"
          >
            <option value="">All Cinemas</option>
            <option value="Oulu">Oulu</option>
            <option value="Tampere">Tampere</option>
          </select>
        </div>

        {error && (
          <div className="users-error-state">
            <p>{error}</p>
            <button type="button" onClick={fetchUsers}>
              Try Again
            </button>
          </div>
        )}

        {!error && isLoading && (
          <div className="users-loading-state">
            Loading users...
          </div>
        )}

        {!error && !isLoading && users.length === 0 && (
          <div className="users-empty-state">
            <span aria-hidden="true">◎</span>
            <h3>No users found</h3>
            <p>Try changing your search or filter criteria.</p>
          </div>
        )}

        {!error && !isLoading && users.length > 0 && (
          <>
            <div className="users-table-wrapper">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>User ID</th>
                    <th>Role</th>
                    <th>Preferred Cinema</th>
                    <th>Tickets</th>
                    <th>Joined</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="users-user-cell">
                          <div className="users-avatar">
                            {user.full_name?.charAt(0)?.toUpperCase() || "U"}
                          </div>
                          <div className="users-user-info">
                            <strong>{user.full_name}</strong>
                            <span>{user.email}</span>
                          </div>
                        </div>
                      </td>

                      <td>#{user.id}</td>

                      <td>
                        <RoleBadge role={user.role} />
                      </td>

                      <td>{user.preferred_cinema}</td>

                      <td>{formatNumber(user.paid_tickets_count)}</td>

                      <td>{formatDate(user.created_at)}</td>

                      <td>
                        <button
                          type="button"
                          className="users-view-button"
                          onClick={() => handleViewDetails(user.id)}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="users-pagination">
              <span>
                Showing{" "}
                {(currentPage - 1) * pagination.pageSize + 1}–
                {Math.min(
                  currentPage * pagination.pageSize,
                  pagination.totalUsers
                )}{" "}
                of {pagination.totalUsers}
              </span>

              <div className="users-pagination-controls">
                <button
                  type="button"
                  disabled={currentPage <= 1 || isLoading}
                  onClick={() => setCurrentPage((page) => page - 1)}
                >
                  Previous
                </button>

                <span>
                  Page {currentPage} of {Math.max(totalPages, 1)}
                </span>

                <button
                  type="button"
                  disabled={currentPage >= totalPages || isLoading}
                  onClick={() => setCurrentPage((page) => page + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {/* User Details Modal */}
      {(selectedUser || isDetailLoading || detailError) && (
        <div
          className="users-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDetails();
          }}
        >
          <div
            className="users-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="users-modal-title"
          >
            <div className="users-modal-header">
              <div>
                <span className="users-eyebrow">USER PROFILE</span>
                <h2 id="users-modal-title">User Details</h2>
              </div>

              <button
                type="button"
                className="users-modal-close"
                onClick={closeDetails}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {isDetailLoading && (
              <div className="users-loading-state">
                Loading user details...
              </div>
            )}

            {detailError && (
              <div className="users-error-state">
                <p>{detailError}</p>
              </div>
            )}

            {selectedUser && (
              <>
                <div className="users-profile-heading">
                  <div className="users-profile-avatar">
                    {selectedUser.full_name?.charAt(0)?.toUpperCase() || "U"}
                  </div>

                  <div>
                    <h3>{selectedUser.full_name}</h3>
                    <p>{selectedUser.email}</p>
                    <RoleBadge role={selectedUser.role} />
                  </div>
                </div>

                <div className="users-detail-grid">
                  <div>
                    <span>User ID</span>
                    <strong>#{selectedUser.id}</strong>
                  </div>

                  <div>
                    <span>Preferred Cinema</span>
                    <strong>{selectedUser.preferred_cinema}</strong>
                  </div>

                  <div>
                    <span>Paid Tickets</span>
                    <strong>
                      {formatNumber(selectedUser.paid_tickets_count)}
                    </strong>
                  </div>

                  <div>
                    <span>Registration Date</span>
                    <strong>{formatDate(selectedUser.created_at)}</strong>
                  </div>
                </div>

                <div className="users-role-management">
                  <h3>Account Role</h3>

                  {editingUserId === selectedUser.id ? (
                    <div className="users-role-editor">
                      <select
                        value={newRole}
                        onChange={(event) => setNewRole(event.target.value)}
                      >
                        <option value="customer">Customer</option>
                        <option value="staff">Staff</option>
                        <option value="admin">Admin</option>
                      </select>

                      <button
                        type="button"
                        className="users-save-role-button"
                        disabled={isUpdatingRole || newRole === selectedUser.role}
                        onClick={() => handleUpdateRole(selectedUser.id)}
                      >
                        {isUpdatingRole ? "Saving..." : "Save Role"}
                      </button>

                      <button
                        type="button"
                        className="users-cancel-edit-button"
                        disabled={isUpdatingRole}
                        onClick={() => setEditingUserId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="users-edit-role-button"
                      onClick={() => startEditingRole(selectedUser)}
                    >
                      Change User Role
                    </button>
                  )}

                  {actionError && (
                    <p className="users-action-error">{actionError}</p>
                  )}

                  {actionSuccess && (
                    <p className="users-action-success">{actionSuccess}</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default UsersPage;
