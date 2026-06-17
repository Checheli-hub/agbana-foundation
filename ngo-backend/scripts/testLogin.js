import fetch from "node-fetch";

const url = process.env.AUTH_URL || "http://localhost:5000/auth/login";

const [username, email, password, role] = process.argv.slice(2);
if (!username || !email || !password || !role) {
  console.error(
    "Usage: node scripts/testLogin.js <username> <email> <password> <role>",
  );
  process.exit(1);
}

(async () => {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password, role }),
    });
    const data = await res.json();
    console.log("Status:", res.status);
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Request failed:", e.message || e);
    process.exit(1);
  }
})();
