const normalizeValue = (value) => (value || "").trim().toLowerCase();

const normalizeRole = (role) => {
  if (!role) return "";
  if (/^admin$/i.test(role)) return "Admin";
  if (/^user$/i.test(role)) return "User";
  return role.trim();
};

export function authenticateUser(users, username, email, role, password) {
  const normalizedUsername = normalizeValue(username);
  const normalizedEmail = normalizeValue(email);
  const normalizedRole = normalizeRole(role);

  return users.find(
    (user) =>
      normalizeRole(user.role) === normalizedRole &&
      normalizeValue(user.username) === normalizedUsername &&
      normalizeValue(user.email) === normalizedEmail &&
      user.password === password,
  );
}

export function isUsernameTaken(users, username, ignoreUsername) {
  const normalizedUsername = normalizeValue(username);
  const normalizedIgnore = normalizeValue(ignoreUsername);

  return users.some(
    (user) =>
      normalizeValue(user.username) === normalizedUsername &&
      normalizeValue(user.username) !== normalizedIgnore,
  );
}

export function isEmailTaken(users, email, ignoreEmail) {
  const normalizedEmail = normalizeValue(email);
  const normalizedIgnore = normalizeValue(ignoreEmail);

  return users.some(
    (user) =>
      normalizeValue(user.email) === normalizedEmail &&
      normalizeValue(user.email) !== normalizedIgnore,
  );
}

export function findStaffUser(users, { username, email, role }) {
  const normalizedUsername = normalizeValue(username);
  const normalizedEmail = normalizeValue(email);
  const normalizedRole = normalizeRole(role);

  return users.find((user) => {
    if (role && normalizeRole(user.role) !== normalizedRole) return false;
    if (username && normalizeValue(user.username) !== normalizedUsername)
      return false;
    if (email && normalizeValue(user.email) !== normalizedEmail) return false;
    return true;
  });
}

export function addStaffUser(users, newUser) {
  return [...users, newUser];
}

export function updateStaffUser(users, username, updates) {
  const normalizedUsername = normalizeValue(username);

  return users.map((user) =>
    normalizeValue(user.username) === normalizedUsername
      ? { ...user, ...updates }
      : user,
  );
}

export function promoteStaffUser(users, username) {
  return updateStaffUser(users, username, { role: "Admin" });
}

export function demoteStaffUser(users, username) {
  return updateStaffUser(users, username, { role: "User" });
}

export function loadStaffUsers() {
  try {
    const raw = window.localStorage.getItem("ngo-staff-users");
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error("Failed to load staff users", error);
    return [];
  }
}

export function saveStaffUsers(users) {
  try {
    window.localStorage.setItem("ngo-staff-users", JSON.stringify(users));
  } catch (error) {
    console.error("Failed to save staff users", error);
  }
}
