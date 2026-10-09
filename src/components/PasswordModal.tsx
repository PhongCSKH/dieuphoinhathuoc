import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faXmark, faKey } from '@fortawesome/free-solid-svg-icons';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PasswordModal: React.FC<PasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'PhongCSKH@') {
      onSuccess();
    } else {
      setError(true);
      setPassword('');
      inputRef.current?.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
        >
          <FontAwesomeIcon icon={faXmark} className="text-sm" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center text-xl mb-3 shadow-lg shadow-sky-500/10">
            <FontAwesomeIcon icon={faLock} />
          </div>

          <h3 className="text-base font-bold text-white tracking-tight">
            Xác Thực Quản Trị Viên
          </h3>
          <p className="text-xs text-slate-400 mt-1 mb-5">
            Vui lòng nhập mật khẩu để truy cập bảng cấu hình hệ thống
          </p>

          <form onSubmit={handleSubmit} className="w-full space-y-3">
            <div className="relative">
              <input
                ref={inputRef}
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(false);
                }}
                placeholder="Nhập mật khẩu..."
                className={`w-full bg-slate-950 border rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition text-center font-mono ${
                  error
                    ? 'border-rose-500 ring-2 ring-rose-500/30'
                    : 'border-slate-700 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20'
                }`}
              />
            </div>

            {error && (
              <p className="text-xs font-semibold text-rose-400 animate-shake">
                Mật khẩu không chính xác!
              </p>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-1/2 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition border border-slate-700"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="w-1/2 px-4 py-2 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-xl shadow-sm transition flex items-center justify-center gap-1.5"
              >
                <FontAwesomeIcon icon={faKey} className="text-xs" />
                <span>Xác nhận</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
