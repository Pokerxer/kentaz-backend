import { authApiClient } from './client';

export interface Booking {
  _id: string;
  user?: string;
  serviceType: 'therapy' | 'podcast';
  therapistId?: { _id: string; name: string; avatar?: string };
  date: string;
  timeSlot: string;
  duration: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paystackRef?: string;
  amount: number;
  notes?: string;
  createdAt: string;
}

export interface CreateBookingRequest {
  serviceType: 'therapy' | 'podcast';
  therapistId?: string;
  date: string;
  timeSlot: string;
  duration?: number;
  amount: number;
  notes?: string;
}

export async function createBooking(data: CreateBookingRequest): Promise<Booking> {
  return authApiClient<Booking>('/api/store/bookings', {
    method: 'POST',
    body: data,
  });
}

export async function getBookings(): Promise<Booking[]> {
  return authApiClient<Booking[]>('/api/store/bookings');
}

export async function getBooking(id: string): Promise<Booking> {
  return authApiClient<Booking>(`/api/store/bookings/${id}`);
}
