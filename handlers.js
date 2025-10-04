export const formatDateIST = () => {
  try {
    const date = new Date();
    const istDate = new Date(date.toLocaleString('en-US', { 
      timeZone: 'Asia/Kolkata'
    }));
    
    const year = istDate.getFullYear();
    const month = String(istDate.getMonth() + 1); // Removed padStart to match format
    const day = String(istDate.getDate()); // Removed padStart to match format
    
    // Get time components
    const hours = istDate.getHours();
    const minutes = String(istDate.getMinutes()).padStart(2, '0');
    const seconds = String(istDate.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    // Convert hours to 12-hour format
    const formattedHours = hours % 12 || 12;

    // Format the final string
    const formattedDate = `${year}-${month}-${day}, ${formattedHours}:${minutes}:${seconds} ${ampm}`;
    
    return formattedDate;
  } catch (error) {
    console.error('Error formatting date:', error);
    return null;
  }
};