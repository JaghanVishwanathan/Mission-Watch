import { LaunchStatus } from '../models';

export type StatusTone = 'good' | 'warning' | 'serious' | 'critical' | 'info' | 'neutral';

export interface StatusInfo {
  label: string;
  description: string;
  tone: StatusTone;
  icon: string;
}

export const STATUS_INFO: Record<LaunchStatus, StatusInfo> = {
  go: {
    label: 'Go',
    description: 'Launch is confirmed for the stated time.',
    tone: 'good',
    icon: 'check-circle',
  },
  tbc: {
    label: 'To be confirmed',
    description: 'Date is likely but awaits confirmation.',
    tone: 'info',
    icon: 'clock',
  },
  tbd: {
    label: 'To be determined',
    description: 'Date is not yet firm.',
    tone: 'neutral',
    icon: 'help',
  },
  hold: {
    label: 'On hold',
    description: 'Countdown or schedule is currently paused.',
    tone: 'warning',
    icon: 'pause',
  },
  'in-flight': {
    label: 'In flight',
    description: 'Vehicle has lifted off.',
    tone: 'info',
    icon: 'rocket',
  },
  deployed: {
    label: 'Payload deployed',
    description: 'Payload has separated; the final outcome has not been recorded yet.',
    tone: 'info',
    icon: 'orbit',
  },
  success: {
    label: 'Success',
    description: 'Payload reached its intended orbit.',
    tone: 'good',
    icon: 'check-circle',
  },
  'partial-failure': {
    label: 'Partial failure',
    description: 'Launch occurred but did not fully meet its objective.',
    tone: 'serious',
    icon: 'alert',
  },
  failure: {
    label: 'Failure',
    description: 'Launch did not reach its intended orbit.',
    tone: 'critical',
    icon: 'x-circle',
  },
};
