/**
 * components/AuthModals.tsx
 * Modal đăng nhập và đăng ký — kết nối API thật
 */
import React, { useState } from "react";
import { LogIn, UserPlus, Eye, EyeOff, Phone, Lock } from "lucide-react";
import { useApp, RegisterForm } from "../context/AppContext";
import { Modal, FormInput, FormSelect, Btn } from "./ui";

// ─── Login Modal ─────────────────────────────────────────────────────────────
export function LoginModal() {
  const { setShowLoginModal, setShowRegisterModal, login } = useApp();
  const [input, setInput] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [rejectedMsg, setRejectedMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setRejectedMsg("");
    if (!input.trim() || !pass) {
      setError("Vui lòng nhập số điện thoại/email và mật khẩu.");
      return;
    }
    setSubmitting(true);
    const err = await login(input.trim(), pass);
    setSubmitting(false);
    if (!err) { setShowLoginModal(false); return; }
    if (err.startsWith("__REJECTED__")) {
      setRejectedMsg(err.replace("__REJECTED__", ""));
    } else {
      setError(err);
    }
  };

  // Popup từ chối
  if (rejectedMsg) {
    return (
      <Modal onClose={() => setShowLoginModal(false)} title="Yêu cầu đăng ký bị từ chối">
        <div className="p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✗</span>
          </div>
          <h3 className="font-serif font-bold text-slate-800 text-lg mb-2">Từ chối yêu cầu đăng ký</h3>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-left mb-5">
            <p className="text-xs font-bold text-red-700 mb-1">Lý do từ chối:</p>
            <p className="text-sm text-red-800 leading-relaxed">{rejectedMsg}</p>
          </div>
          <p className="text-xs text-slate-500 mb-5">
            Vui lòng liên hệ Trưởng họ để biết thêm chi tiết hoặc đăng ký lại với thông tin chính xác.
          </p>
          <Btn variant="primary" onClick={() => setShowLoginModal(false)} className="w-full justify-center">
            Đóng
          </Btn>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={() => setShowLoginModal(false)} title="Đăng nhập tài khoản">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="text-center mb-2">
          <div className="w-14 h-14 rounded-full bg-[#8c4f2b]/10 flex items-center justify-center mx-auto mb-3">
            <LogIn className="w-7 h-7 text-[#8c4f2b]" />
          </div>
          <p className="text-sm text-stone-500">Sử dụng số điện thoại hoặc email đã đăng ký</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-600 mb-1">Số điện thoại / Email <span className="text-red-500">*</span></label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              value={input} onChange={e => setInput(e.target.value)}
              placeholder="0901234567 hoặc email@gmail.com"
              className="w-full border border-stone-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8c4f2b]/30 focus:border-[#8c4f2b]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-600 mb-1">Mật khẩu <span className="text-red-500">*</span></label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type={showPass ? "text" : "password"}
              value={pass} onChange={e => setPass(e.target.value)}
              placeholder="Nhập mật khẩu"
              className="w-full border border-stone-200 rounded-lg pl-9 pr-9 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8c4f2b]/30 focus:border-[#8c4f2b]"
            />
            <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
              {showPass ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2">{error}</div>
        )}

        <Btn type="submit" variant="primary" className="w-full justify-center" disabled={submitting}>
          <LogIn className="w-4 h-4" /> {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
        </Btn>

        <div className="text-center text-xs text-stone-400 pt-2 border-t border-stone-100">
          Chưa có tài khoản?{" "}
          <button type="button" onClick={() => { setShowLoginModal(false); setShowRegisterModal(true); }}
            className="text-[#8c4f2b] font-semibold hover:underline">
            Đăng ký mới
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Register Modal ──────────────────────────────────────────────────────────
export function RegisterModal() {
  const { register, setShowRegisterModal, setShowLoginModal } = useApp();
  const [form, setForm] = useState<RegisterForm>({
    fullName: "", birthDate: "", gender: "MALE", phone: "", email: "",
    hometown: "", address: "", password: "", confirmPassword: "",
    inviteCode: "", notes: ""
  });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof RegisterForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.fullName || !form.phone || !form.email || !form.password || !form.inviteCode) {
      setError("Vui lòng điền đầy đủ các trường bắt buộc (*).");
      return;
    }
    if (form.password.length < 8 || !/[a-zA-Z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      setError("Mật khẩu phải tối thiểu 8 ký tự, gồm cả chữ và số.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setSubmitting(true);
    const result = await register(form);
    setSubmitting(false);

    if (result?.ok === false) {
      setError(result.message || "Đăng ký thất bại.");
      return;
    }
    setSuccess(true);
  };

  if (success) {
    return (
      <Modal onClose={() => setShowRegisterModal(false)} title="Đăng ký thành công">
        <div className="p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="font-serif font-bold text-stone-800 text-lg mb-2">Nộp đơn thành công!</h3>
          <p className="text-stone-500 text-sm leading-relaxed mb-6">
            Hồ sơ của bạn đã được ghi nhận. Vui lòng chờ Trưởng họ phê duyệt. Bạn sẽ đăng nhập được sau khi được kích hoạt.
          </p>
          <Btn variant="primary" onClick={() => { setShowRegisterModal(false); setShowLoginModal(true); }} className="w-full justify-center">
            Về Đăng nhập
          </Btn>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={() => setShowRegisterModal(false)} title="Đăng ký tham gia dòng họ">
      <form onSubmit={handleSubmit} className="p-6 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <FormInput label="Họ và tên đầy đủ" required value={form.fullName} onChange={e => set("fullName", e.target.value)} placeholder="Nguyễn Bá ..." />
          </div>
          <FormInput label="Ngày sinh" type="date" value={form.birthDate} onChange={e => set("birthDate", e.target.value)} />
          <FormSelect label="Giới tính" value={form.gender} onChange={e => set("gender", e.target.value)}>
            <option value="MALE">Nam</option>
            <option value="FEMALE">Nữ</option>
          </FormSelect>
          <FormInput label="Số điện thoại" required type="tel" value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="09xxxxxxxx" />
          <FormInput label="Email" required type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="email@gmail.com" />
          <FormInput label="Mật khẩu" required type="password" value={form.password} onChange={e => set("password", e.target.value)} placeholder="≥8 ký tự, có chữ+số" />
          <FormInput label="Xác nhận mật khẩu" required type="password" value={form.confirmPassword} onChange={e => set("confirmPassword", e.target.value)} placeholder="Nhập lại mật khẩu" />
          <div className="col-span-2">
            <FormInput label="Quê quán" value={form.hometown} onChange={e => set("hometown", e.target.value)} placeholder="Tỉnh / Huyện / Xã" />
          </div>
          <div className="col-span-2">
            <FormInput label="Địa chỉ hiện tại" value={form.address} onChange={e => set("address", e.target.value)} placeholder="Địa chỉ cư trú hiện nay" />
          </div>
          <div className="col-span-2">
            <FormInput label="Mã mời" required value={form.inviteCode} onChange={e => set("inviteCode", e.target.value)} placeholder="Liên hệ Trưởng họ để lấy mã" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-stone-600 mb-1">Ghi chú / Tự giới thiệu</label>
            <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
              placeholder="Con cháu chi nào, thuộc đời thứ mấy..."
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8c4f2b]/30 focus:border-[#8c4f2b] h-20 resize-none" />
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2">{error}</div>}

        <Btn type="submit" variant="primary" className="w-full justify-center mt-2" disabled={submitting}>
          <UserPlus className="w-4 h-4" /> {submitting ? "Đang gửi..." : "Nộp đơn đăng ký"}
        </Btn>

        <p className="text-center text-xs text-stone-400">
          Đã có tài khoản?{" "}
          <button type="button" onClick={() => { setShowRegisterModal(false); setShowLoginModal(true); }}
            className="text-[#8c4f2b] font-semibold hover:underline">
            Đăng nhập
          </button>
        </p>
      </form>
    </Modal>
  );
}