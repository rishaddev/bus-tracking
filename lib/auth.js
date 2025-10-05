// /lib/auth.js
export function authenticate(token) {
  if (!token) {
    return { error: "Authorization token required" };
  }

  // Simple token check
  const user = {
    id: token,
    role: token.startsWith("op_")
      ? "operator"
      : token.startsWith("admin_")
      ? "admin"
      : "commuter",
  };

  return { user };
}

export function requireRole(user, roles) {
  // Convert single role to array for backward compatibility
  const roleArray = Array.isArray(roles) ? roles : [roles];

  if (!roleArray.includes(user.role)) {
    return {
      error: `Insufficient permissions. Required one of: ${roleArray.join(
        ", "
      )}`,
    };
  }
  return { success: true };
}
