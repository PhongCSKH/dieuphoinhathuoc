import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faScaleBalanced, 
  faCircleExclamation, 
  faCheckCircle, 
  faXmark,
  faBullhorn
} from '@fortawesome/free-solid-svg-icons';
import { DispatchAlert } from '../types';

interface AlertBannerProps {
  alerts: DispatchAlert[];
  onDismiss: (id: string) => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({ alerts, onDismiss }) => {
  if (alerts.length === 0) return null;

  return (
    <div className="flex-shrink-0 bg-slate-950/95 border-b border-rose-500/30 px-4 py-2 flex flex-col gap-1.5 z-20 backdrop-blur-md animate-in slide-in-from-top-2 duration-300">
      {alerts.slice(0, 2).map((alert) => {
        const isDanger = alert.severity === 'danger';
        const isImbalance = alert.type === 'imbalance';
        const isNewCounter = alert.type === 'new_counter';

        return (
          <div
            key={alert.id}
            className={`flex items-center justify-between px-3.5 py-1.5 rounded-lg border text-xs transition ${
              isDanger
                ? 'bg-rose-500/10 border-rose-500/40 text-rose-200'
                : isImbalance
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                : isNewCounter
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200'
                : 'bg-sky-500/10 border-sky-500/40 text-sky-200'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-md bg-white/10">
                <FontAwesomeIcon
                  icon={
                    isDanger
                      ? faCircleExclamation
                      : isImbalance
                      ? faScaleBalanced
                      : isNewCounter
                      ? faCheckCircle
                      : faBullhorn
                  }
                  className={`text-xs ${
                    isDanger ? 'text-rose-400 animate-pulse' : isImbalance ? 'text-amber-400' : 'text-emerald-400'
                  }`}
                />
              </span>

              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                <span className="font-bold tracking-tight text-white">
                  {alert.message}
                </span>
                {alert.recommendation && (
                  <span className="text-slate-300 opacity-90 hidden sm:inline">
                    — {alert.recommendation}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => onDismiss(alert.id)}
              className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded transition ml-2 flex-shrink-0"
              title="Đóng thông báo"
            >
              <FontAwesomeIcon icon={faXmark} className="text-xs" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
