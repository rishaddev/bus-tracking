// /lib/utils.js
export function getISTTimestamp() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset);
  
  return {
    date: istDate.toISOString().split('T')[0],
    time: istDate.toISOString().split('T')[1].split('.')[0],
    timestamp: istDate
  };
}

export function validateRequiredFields(data, requiredFields) {
  const missing = requiredFields.filter(field => !data[field]);
  if (missing.length > 0) {
    return { error: `Missing required fields: ${missing.join(', ')}` };
  }
  return { success: true };
}