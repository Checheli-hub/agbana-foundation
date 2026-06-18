import {
  addStaffUser,
  authenticateUser,
  demoteStaffUser,
  findStaffUser,
  isEmailTaken,
  isUsernameTaken,
  loadStaffUsers,
  promoteStaffUser,
  saveStaffUsers,
  updateStaffUser,
} from "./userService.js";
import {
  handleFetchResponse,
  parseErrorMessage,
  logError,
} from "../utils/errorHandler.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const hasBackend = () => Boolean(API_BASE_URL);

async function requestBackend(path, options) {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      ...options,
    });

    return await handleFetchResponse(response);
  } catch (error) {
    logError(error, `Auth Request: ${path}`);
    const message = parseErrorMessage(error);
    const err = new Error(message);
    err.originalError = error;
    throw err;
  }
}

export async function signIn({ username, email, password, role }) {
  if (hasBackend()) {
    return requestBackend("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, email, password, role }),
    });
  }

  const users = loadStaffUsers();
  const matchedUser = authenticateUser(users, username, email, role, password);
  if (!matchedUser) {
    throw new Error("Invalid credentials. Please try again.");
  }

  return {
    username: matchedUser.username,
    role: matchedUser.role,
  };
}

export async function registerUser({ username, email, password }) {
  if (hasBackend()) {
    return requestBackend("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        username,
        email,
        password,
        role: "User",
      }),
    });
  }

  const users = loadStaffUsers();

  if (isEmailTaken(users, email)) {
    throw new Error("This email is already in use. Use a different email.");
  }

  if (isUsernameTaken(users, username)) {
    throw new Error("This username is already registered. Choose another one.");
  }

  const newUser = {
    username,
    email,
    password,
    role: "User",
  };

  const updatedUsers = addStaffUser(users, newUser);
  saveStaffUsers(updatedUsers);

  return {
    user: newUser,
    users: updatedUsers,
  };
}

export async function getUsers() {
  if (hasBackend()) {
    return requestBackend("/auth/users", {
      method: "GET",
    });
  }

  return { users: loadStaffUsers() };
}

export async function createAdmin({ username, email, password, requestedBy }) {
  if (hasBackend()) {
    return requestBackend("/auth/admin", {
      method: "POST",
      body: JSON.stringify({ username, email, password, requestedBy }),
    });
  }

  const users = loadStaffUsers();

  if (isEmailTaken(users, email)) {
    throw new Error("This email is already in use. Use a different email.");
  }

  if (isUsernameTaken(users, username)) {
    throw new Error("This username is already registered. Choose another one.");
  }

  const newAdmin = {
    username,
    email,
    password,
    role: "Admin",
    isVerified: true,
    isApproved: true,
  };

  const updatedUsers = addStaffUser(users, newAdmin);
  saveStaffUsers(updatedUsers);

  return {
    user: newAdmin,
    users: updatedUsers,
  };
}

export async function approveUser(username, requestedBy) {
  if (hasBackend()) {
    return requestBackend("/auth/approve", {
      method: "POST",
      body: JSON.stringify({ username, requestedBy }),
    });
  }

  const users = loadStaffUsers();
  const updated = users.map((u) =>
    u.username.toLowerCase() === username.toLowerCase()
      ? { ...u, isApproved: true }
      : u,
  );
  saveStaffUsers(updated);
  return { users: updated };
}

export async function disapproveUser(username, requestedBy) {
  if (hasBackend()) {
    return requestBackend("/auth/disapprove", {
      method: "POST",
      body: JSON.stringify({ username, requestedBy }),
    });
  }

  throw new Error("Disapprove requires backend support.");
}

export async function deleteUser(username, requestedBy) {
  if (hasBackend()) {
    return requestBackend("/auth/delete", {
      method: "POST",
      body: JSON.stringify({ username, requestedBy }),
    });
  }

  throw new Error("Delete requires backend support.");
}

export async function restoreUser(username, requestedBy) {
  if (hasBackend()) {
    return requestBackend("/auth/restore", {
      method: "POST",
      body: JSON.stringify({ username, requestedBy }),
    });
  }

  throw new Error("Restore requires backend support.");
}

export async function resetPassword({ username, email, role, newPassword }) {
  if (hasBackend()) {
    return requestBackend("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ username, email, role, newPassword }),
    });
  }

  const users = loadStaffUsers();
  const criteria = { email, role };
  if (username) {
    criteria.username = username;
  }

  const matchedUser = findStaffUser(users, criteria);
  if (!matchedUser) {
    throw new Error(
      "No matching account found. Check your username, role, and email.",
    );
  }

  const updatedUsers = updateStaffUser(users, matchedUser.username, {
    password: newPassword,
  });
  saveStaffUsers(updatedUsers);

  return {
    users: updatedUsers,
  };
}

export async function requestPasswordReset({ username, email, role }) {
  if (hasBackend()) {
    return requestBackend("/auth/request-password-reset", {
      method: "POST",
      body: JSON.stringify({ username, email, role }),
    });
  }

  throw new Error("Password reset requests require backend support.");
}

export async function completePasswordReset({ token, newPassword }) {
  if (hasBackend()) {
    return requestBackend("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
    });
  }

  throw new Error("Password reset completion requires backend support.");
}

export async function signOut() {
  if (hasBackend()) {
    await requestBackend("/auth/logout", {
      method: "POST",
    });
  }
}

export async function promoteUser(username, requestedBy) {
  if (hasBackend()) {
    return requestBackend("/auth/promote", {
      method: "POST",
      body: JSON.stringify({ username, requestedBy }),
    });
  }

  const users = loadStaffUsers();
  const updatedUsers = promoteStaffUser(users, username);
  saveStaffUsers(updatedUsers);
  return { users: updatedUsers };
}

