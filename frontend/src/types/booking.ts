export interface Service {
  _id: string;
  name: string;
  slug: string;
  description: string;
  type: 'therapy' | 'podcast';
  price: number;
  duration: number;
  image: string;
  availableSlots: TimeSlot[];
}

export interface TimeSlot {
  date: string;
  time: string;
  available: boolean;
}

export interface Booking {
  _id: string;
  service: Service;
  userId: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  total: number;
  createdAt: Date;
}
