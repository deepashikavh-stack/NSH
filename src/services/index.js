/**
 * Services — Barrel export for all domain services.
 * 
 * Import from this module for clean access:
 *   import { VisitorService, MeetingService } from './services';
 */

// Core
export { BaseService } from './BaseService';

// Domain Services
export { VisitorService } from './VisitorService';
export { MeetingService } from './MeetingService';
export { VehicleService } from './VehicleService';
export { AlertService } from './AlertService';
export { AuthService } from './AuthService';

// Notification System
export { NotificationService } from './notifications/NotificationService';
export {
    NotificationStrategy,
    TelegramNotification,
    SMSNotification,
    CalendarNotification,
} from './notifications/NotificationStrategy';