export async function demoteUser(username, requestedBy) {
  if (hasBackend()) {
    return requestBackend("/auth/demote", {
      method: "POST",
      body: JSON.stringify({ username, requestedBy }),
    });
  }

  const users = loadStaffUsers();
  const updatedUsers = demoteStaffUser(users, username);
  saveStaffUsers(updatedUsers);
  return { users: updatedUsers };
}

export async function updateUserAccount(username, updates) {
  if (hasBackend()) {
    return requestBackend("/auth/update", {
      method: "POST",
      body: JSON.stringify({ username, updates }),
    });
  }

  const users = loadStaffUsers();
  const updatedUsers = updateStaffUser(users, username, updates);
  saveStaffUsers(updatedUsers);
  return { users: updatedUsers };
}

export async function getUsers() {
  if (hasBackend()) {
    return requestBackend("/auth/users", {
      method: "GET",
    });
  }

  return { users: loadStaffUsers() };
}

export async function createAdmin({ username, email, password, requestedBy }) {
  if (hasBackend()) {
    return requestBackend("/auth/admin", {
      method: "POST",
      body: JSON.stringify({ username, email, password, requestedBy }),
    });
  }

  const users = loadStaffUsers();

  if (isEmailTaken(users, email)) {
    throw new Error("This email is already in use. Use a different email.");
  }

  if (isUsernameTaken(users, username)) {
    throw new Error("This username is already registered. Choose another one.");
  }

  const newAdmin = {
    username,
    email,
    password,
    role: "Admin",
    isVerified: true,
    isApproved: true,
  };

  const updatedUsers = addStaffUser(users, newAdmin);
  saveStaffUsers(updatedUsers);

  return {
    user: newAdmin,
    users: updatedUsers,
  };
}

export async function approveUser(username, requestedBy) {
  if (hasBackend()) {
    return requestBackend("/auth/approve", {
      method: "POST",
      body: JSON.stringify({ username, requestedBy }),
    });
  }

  const users = loadStaffUsers();
  const updated = users.map((u) =>
    u.username.toLowerCase() === username.toLowerCase()
      ? { ...u, isApproved: true }
      : u,
  );
  saveStaffUsers(updated);
  return { users: updated };
}

export async function disapproveUser(username, requestedBy) {
  if (hasBackend()) {
    return requestBackend("/auth/disapprove", {
      method: "POST",
      body: JSON.stringify({ username, requestedBy }),
    });
  }

  throw new Error("Disapprove requires backend support.");
}

export async function deleteUser(username, requestedBy) {
  if (hasBackend()) {
    return requestBackend("/auth/delete", {
      method: "POST",
      body: JSON.stringify({ username, requestedBy }),
    });
  }

  throw new Error("Delete requires backend support.");
}

export async function restoreUser(username, requestedBy) {
  if (hasBackend()) {
    return requestBackend("/auth/restore", {
      method: "POST",
      body: JSON.stringify({ username, requestedBy }),
    });
  }

  throw new Error("Restore requires backend support.");
}

export async function resetPassword({ username, email, role, newPassword }) {
  if (hasBackend()) {
    return requestBackend("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ username, email, role, newPassword }),
    });
  }

  const users = loadStaffUsers();
  const criteria = { email, role };
  if (username) {
    criteria.username = username;
  }

  const matchedUser = findStaffUser(users, criteria);
  if (!matchedUser) {
    throw new Error(
      "No matching account found. Check your username, role, and email.",
    );
  }

  const updatedUsers = updateStaffUser(users, matchedUser.username, {
    password: newPassword,
  });
  saveStaffUsers(updatedUsers);

  return {
    users: updatedUsers,
  };
}

export async function requestPasswordReset({ username, email, role }) {
  if (hasBackend()) {
    return requestBackend("/auth/request-password-reset", {
      method: "POST",
      body: JSON.stringify({ username, email, role }),
    });
  }

  throw new Error("Password reset requests require backend support.");
}

export async function completePasswordReset({ token, newPassword }) {
  if (hasBackend()) {
    return requestBackend("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
    });
  }

  throw new Error("Password reset completion requires backend support.");
}

export async function signOut() {
  if (hasBackend()) {
    await requestBackend("/auth/logout", {
      method: "POST",
    });
  }
}

export async function promoteUser(username, requestedBy) {
  if (hasBackend()) {
    return requestBackend("/auth/promote", {
      method: "POST",
      body: JSON.stringify({ username, requestedBy }),
    });
  }

  const users = loadStaffUsers();
  const updatedUsers = promoteStaffUser(users, username);
  saveStaffUsers(updatedUsers);
  return { users: updatedUsers };
}

export async function demoteUser(username, requestedBy) {
  if (hasBackend()) {
    return requestBackend("/auth/demote", {
      method: "POST",
      body: JSON.stringify({ username, requestedBy }),
    });
  }

  const users = loadStaffUsers();
  const updatedUsers = demoteStaffUser(users, username);
  saveStaffUsers(updatedUsers);
  return { users: updatedUsers };
}

export async function updateUserAccount(username, updates) {
  if (hasBackend()) {
    return requestBackend("/auth/update", {
      method: "POST",
      body: JSON.stringify({ username, updates }),
    });
  }

  const users = loadStaffUsers();
  const updatedUsers = updateStaffUser(users, username, updates);
  saveStaffUsers(updatedUsers);
  return { users: updatedUsers };
}
