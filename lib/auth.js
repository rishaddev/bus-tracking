// /lib/auth.js
export function authenticate(token) {
  if (!token) {
    return { error: 'Authorization token required' };
  }
  
  // Simple token check
  const user = { 
    id: token,
    role: token.startsWith('op_') ? 'operator' : 
          token.startsWith('admin_') ? 'admin' : 'commuter'
  };
  
  return { user };
}

export function requireRole(user, role) {
  if (user.role !== role) {
    return { error: `Insufficient permissions. Required role: ${role}` };
  }
  return { success: true };
}