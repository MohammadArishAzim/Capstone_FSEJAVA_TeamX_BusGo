/** "21:00:00" -> "21:00" */
export const formatTime = (time: string): string => time.slice(0, 5);

export const formatFare = (amount: number): string => `₹${amount}`;
